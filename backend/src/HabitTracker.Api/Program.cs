using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Endpoints;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ----- 1. Services: things the app can use (registered in the DI container) -----
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// The connection string comes from configuration: user secrets locally,
// an environment variable (ConnectionStrings__Default) in production. Never from git.
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "Missing connection string 'Default'. Set it with: dotnet user-secrets set \"ConnectionStrings:Default\" \"...\"");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

// Errors come back as ProblemDetails JSON (a standard shape: type, title, status, detail).
builder.Services.AddProblemDetails();

// Send enums as readable strings ("Owner") instead of numbers (0), in both directions.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// Checks the [Required], [EmailAddress], ... attributes on request DTOs. Invalid → 400.
builder.Services.AddValidation();

// --- Authentication: "who are you?" We read and verify a JWT from the Authorization header. ---
// Same rule as the connection string: the signing key comes from user secrets / Azure, never git.
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Missing 'Jwt' configuration section.");
if (string.IsNullOrWhiteSpace(jwtOptions.Key) || jwtOptions.Key.Length < 32)
{
    // HMAC-SHA256 needs a key of at least 256 bits; a short key is easy to brute-force.
    throw new InvalidOperationException(
        "Missing or too short 'Jwt:Key' (min 32 chars). Set it with: dotnet user-secrets set \"Jwt:Key\" \"<long random string>\"");
}

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep claim names as they are in the token ("sub", "email"),
        // instead of renaming them to long Microsoft URIs.
        options.MapInboundClaims = false;

        // Every request with a token is checked against these rules. Fail any → 401.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtOptions.GetSigningKey(),
            ValidateLifetime = true,
            // The default allows tokens 5 minutes past expiry; we only allow a little clock drift.
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtRegisteredClaimNames.Name,
        };
    });

// --- Authorization: "are you allowed to do this?" Policies are added in later blocks. ---
builder.Services.AddAuthorization();

// --- Rate limiting: slow down password guessing on /login. ---
builder.Services.AddRateLimiter(options =>
{
    // 429 Too Many Requests instead of the default 503.
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Each IP address gets 5 login attempts per minute; the 6th is rejected until the window resets.
    options.AddPolicy(AuthEndpoints.LoginRateLimitPolicy, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // Each IP address can create 10 accounts per hour, so a script can't flood the Users table.
    options.AddPolicy(AuthEndpoints.RegisterRateLimitPolicy, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0,
            }));
});

var app = builder.Build();

// ----- 2. Middleware pipeline: every request passes through these, in order -----
if (app.Environment.IsDevelopment())
{
    // The API description at /openapi/v1.json, only in Development.
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Unhandled exceptions and empty error responses (like a bare 401) become ProblemDetails.
// BadHttpRequestException means the client sent something unreadable (e.g. "/checkins/yesterday"
// instead of a date, or broken JSON): that's the client's mistake, so keep its 400 instead of a 500.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = exception => exception is BadHttpRequestException badRequest
        ? badRequest.StatusCode
        : StatusCodes.Status500InternalServerError,
});
app.UseStatusCodePages();

// Order matters: first find out who the caller is, then check what they may do.
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// ----- 3. Endpoints: all our routes live under /api -----
var api = app.MapGroup("/api");
api.MapHealthEndpoints();
api.MapAuthEndpoints();
api.MapHabitEndpoints();
api.MapCheckInEndpoints();

app.Run();
