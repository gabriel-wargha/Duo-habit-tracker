using System.ComponentModel.DataAnnotations;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Services;

namespace HabitTracker.Api.Contracts;

// Used by both POST (create) and PUT (update): a PUT sends the whole habit, not just the changes.
public record HabitRequest(
    [property: Required, MaxLength(100)] string Name,
    [property: MaxLength(500)] string? Description,
    [property: Required, MaxLength(16)] string Emoji,
    // A hex color like "#22c55e". The regex keeps anything else (like CSS injection) out.
    [property: Required, RegularExpression("^#[0-9a-fA-F]{6}$", ErrorMessage = "Color must be a hex color like #22c55e.")] string Color,
    // Weekday bitmask: 1 = Sunday, 2 = Monday, 4 = Tuesday ... 64 = Saturday. 127 = every day.
    // At least one day must be set, and no bits beyond Saturday.
    [property: Range(1, 127, ErrorMessage = "Pick at least one day.")] int ScheduleDays,
    // The user's local "today" when creating. Optional: the server falls back to today in UTC.
    DateOnly? StartDate);

public record HabitResponse(
    Guid Id,
    string Name,
    string? Description,
    string Emoji,
    string Color,
    int ScheduleDays,
    DateOnly StartDate,
    bool IsArchived,
    // The calling user's role, so the front end knows whether to show Edit/Archive.
    HabitRole Role,
    DateTime CreatedAtUtc,
    // Streaks, completion rate and the last 7 days, for the current user (Services/StreakCalculator.cs).
    HabitStats Stats,
    // Everyone tracking this habit, owner first.
    IReadOnlyList<MemberResponse> Members,
    // Days in a row that *every* member completed. Null when you track it alone.
    int? JointStreak);

// DoneToday and CurrentStreak let the dashboard show a ✅ on a partner's avatar.
public record MemberResponse(Guid UserId, string DisplayName, HabitRole Role, bool DoneToday, int CurrentStreak);

// GET /api/habits/{id}: the card data plus everyone's progress side by side.
public record HabitDetailResponse(
    HabitResponse Habit,
    // One row per member, owner first.
    IReadOnlyList<MemberProgressResponse> Progress,
    // The "together" row. Null when you track it alone.
    JointProgressResponse? Joint);

public record MemberProgressResponse(
    Guid UserId,
    string DisplayName,
    HabitRole Role,
    // When this member's stats start: the habit's start for the owner, the join day for a partner.
    DateOnly StartDate,
    HabitStats Stats,
    IReadOnlyList<DayStatus> Last30Days);

public record JointProgressResponse(DateOnly StartDate, HabitStats Stats, IReadOnlyList<DayStatus> Last30Days);
