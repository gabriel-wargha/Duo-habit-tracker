using System.Security.Claims;
using HabitTracker.Api.Contracts;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Npgsql;

namespace HabitTracker.Api.Endpoints;

public static class AuthEndpoints
{
    public const string LoginRateLimitPolicy = "login";
    public const string RegisterRateLimitPolicy = "register";

    // Used by Login when the email doesn't exist, so that case runs the same slow hash check
    // as a wrong password. Created once, the first time AuthEndpoints is used.
    private static readonly User TimingDummyUser = new() { Email = "timing-dummy@invalid", DisplayName = "timing-dummy" };
    private static readonly string TimingDummyHash =
        new PasswordHasher<User>().HashPassword(TimingDummyUser, "timing-dummy-password");

    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth");

        auth.MapPost("/register", Register)
            .WithName("Register")
            .RequireRateLimiting(RegisterRateLimitPolicy);

        auth.MapPost("/login", Login)
            .WithName("Login")
            .RequireRateLimiting(LoginRateLimitPolicy);

        // RequireAuthorization: no valid token → 401, and this code never runs.
        auth.MapGet("/me", Me)
            .WithName("GetMe")
            .RequireAuthorization();

        return api;
    }

    // POST /api/auth/register
    private static async Task<IResult> Register(
        RegisterRequest request,
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        TokenService tokens)
    {
        var email = NormalizeEmail(request.Email);

        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            return EmailTaken();
        }

        var user = new User
        {
            Email = email,
            DisplayName = request.DisplayName.Trim(),
        };
        // Hash = one-way, salted and deliberately slow. We can check a password against it,
        // but nobody (not even us) can turn it back into the password.
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Two sign-ups with the same email at the same moment can both pass the check above.
            // The unique index on Email is the real guard; we just turn its error into a 409.
            return EmailTaken();
        }

        // Log the new user straight in, so the front end doesn't need a second request.
        return Results.Created("/api/auth/me", CreateAuthResponse(user, tokens));
    }

    // POST /api/auth/login
    private static async Task<IResult> Login(
        LoginRequest request,
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        TokenService tokens)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);

        // Always run the slow hash check, even when the email doesn't exist.
        // Otherwise "no such email" answers instantly and "wrong password" takes ~100 ms,
        // and that time difference tells an attacker which emails have an account.
        var result = passwordHasher.VerifyHashedPassword(
            user ?? TimingDummyUser,
            user?.PasswordHash ?? TimingDummyHash,
            request.Password);

        if (user is null || result == PasswordVerificationResult.Failed)
        {
            // Same message for "no such email" and "wrong password",
            // so attackers can't use this endpoint to find out who has an account.
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Invalid email or password.");
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            // The hasher's settings got stronger since this hash was made: upgrade it now.
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await db.SaveChangesAsync();
        }

        return Results.Ok(CreateAuthResponse(user, tokens));
    }

    // GET /api/auth/me
    private static async Task<IResult> Me(ClaimsPrincipal principal, AppDbContext db)
    {
        // The JWT middleware already checked the token and turned its claims into this principal.
        // "sub" holds the user id we put in when creating the token.
        if (!Guid.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId))
        {
            return Results.Unauthorized();
        }

        var user = await db.Users.FindAsync(userId);

        // A valid token for a user who was deleted since: treat it as logged out.
        return user is null
            ? Results.Unauthorized()
            : Results.Ok(ToResponse(user));
    }

    // "Bob@Example.com " and "bob@example.com" should be the same account.
    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static IResult EmailTaken() => Results.Problem(
        statusCode: StatusCodes.Status409Conflict,
        title: "An account with this email already exists.");

    private static UserResponse ToResponse(User user) => new(user.Id, user.Email, user.DisplayName);

    private static AuthResponse CreateAuthResponse(User user, TokenService tokens)
    {
        var (token, expiresAtUtc) = tokens.CreateToken(user);
        return new AuthResponse(token, expiresAtUtc, ToResponse(user));
    }
}
