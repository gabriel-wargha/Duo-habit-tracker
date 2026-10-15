namespace HabitTracker.Api.Domain;

public class Habit
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    // A Lucide icon name like "book-open" (the frontend maps it to an icon component).
    public string Icon { get; set; } = "circle-check";

    // Hex color like "#22c55e".
    public string Color { get; set; } = "#22c55e";

    // Which weekdays the habit is scheduled on, as a bitmask (block 6).
    // 127 = all 7 bits set = every day.
    public int ScheduleDays { get; set; } = 127;

    // The first calendar day the habit counts from (check-ins before it are rejected in block 7).
    public DateOnly StartDate { get; set; }

    // Soft delete: archived habits are hidden, not removed (block 6).
    public bool IsArchived { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // No OwnerId here: the owner is the member whose Role is Owner.
    public List<HabitMember> Members { get; set; } = [];
    public List<CheckIn> CheckIns { get; set; } = [];
    public List<Invite> Invites { get; set; } = [];
}
