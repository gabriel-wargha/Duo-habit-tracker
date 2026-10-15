namespace HabitTracker.Api.Contracts;

// Returned to the owner after creating an invite. The front end turns the code into a link.
public record CreateInviteResponse(string Code, DateTime ExpiresAtUtc);

// What someone sees when they open an invite link, possibly before logging in.
// Only the basics: enough to decide whether to join, nothing private.
public record InvitePreviewResponse(
    string HabitName,
    string? HabitDescription,
    string Icon,
    string Color,
    int ScheduleDays,
    string InviterName,
    DateTime ExpiresAtUtc,
    // True when the caller is logged in and already tracks this habit.
    bool IsMember);

public record AcceptInviteResponse(Guid HabitId);
