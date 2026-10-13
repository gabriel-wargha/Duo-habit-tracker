using System.ComponentModel.DataAnnotations;

namespace HabitTracker.Api.Contracts;

// DTOs ("data transfer objects") are the shapes the API sends and receives.
// We never return the User entity directly: it holds the PasswordHash.

// The attributes are checked automatically before our endpoint runs
// (builder.Services.AddValidation() in Program.cs). Bad input → 400 with the details.
public record RegisterRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(8), MaxLength(100)] string Password,
    [property: Required, MaxLength(100)] string DisplayName);

public record LoginRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Password);

public record UserResponse(Guid Id, string Email, string DisplayName);

public record AuthResponse(string Token, DateTime ExpiresAtUtc, UserResponse User);
