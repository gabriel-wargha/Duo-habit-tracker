using System.Security.Claims;
using System.Text;
using HabitTracker.Api.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace HabitTracker.Api.Services;

// Settings from the "Jwt" section of configuration.
// Issuer/Audience/ExpiryMinutes live in appsettings.json; Key is a secret
// (user secrets locally, an Azure app setting in production).
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required string Key { get; init; }
    public int ExpiryMinutes { get; init; } = 60;

    // The same key signs tokens (here) and verifies them (in Program.cs).
    public SymmetricSecurityKey GetSigningKey() => new(Encoding.UTF8.GetBytes(Key));
}

public class TokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _jwt = options.Value;

    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            // Claims are facts about the user, readable by anyone holding the token.
            // So: an id and a name are fine. Never put secrets in here.
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.DisplayName),
                // A unique id per token (useful later for logging or revoking).
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            ]),
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = expiresAtUtc,
            // HMAC-SHA256: the signature proves the token came from us and wasn't edited.
            SigningCredentials = new SigningCredentials(_jwt.GetSigningKey(), SecurityAlgorithms.HmacSha256),
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return (token, expiresAtUtc);
    }
}
