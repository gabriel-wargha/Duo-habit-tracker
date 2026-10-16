using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Endpoints;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.StaticFiles;
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

// --- CORS: which *other* websites may call this API from a browser (deploy). ---
// Locally the browser only talks to Vite (same origin), so this list is empty and nothing changes.
// Online, the frontend (https://….azurestaticapps.net) and the API (https://….azurewebsites.net)
// are different origins, and the browser blocks the call unless the API says that origin is allowed.
// Set it in Azure as the app setting Cors__AllowedOrigins (several origins: separate with commas).
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    // Any header (we send Authorization and Content-Type) and any method (GET, POST, PUT, DELETE).
    // No AllowCredentials: we send the JWT in a header, not in a cookie.
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// --- Forwarded headers: the real visitor behind Azure's proxy (deploy). ---
// On Azure, requests reach us through Azure's front-end proxy, so the connection's IP is the proxy's.
// The proxy puts the visitor's real IP in X-Forwarded-For (and "https" in X-Forwarded-Proto).
// Without reading them, every visitor would share ONE login rate limit: 5 attempts per minute for everyone.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Azure's proxy has no fixed address we could list, so we accept forwarded headers from any proxy.
    // That's safe here because ForwardLimit stays 1: only the LAST entry is used, the one Azure's proxy
    // appended. A visitor who sends a fake X-Forwarded-For only adds entries in front of it.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Gzip/Brotli for the website's files: the React bundle is ~550 KB raw, ~170 KB compressed.
// Over HTTPS this is off by default (an attack called BREACH can abuse compressed responses that mix
// secrets with attacker-controlled text), so below we only use it for the website, never for /api.
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);

var app = builder.Build();

// ----- 2. Middleware pipeline: every request passes through these, in order -----
// First, so everything after it (HTTPS redirection, rate limiting, logs) sees the real IP and scheme.
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    // The API description at /openapi/v1.json, only in Development.
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    // HSTS: tells browsers "only ever use HTTPS for this site" for the next 30 days (the default),
    // so even a typed http:// link can't be intercepted. Not in Development: localhost uses plain http.
    app.UseHsts();
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

// CORS answers the browser's "may I?" check (the preflight OPTIONS request) before anything else
// runs, and adds the "allowed" headers to every response, including errors like 401 and 429.
app.UseCors();

// ----- The website (deploy option B): this API also serves the built React app -----
// The deploy workflow copies frontend/dist into wwwroot next to the API. Locally there's no wwwroot
// (Vite serves the frontend on :5173), so this does nothing in development.
app.UseWhen(context => !context.Request.Path.StartsWithSegments("/api"), website => website.UseResponseCompression());

var websiteFiles = new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Vite puts a hash of the content in every file name under /assets (index-DMtv2s1M.js), so a
        // file with that name never changes: browsers may keep it for a year. index.html has no hash,
        // so browsers must check for a new version every time, or they'd keep running an old deploy.
        context.Context.Response.Headers.CacheControl = context.Context.Request.Path.StartsWithSegments("/assets")
            ? "public, max-age=31536000, immutable"
            : "no-cache";
    },
};
app.UseDefaultFiles(); // "/" → "/index.html"
app.UseStaticFiles(websiteFiles);

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
api.MapInviteEndpoints();

// ----- 4. Fallbacks: what to answer when no endpoint matched -----
// An unknown /api URL is a real 404 (a ProblemDetails, like every other API error)...
app.MapFallback("/api/{**path}", () => Results.NotFound());
// ...but any other URL without a file extension (/habits/123, /invite/abc) is a page of the React app:
// we send index.html and React Router shows the right page. Without this, opening an invite link
// (or refreshing any page except /) would be a 404, because there's no file called /invite/abc.
app.MapFallbackToFile("index.html", websiteFiles);

app.Run();
