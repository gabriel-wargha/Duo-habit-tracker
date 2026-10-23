namespace HabitTracker.Api.Services;

// One day in the "last 7 days" strip on a habit card.
public record DayStatus(DateOnly Date, bool IsScheduled, bool IsDone);

public record HabitStats(
    int CurrentStreak,
    int LongestStreak,
    // 0.0–1.0: done scheduled days ÷ scheduled days, over the last 30 days.
    double CompletionRate30,
    bool DoneToday,
    IReadOnlyList<DayStatus> Last7Days);

// One square in the heatmap. DoneCount = how many members checked in that day
// (0 or 1 for a solo habit, 0–2 for a shared one), so the color can show "one of you" vs "both".
public record HeatmapDay(DateOnly Date, bool IsScheduled, int DoneCount);

// One member's input to the calculator: when their stats start, and the days they checked in.
public record MemberDays(DateOnly StartDate, IReadOnlySet<DateOnly> CheckIns);

// A pure function: the result depends only on the arguments.
// No database, no clock (today is passed in), no side effects. That's what makes it easy to test:
// give it dates, check the numbers.
//
// Rules:
// - Only scheduled days count. An unscheduled day never breaks a streak, and a check-in on one
//   is a bonus that doesn't extend it.
// - Today, if not done yet, is "still open": it doesn't break the streak or lower the completion rate.
// - Days before the habit's start date don't exist for these stats.
public static class StreakCalculator
{
    public const int CompletionWindowDays = 30;

    public static HabitStats Calculate(int scheduleDays, DateOnly startDate, IReadOnlySet<DateOnly> checkIns, DateOnly today)
    {
        var doneToday = checkIns.Contains(today);

        return new HabitStats(
            CurrentStreak(scheduleDays, startDate, checkIns, today),
            LongestStreak(scheduleDays, startDate, checkIns, today),
            CompletionRate(scheduleDays, startDate, checkIns, today),
            doneToday,
            LastDays(7, scheduleDays, startDate, checkIns, today));
    }

    // Bit 0 = Sunday ... bit 6 = Saturday, the same numbering as DayOfWeek.
    public static bool IsScheduled(int scheduleDays, DateOnly date) =>
        (scheduleDays & (1 << (int)date.DayOfWeek)) != 0;

    // Walk backwards from today, counting done scheduled days until the first missed one.
    private static int CurrentStreak(int scheduleDays, DateOnly startDate, IReadOnlySet<DateOnly> checkIns, DateOnly today)
    {
        var streak = 0;
        for (var day = today; day >= startDate; day = day.AddDays(-1))
        {
            if (!IsScheduled(scheduleDays, day)) continue;

            if (checkIns.Contains(day)) streak++;
            else if (day == today) continue; // today isn't over yet
            else break;
        }
        return streak;
    }

    // Walk forwards from the start, tracking the longest run of done scheduled days.
    private static int LongestStreak(int scheduleDays, DateOnly startDate, IReadOnlySet<DateOnly> checkIns, DateOnly today)
    {
        int longest = 0, run = 0;
        for (var day = startDate; day <= today; day = day.AddDays(1))
        {
            if (!IsScheduled(scheduleDays, day)) continue;

            if (checkIns.Contains(day)) longest = Math.Max(longest, ++run);
            else if (day != today) run = 0;
        }
        return longest;
    }

    private static double CompletionRate(int scheduleDays, DateOnly startDate, IReadOnlySet<DateOnly> checkIns, DateOnly today)
    {
        var windowStart = today.AddDays(-(CompletionWindowDays - 1));
        if (windowStart < startDate) windowStart = startDate;

        int scheduled = 0, done = 0;
        for (var day = windowStart; day <= today; day = day.AddDays(1))
        {
            if (!IsScheduled(scheduleDays, day)) continue;

            var isDone = checkIns.Contains(day);
            if (day == today && !isDone) continue; // an open today doesn't count against you

            scheduled++;
            if (isDone) done++;
        }
        return scheduled == 0 ? 0 : (double)done / scheduled;
    }

    // ----- Tracking together -----

    // When a member's stats start. The owner counts from the habit's start date. A partner counts
    // from the day they joined: days before that weren't "missed", they just weren't there yet.
    //
    // joinedOn comes from a UTC timestamp, so it can be a day off from the partner's local calendar.
    // If they checked in earlier than that (e.g. on their local join day), we start from that check-in
    // instead, so a real check-in is never ignored.
    public static DateOnly MemberStartDate(DateOnly habitStart, bool isOwner, DateOnly joinedOn, IReadOnlySet<DateOnly> checkIns)
    {
        if (isOwner) return habitStart;

        var start = checkIns.Count > 0 && checkIns.Min() < joinedOn ? checkIns.Min() : joinedOn;
        return start > habitStart ? start : habitStart;
    }

    // "Together" as if it were one more member: the days *everyone* checked in (the intersection of
    // their check-in sets), starting from the day the last member started. Feed the result to
    // Calculate() and you get the joint streak, joint best and joint completion rate for free.
    public static MemberDays Joint(IReadOnlyList<MemberDays> members)
    {
        if (members.Count == 0) throw new ArgumentException("A habit always has at least one member.", nameof(members));

        var together = new HashSet<DateOnly>(members[0].CheckIns);
        foreach (var member in members.Skip(1))
            together.IntersectWith(member.CheckIns);

        return new MemberDays(members.Max(m => m.StartDate), together);
    }

    // The calendar heatmap: whole weeks (Sunday to Saturday), the last one being the current week,
    // cut off at today. Starting on a Sunday means every column in the grid is exactly one week.
    public static List<HeatmapDay> Heatmap(int weeks, int scheduleDays, DateOnly habitStart, IReadOnlyList<MemberDays> members, DateOnly today)
    {
        var thisSunday = today.AddDays(-(int)today.DayOfWeek);
        var first = thisSunday.AddDays(-7 * (weeks - 1));

        var days = new List<HeatmapDay>();
        for (var day = first; day <= today; day = day.AddDays(1))
        {
            days.Add(new HeatmapDay(
                day,
                IsScheduled: day >= habitStart && IsScheduled(scheduleDays, day),
                DoneCount: members.Count(m => m.CheckIns.Contains(day))));
        }
        return days;
    }

    // Oldest first, ending with today. Calculate() uses 7 days for the cards; the detail page asks for 30.
    public static List<DayStatus> LastDays(int count, int scheduleDays, DateOnly startDate, IReadOnlySet<DateOnly> checkIns, DateOnly today) =>
        Enumerable.Range(0, count)
            .Select(i => today.AddDays(i - (count - 1)))
            .Select(day => new DayStatus(
                day,
                IsScheduled: day >= startDate && IsScheduled(scheduleDays, day),
                IsDone: checkIns.Contains(day)))
            .ToList();
}
