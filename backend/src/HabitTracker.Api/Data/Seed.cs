using HabitTracker.Api.Domain;
using HabitTracker.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Data;

// A demo account so visitors (and recruiters) can try the app without signing up.
// It resets to the same story every time the API starts, so whatever visitors change doesn't stick.
public static class Seed
{
    // Public on purpose: it's printed in the README and behind the "Try the demo" button.
    // It only opens this throwaway account. Real secrets (JWT key, DB password) never go in code.
    // Keep in sync with DEMO_LOGIN in frontend/src/utils/demo.ts.
    public const string DemoEmail = "demo@habittracker.dev";
    public const string DemoPassword = "try-the-demo-2026";

    // The demo's partner. Nobody can log in as Sam: the password is random and thrown away.
    private const string PartnerEmail = "sam.demo@habittracker.dev";

    // Weekday masks (bit 0 = Sunday), as in StreakCalculator.IsScheduled.
    private const int EveryDay = 127;
    private const int Weekdays = 62;
    private const int MonWedFri = 42;

    public static async Task ResetDemoAsync(AppDbContext db, IPasswordHasher<User> hasher, DateOnly today)
    {
        var demo = await EnsureUserAsync(db, hasher, DemoEmail, "Alex (demo)", DemoPassword);
        var sam = await EnsureUserAsync(db, hasher, PartnerEmail, "Sam", Guid.NewGuid().ToString());
        Guid[] demoUsers = [demo.Id, sam.Id];

        // 1. Wipe the previous demo data. ExecuteDeleteAsync runs one DELETE in SQL, no loading.
        //    Only habits the demo users *own* are deleted (with their members, check-ins and invites,
        //    via cascade). If a real user invited the demo into their habit, that habit stays:
        //    we only remove the demo's membership and check-ins from it.
        await db.Habits
            .Where(h => h.Members.Any(m => m.Role == HabitRole.Owner && demoUsers.Contains(m.UserId)))
            .ExecuteDeleteAsync();
        await db.CheckIns.Where(c => demoUsers.Contains(c.UserId)).ExecuteDeleteAsync();
        await db.HabitMembers.Where(m => demoUsers.Contains(m.UserId)).ExecuteDeleteAsync();

        // 2. The same "random" history every time: a fixed seed makes Random repeatable.
        var random = new Random(2026);

        // Shared with Sam: shows partner avatars, the joint streak and side-by-side rows.
        var run = AddHabit(db, demo, "Morning run", "🏃", "#f97316", MonWedFri, today.AddDays(-83), "3 km before work");
        Join(run, sam, today.AddDays(-56));
        Track(db, run, demo, run.StartDate, today, random, rate: 0.7, recentStreak: 4, doneToday: false);
        Track(db, run, sam, today.AddDays(-56), today, random, rate: 0.8, recentStreak: 4, doneToday: true);

        var water = AddHabit(db, demo, "Drink 2 L of water", "💧", "#06b6d4", EveryDay, today.AddDays(-40), null);
        Join(water, sam, today.AddDays(-20));
        Track(db, water, demo, water.StartDate, today, random, rate: 0.9, recentStreak: 6, doneToday: false);
        Track(db, water, sam, today.AddDays(-20), today, random, rate: 0.9, recentStreak: 6, doneToday: true);

        // Solo habits: a strong one and one that's still a struggle (real data isn't perfect).
        var read = AddHabit(db, demo, "Read 20 pages", "📚", "#3b82f6", EveryDay, today.AddDays(-83), "Before bed");
        Track(db, read, demo, read.StartDate, today, random, rate: 0.75, recentStreak: 9, doneToday: true);

        var meditate = AddHabit(db, demo, "Meditate 10 min", "🧘", "#a855f7", Weekdays, today.AddDays(-40), null);
        Track(db, meditate, demo, meditate.StartDate, today, random, rate: 0.5, recentStreak: 2, doneToday: false);

        await db.SaveChangesAsync();
    }

    private static async Task<User> EnsureUserAsync(AppDbContext db, IPasswordHasher<User> hasher, string email, string name, string password)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            user = new User { Email = email, DisplayName = name };
            db.Users.Add(user);
        }

        // Reset name and password too, in case they were ever changed.
        user.DisplayName = name;
        user.PasswordHash = hasher.HashPassword(user, password);
        await db.SaveChangesAsync();
        return user;
    }

    private static Habit AddHabit(AppDbContext db, User owner, string name, string emoji, string color, int scheduleDays, DateOnly start, string? description)
    {
        var habit = new Habit
        {
            Name = name,
            Emoji = emoji,
            Color = color,
            ScheduleDays = scheduleDays,
            StartDate = start,
            Description = description,
        };
        habit.Members.Add(new HabitMember { UserId = owner.Id, Role = HabitRole.Owner });
        db.Habits.Add(habit);
        return habit;
    }

    private static void Join(Habit habit, User partner, DateOnly joinedOn) =>
        habit.Members.Add(new HabitMember
        {
            UserId = partner.Id,
            Role = HabitRole.Partner,
            JoinedAtUtc = joinedOn.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
        });

    // Check-ins on scheduled days from `from` to yesterday: random at `rate`, except the last
    // `recentStreak` scheduled days, which are all done so the dashboard shows a live streak.
    private static void Track(AppDbContext db, Habit habit, User user, DateOnly from, DateOnly today, Random random,
        double rate, int recentStreak, bool doneToday)
    {
        var scheduled = new List<DateOnly>();
        for (var day = from; day < today; day = day.AddDays(1))
        {
            if (StreakCalculator.IsScheduled(habit.ScheduleDays, day)) scheduled.Add(day);
        }

        for (var i = 0; i < scheduled.Count; i++)
        {
            var inStreak = i >= scheduled.Count - recentStreak;
            if (inStreak || random.NextDouble() < rate)
                db.CheckIns.Add(new CheckIn { Habit = habit, UserId = user.Id, Date = scheduled[i] });
        }

        // Left undone on some habits on purpose, so a visitor has something to tap.
        if (doneToday && StreakCalculator.IsScheduled(habit.ScheduleDays, today))
            db.CheckIns.Add(new CheckIn { Habit = habit, UserId = user.Id, Date = today });
    }
}
