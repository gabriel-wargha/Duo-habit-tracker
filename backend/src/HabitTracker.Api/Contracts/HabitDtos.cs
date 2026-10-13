using System.ComponentModel.DataAnnotations;
using HabitTracker.Api.Domain;

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
    DateTime CreatedAtUtc);
