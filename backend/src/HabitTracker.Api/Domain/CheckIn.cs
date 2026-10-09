namespace HabitTracker.Api.Domain;

// "This user did this habit on this day." At most one per (habit, user, day).
public class CheckIn
{
    public Guid Id { get; set; }

    public Guid HabitId { get; set; }
    public Habit Habit { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // The user's local calendar day (no time, no time zone).
    // A run at 23:30 in São Paulo counts for that day, even though it's already tomorrow in UTC.
    public DateOnly Date { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
