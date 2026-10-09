namespace HabitTracker.Api.Domain;

public enum HabitRole
{
    Owner,
    Partner
}

// The join entity between User and Habit (many-to-many),
// with extra data of its own: the role and when they joined.
public class HabitMember
{
    public Guid Id { get; set; }

    public Guid HabitId { get; set; }
    public Habit Habit { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public HabitRole Role { get; set; }
    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
}
