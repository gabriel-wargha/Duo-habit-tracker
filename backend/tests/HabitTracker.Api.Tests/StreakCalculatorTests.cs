using HabitTracker.Api.Services;

namespace HabitTracker.Api.Tests;

// Each test follows Arrange-Act-Assert: set up the input, call the code once, check the result.
//
// Calendar used below (October 2026):
//   Mon 5  Tue 6  Wed 7  Thu 8  Fri 9  Sat 10  Sun 11  Mon 12  Tue 13
public class StreakCalculatorTests
{
    private const int EveryDay = 0b1111111;       // 127
    private const int Weekdays = 0b0111110;       // 62: Mon–Fri
    private const int MonWedFri = 0b0101010;      // 42

    private static readonly DateOnly Today = new(2026, 10, 13); // a Tuesday

    private static DateOnly Oct(int day) => new(2026, 10, day);
    private static HashSet<DateOnly> Done(params int[] octoberDays) => octoberDays.Select(Oct).ToHashSet();

    [Fact]
    public void No_check_ins_gives_zero_everything()
    {
        var stats = StreakCalculator.Calculate(EveryDay, Oct(1), Done(), Today);

        Assert.Equal(0, stats.CurrentStreak);
        Assert.Equal(0, stats.LongestStreak);
        Assert.Equal(0, stats.CompletionRate30);
        Assert.False(stats.DoneToday);
    }

    [Fact]
    public void Consecutive_days_including_today_count_as_streak()
    {
        // Arrange
        var checkIns = Done(11, 12, 13);

        // Act
        var stats = StreakCalculator.Calculate(EveryDay, Oct(1), checkIns, Today);

        // Assert
        Assert.Equal(3, stats.CurrentStreak);
        Assert.True(stats.DoneToday);
    }

    [Fact]
    public void Unfinished_today_does_not_break_the_streak()
    {
        // Done Sun–Mon, today (Tue) not yet: the streak is still alive at 2.
        var stats = StreakCalculator.Calculate(EveryDay, Oct(1), Done(11, 12), Today);

        Assert.Equal(2, stats.CurrentStreak);
        Assert.False(stats.DoneToday);
    }

    [Fact]
    public void Missing_yesterday_breaks_the_streak()
    {
        // Done 10 and 11, missed Mon 12, today not done yet: the streak is over.
        var stats = StreakCalculator.Calculate(EveryDay, Oct(1), Done(10, 11), Today);

        Assert.Equal(0, stats.CurrentStreak);
        Assert.Equal(2, stats.LongestStreak);
    }

    [Fact]
    public void Unscheduled_days_are_skipped_not_counted_as_missed()
    {
        // Weekdays only: Fri 9 and Mon 12 done, the weekend in between is off.
        var stats = StreakCalculator.Calculate(Weekdays, Oct(1), Done(8, 9, 12), Today);

        Assert.Equal(3, stats.CurrentStreak);
    }

    [Fact]
    public void Check_in_on_an_unscheduled_day_does_not_add_to_the_streak()
    {
        // Mon/Wed/Fri habit: Sat 10 is a bonus day, the streak is Fri 9 + Mon 12.
        var stats = StreakCalculator.Calculate(MonWedFri, Oct(1), Done(9, 10, 12), Today);

        Assert.Equal(2, stats.CurrentStreak);
    }

    [Fact]
    public void Days_before_the_start_date_are_ignored()
    {
        // Started yesterday: the gap on Oct 1–11 isn't a miss, and an old check-in doesn't count.
        var stats = StreakCalculator.Calculate(EveryDay, Oct(12), Done(5, 12, 13), Today);

        Assert.Equal(2, stats.CurrentStreak);
        Assert.Equal(2, stats.LongestStreak);
        Assert.Equal(1.0, stats.CompletionRate30);
    }

    [Fact]
    public void Longest_streak_is_kept_after_the_current_one_breaks()
    {
        // A 4-day run (Oct 2–5), a miss on the 6th, then a 2-day run ending yesterday.
        var stats = StreakCalculator.Calculate(EveryDay, Oct(1), Done(2, 3, 4, 5, 11, 12), Today);

        Assert.Equal(4, stats.LongestStreak);
        Assert.Equal(2, stats.CurrentStreak);
    }

    [Fact]
    public void Completion_rate_ignores_an_unfinished_today()
    {
        // Started Sun 11: Sun and Mon are done, today is still open → 2 of 2 = 100%.
        var stats = StreakCalculator.Calculate(EveryDay, Oct(11), Done(11, 12), Today);

        Assert.Equal(1.0, stats.CompletionRate30);
    }

    [Fact]
    public void Completion_rate_counts_only_scheduled_days_in_the_last_30_days()
    {
        // Weekdays since Mon 5: Mon 5 … Mon 12 has 6 weekdays (5–9 and 12), 3 of them done.
        var stats = StreakCalculator.Calculate(Weekdays, Oct(5), Done(5, 7, 12), Today);

        Assert.Equal(0.5, stats.CompletionRate30);
    }

    [Fact]
    public void Completion_rate_only_looks_back_30_days()
    {
        // Everything before Sep 14 is outside the window: 30 days = Sep 14 … Oct 13.
        var start = new DateOnly(2026, 8, 1);
        var checkIns = Enumerable.Range(0, 44).Select(i => start.AddDays(i)).ToHashSet(); // Aug 1 – Sep 13
        checkIns.Add(Oct(12));

        var stats = StreakCalculator.Calculate(EveryDay, start, checkIns, Today);

        // 29 finished days in the window (Sep 14 – Oct 12), one done. Today is open.
        Assert.Equal(1.0 / 29, stats.CompletionRate30, precision: 6);
    }

    [Fact]
    public void Last_seven_days_end_with_today_and_mark_schedule_and_check_ins()
    {
        var stats = StreakCalculator.Calculate(Weekdays, Oct(1), Done(9, 10, 13), Today);

        Assert.Equal(7, stats.Last7Days.Count);
        Assert.Equal(Oct(7), stats.Last7Days[0].Date);
        Assert.Equal(Today, stats.Last7Days[^1].Date);

        var saturday = stats.Last7Days.Single(d => d.Date == Oct(10));
        Assert.False(saturday.IsScheduled);
        Assert.True(saturday.IsDone); // a bonus check-in still shows up

        var monday = stats.Last7Days.Single(d => d.Date == Oct(12));
        Assert.True(monday.IsScheduled);
        Assert.False(monday.IsDone);
    }

    [Fact]
    public void Last_seven_days_before_the_start_date_are_not_scheduled()
    {
        var stats = StreakCalculator.Calculate(EveryDay, Oct(12), Done(), Today);

        Assert.All(stats.Last7Days.Where(d => d.Date < Oct(12)), d => Assert.False(d.IsScheduled));
        Assert.True(stats.Last7Days[^1].IsScheduled);
    }

    // [Theory] runs the same test with several inputs.
    [Theory]
    [InlineData(2026, 10, 11, EveryDay, true)]  // Sunday, every day
    [InlineData(2026, 10, 11, Weekdays, false)] // Sunday, weekdays only
    [InlineData(2026, 10, 12, Weekdays, true)]  // Monday
    [InlineData(2026, 10, 10, 0b1000000, true)] // Saturday = bit 6
    [InlineData(2026, 10, 11, 0b0000001, true)] // Sunday = bit 0
    public void IsScheduled_reads_the_right_bit(int year, int month, int day, int mask, bool expected)
    {
        Assert.Equal(expected, StreakCalculator.IsScheduled(mask, new DateOnly(year, month, day)));
    }

    [Fact]
    public void Start_date_in_the_future_gives_empty_stats()
    {
        var stats = StreakCalculator.Calculate(EveryDay, Oct(20), Done(), Today);

        Assert.Equal(0, stats.CurrentStreak);
        Assert.Equal(0, stats.LongestStreak);
        Assert.Equal(0, stats.CompletionRate30);
        Assert.All(stats.Last7Days, d => Assert.False(d.IsScheduled));
    }

    // ----- Tracking together -----

    [Fact]
    public void Owner_stats_start_at_the_habit_start()
    {
        var start = StreakCalculator.MemberStartDate(Oct(1), isOwner: true, joinedOn: Oct(10), Done(11));

        Assert.Equal(Oct(1), start);
    }

    [Fact]
    public void Partner_stats_start_on_the_day_they_joined()
    {
        // The habit started Oct 1, but the partner only joined on the 10th:
        // Oct 1–9 weren't "missed", they just weren't there yet.
        var start = StreakCalculator.MemberStartDate(Oct(1), isOwner: false, joinedOn: Oct(10), Done(11));

        Assert.Equal(Oct(10), start);
    }

    [Fact]
    public void Partner_check_in_before_the_UTC_join_day_still_counts()
    {
        // Joined late on the 9th in their time zone, which was already the 10th in UTC,
        // and checked in on the 9th. That check-in shouldn't be ignored.
        var start = StreakCalculator.MemberStartDate(Oct(1), isOwner: false, joinedOn: Oct(10), Done(9, 11));

        Assert.Equal(Oct(9), start);
    }

    [Fact]
    public void Partner_start_is_never_before_the_habit_start()
    {
        var start = StreakCalculator.MemberStartDate(Oct(5), isOwner: false, joinedOn: Oct(3), Done());

        Assert.Equal(Oct(5), start);
    }

    [Fact]
    public void Joint_days_are_the_days_everyone_checked_in()
    {
        var you = new MemberDays(Oct(1), Done(10, 11, 12, 13));
        var partner = new MemberDays(Oct(1), Done(11, 13));

        var together = StreakCalculator.Joint([you, partner]);

        Assert.Equal(Done(11, 13), together.CheckIns);
    }

    [Fact]
    public void Joint_starts_when_the_last_member_started()
    {
        var owner = new MemberDays(Oct(1), Done());
        var partner = new MemberDays(Oct(8), Done());

        Assert.Equal(Oct(8), StreakCalculator.Joint([owner, partner]).StartDate);
    }

    [Fact]
    public void Joint_streak_breaks_when_either_member_misses_a_day()
    {
        // You did every day from the 8th. Your partner (joined the 8th) skipped Sat 10.
        var you = new MemberDays(Oct(1), Done(8, 9, 10, 11, 12, 13));
        var partner = new MemberDays(Oct(8), Done(8, 9, 11, 12, 13));

        var together = StreakCalculator.Joint([you, partner]);
        var stats = StreakCalculator.Calculate(EveryDay, together.StartDate, together.CheckIns, Today);

        Assert.Equal(3, stats.CurrentStreak); // 11, 12, 13
        Assert.Equal(3, stats.LongestStreak);
    }

    [Fact]
    public void Joint_today_stays_open_until_everyone_is_done()
    {
        // Both did 11 and 12. Today only you are done: the joint streak is 2, not broken.
        var you = new MemberDays(Oct(1), Done(11, 12, 13));
        var partner = new MemberDays(Oct(1), Done(11, 12));

        var together = StreakCalculator.Joint([you, partner]);
        var stats = StreakCalculator.Calculate(EveryDay, together.StartDate, together.CheckIns, Today);

        Assert.Equal(2, stats.CurrentStreak);
        Assert.False(stats.DoneToday);
    }

    [Fact]
    public void Last_days_returns_the_requested_number_ending_today()
    {
        var days = StreakCalculator.LastDays(30, EveryDay, Oct(1), Done(13), Today);

        Assert.Equal(30, days.Count);
        Assert.Equal(Today, days[^1].Date);
        Assert.True(days[^1].IsDone);
        Assert.False(days[0].IsScheduled); // Sep 14, before the start date
    }
}
