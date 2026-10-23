namespace HabitTracker.Api.Domain;

public class User
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }

    // A salted hash from ASP.NET Core's PasswordHasher, never the password itself.
    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<HabitMember> Memberships { get; set; } = [];
    public List<CheckIn> CheckIns { get; set; } = [];
}
