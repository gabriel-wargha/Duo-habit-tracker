namespace HabitTracker.Api.Domain;

// A link someone can use to join a habit as a partner (used in block 8).
public class Invite
{
    public Guid Id { get; set; }

    public Guid HabitId { get; set; }
    public Habit Habit { get; set; } = null!;

    // The random, URL-safe code in the invite link.
    public required string Code { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }

    // Null until someone accepts the invite.
    public Guid? AcceptedByUserId { get; set; }
    public User? AcceptedByUser { get; set; }
    public DateTime? AcceptedAtUtc { get; set; }
}
