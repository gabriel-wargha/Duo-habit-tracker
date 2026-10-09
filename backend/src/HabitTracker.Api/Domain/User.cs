namespace HabitTracker.Api.Domain;

public class User
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }

    // Never the real password: block 3 stores a salted hash here.
    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties: EF Core fills these when you ask it to (Include).
    public List<HabitMember> Memberships { get; set; } = [];
    public List<CheckIn> CheckIns { get; set; } = [];
}
