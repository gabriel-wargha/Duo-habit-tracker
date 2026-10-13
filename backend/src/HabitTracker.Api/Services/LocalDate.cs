namespace HabitTracker.Api.Services;

// The server runs in UTC, but "today" for a habit means the user's local calendar day,
// which only the browser knows. So the client sends it (?today=2026-10-13).
//
// We can still sanity-check it: time zones range from UTC-12 to UTC+14,
// so everyone's local date is the UTC date, the day before, or the day after.
public static class LocalDate
{
    public static DateOnly UtcToday => DateOnly.FromDateTime(DateTime.UtcNow);

    public static bool IsPossibleToday(DateOnly date) =>
        date >= UtcToday.AddDays(-1) && date <= UtcToday.AddDays(1);

    // The client's today if it's believable; otherwise fall back to the UTC date.
    public static DateOnly Resolve(DateOnly? clientToday) =>
        clientToday is { } date && IsPossibleToday(date) ? date : UtcToday;
}
