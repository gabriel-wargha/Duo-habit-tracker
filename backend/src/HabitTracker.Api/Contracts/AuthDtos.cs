using System.ComponentModel.DataAnnotations;

namespace HabitTracker.Api.Contracts;

// Request/response shapes. Entities are never returned directly: User holds the PasswordHash.
// The validation attributes run before the endpoint (AddValidation() in Program.cs): bad input → 400.
public record RegisterRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(8), MaxLength(100)] string Password,
    [property: Required, MaxLength(100)] string DisplayName);

public record LoginRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Password);

public record UserResponse(Guid Id, string Email, string DisplayName);

public record AuthResponse(string Token, DateTime ExpiresAtUtc, UserResponse User);
