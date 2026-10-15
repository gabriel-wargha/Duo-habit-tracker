using System.Security.Claims;
using HabitTracker.Api.Contracts;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Endpoints;

public static class HabitEndpoints
{
    private const int HeatmapWeeks = 12;

    public static RouteGroupBuilder MapHabitEndpoints(this RouteGroupBuilder api)
    {
        // Every habit route needs a logged-in user, so we require it once for the whole group.
        var habits = api.MapGroup("/habits").RequireAuthorization();

        habits.MapGet("/", GetHabits).WithName("GetHabits");
        habits.MapGet("/{id:guid}", GetHabit).WithName("GetHabit");
        habits.MapPost("/", CreateHabit).WithName("CreateHabit");
        habits.MapPut("/{id:guid}", UpdateHabit).WithName("UpdateHabit");
        habits.MapDelete("/{id:guid}", ArchiveHabit).WithName("ArchiveHabit");

        return api;
    }

    // The `today` query parameter (e.g. ?today=2026-10-13) is the user's local date,
    // used to calculate streaks. See Services/LocalDate.cs for how it's checked.

    // GET /api/habits – the active habits the current user is a member of, with their stats.
    private static async Task<IResult> GetHabits(DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();

        // Start from the user's memberships: that's both the filter ("only my habits")
        // and where the role comes from.
        var memberships = await db.HabitMembers
            .Include(m => m.Habit)
            .Where(m => m.UserId == userId && !m.Habit.IsArchived)
            .OrderBy(m => m.Habit.CreatedAtUtc)
            .ToListAsync();

        // Two queries for all members and all check-ins of these habits together,
        // instead of two queries per habit (the "N+1" problem).
        var localToday = LocalDate.Resolve(today);
        var progress = await LoadProgress(db, memberships.Select(m => m.Habit).ToList(), localToday);

        return Results.Ok(memberships.Select(m => ToResponse(m.Habit, m.Role, userId, progress[m.HabitId], localToday)));
    }

    // GET /api/habits/{id} – the card data plus every member's last 30 days, side by side,
    // and the "together" row.
    private static async Task<IResult> GetHabit(Guid id, DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var membership = await FindMembership(db, id, userId);
        if (membership is null) return HabitNotFound();

        var habit = membership.Habit;
        var localToday = LocalDate.Resolve(today);
        var progress = (await LoadProgress(db, [habit], localToday))[habit.Id];
        const int days = StreakCalculator.CompletionWindowDays; // the same 30 days as the completion rate

        var rows = progress
            .Select(p => new MemberProgressResponse(
                p.Member.UserId, p.Member.DisplayName, p.Member.Role, p.Days.StartDate, p.Stats,
                StreakCalculator.LastDays(days, habit.ScheduleDays, p.Days.StartDate, p.Days.CheckIns, localToday)))
            .ToList();

        JointProgressResponse? joint = null;
        if (progress.Count > 1)
        {
            var together = StreakCalculator.Joint(progress.Select(p => p.Days).ToList());
            joint = new JointProgressResponse(
                together.StartDate,
                StreakCalculator.Calculate(habit.ScheduleDays, together.StartDate, together.CheckIns, localToday),
                StreakCalculator.LastDays(days, habit.ScheduleDays, together.StartDate, together.CheckIns, localToday));
        }

        var heatmap = StreakCalculator.Heatmap(
            HeatmapWeeks, habit.ScheduleDays, habit.StartDate, progress.Select(p => p.Days).ToList(), localToday);

        return Results.Ok(new HabitDetailResponse(
            ToResponse(habit, membership.Role, userId, progress, localToday), rows, joint, heatmap));
    }

    // POST /api/habits
    private static async Task<IResult> CreateHabit(HabitRequest request, DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var localToday = LocalDate.Resolve(today);
        var habit = new Habit
        {
            Name = request.Name,
            StartDate = request.StartDate ?? localToday,
        };
        Apply(request, habit);

        // There's no OwnerId on Habit: the creator becomes the member with the Owner role.
        // Adding both in one SaveChanges means one transaction: we never get a habit without an owner.
        habit.Members.Add(new HabitMember { UserId = userId, Role = HabitRole.Owner });
        db.Habits.Add(habit);
        await db.SaveChangesAsync();

        var progress = await LoadProgress(db, [habit], localToday);
        return Results.Created($"/api/habits/{habit.Id}", ToResponse(habit, HabitRole.Owner, userId, progress[habit.Id], localToday));
    }

    // PUT /api/habits/{id}
    private static async Task<IResult> UpdateHabit(Guid id, HabitRequest request, DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var membership = await FindMembership(db, id, userId);
        if (membership is null) return HabitNotFound();
        if (membership.Role != HabitRole.Owner) return OnlyOwner("edit");

        Apply(request, membership.Habit);
        if (request.StartDate is { } startDate) membership.Habit.StartDate = startDate;
        await db.SaveChangesAsync();

        var localToday = LocalDate.Resolve(today);
        var progress = await LoadProgress(db, [membership.Habit], localToday);
        return Results.Ok(ToResponse(membership.Habit, membership.Role, userId, progress[id], localToday));
    }

    // DELETE /api/habits/{id} – archives (soft-deletes) instead of removing the row,
    // so check-ins and streak history survive.
    private static async Task<IResult> ArchiveHabit(Guid id, ClaimsPrincipal principal, AppDbContext db)
    {
        var membership = await FindMembership(db, id, principal.GetUserId(), includeArchived: true);
        if (membership is null) return HabitNotFound();
        if (membership.Role != HabitRole.Owner) return OnlyOwner("archive");

        // Archiving twice is fine: DELETE should be idempotent (same result however often you call it).
        membership.Habit.IsArchived = true;
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    // The user's membership in this habit (with the habit loaded), or null if they aren't a member.
    // Resource-based authorization: being logged in isn't enough, you must belong to *this* habit.
    // Internal so CheckInEndpoints can use the same check.
    internal static Task<HabitMember?> FindMembership(AppDbContext db, Guid habitId, Guid userId, bool includeArchived = false) =>
        db.HabitMembers
            .Include(m => m.Habit)
            .SingleOrDefaultAsync(m => m.HabitId == habitId
                && m.UserId == userId
                && (includeArchived || !m.Habit.IsArchived));

    // Copies the editable fields from the request onto the entity.
    private static void Apply(HabitRequest request, Habit habit)
    {
        habit.Name = request.Name.Trim();
        habit.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        habit.Emoji = request.Emoji.Trim();
        habit.Color = request.Color.ToLowerInvariant();
        habit.ScheduleDays = request.ScheduleDays;
    }

    private sealed record MemberRow(Guid HabitId, Guid UserId, string DisplayName, HabitRole Role, DateTime JoinedAtUtc);

    // One member of one habit: who they are, their days, and their stats.
    private sealed record MemberProgress(MemberRow Member, MemberDays Days, HabitStats Stats);

    // Every member's progress in each habit (owner first, then partners in the order they joined).
    // Two queries no matter how many habits: all members, then all their check-ins.
    // Each uses a projection (Select) so only the columns we need come back, not whole entities.
    private static async Task<Dictionary<Guid, List<MemberProgress>>> LoadProgress(AppDbContext db, List<Habit> habits, DateOnly today)
    {
        var habitIds = habits.Select(h => h.Id).ToList();

        var members = await db.HabitMembers
            .Where(m => habitIds.Contains(m.HabitId))
            .OrderBy(m => m.Role == HabitRole.Owner ? 0 : 1)
            .ThenBy(m => m.JoinedAtUtc)
            .Select(m => new MemberRow(m.HabitId, m.UserId, m.User.DisplayName, m.Role, m.JoinedAtUtc))
            .ToListAsync();

        var checkIns = (await db.CheckIns
                .Where(c => habitIds.Contains(c.HabitId))
                .Select(c => new { c.HabitId, c.UserId, c.Date })
                .ToListAsync())
            .GroupBy(c => (c.HabitId, c.UserId))
            .ToDictionary(g => g.Key, g => g.Select(c => c.Date).ToHashSet());

        // From here on it's all in memory: group, then let the pure calculator do the math.
        var membersByHabit = members.ToLookup(m => m.HabitId);
        return habits.ToDictionary(h => h.Id, h => membersByHabit[h.Id]
            .Select(m =>
            {
                var dates = checkIns.GetValueOrDefault((h.Id, m.UserId)) ?? [];
                var start = StreakCalculator.MemberStartDate(
                    h.StartDate, m.Role == HabitRole.Owner, DateOnly.FromDateTime(m.JoinedAtUtc), dates);
                var stats = StreakCalculator.Calculate(h.ScheduleDays, start, dates, today);
                return new MemberProgress(m, new MemberDays(start, dates), stats);
            })
            .ToList());
    }

    private static HabitResponse ToResponse(Habit habit, HabitRole role, Guid userId, List<MemberProgress> progress, DateOnly today)
    {
        // The card's stats are the caller's own.
        var mine = progress.Single(p => p.Member.UserId == userId);

        int? jointStreak = null;
        if (progress.Count > 1)
        {
            var together = StreakCalculator.Joint(progress.Select(p => p.Days).ToList());
            jointStreak = StreakCalculator.Calculate(habit.ScheduleDays, together.StartDate, together.CheckIns, today).CurrentStreak;
        }

        return new HabitResponse(
            habit.Id, habit.Name, habit.Description, habit.Emoji, habit.Color,
            habit.ScheduleDays, habit.StartDate, habit.IsArchived, role, habit.CreatedAtUtc, mine.Stats,
            progress
                .Select(p => new MemberResponse(p.Member.UserId, p.Member.DisplayName, p.Member.Role, p.Stats.DoneToday, p.Stats.CurrentStreak))
                .ToList(),
            jointStreak);
    }

    // Non-members get 404, not 403: a 403 would confirm that a habit with this id exists.
    internal static IResult HabitNotFound() => Results.Problem(
        statusCode: StatusCodes.Status404NotFound,
        title: "Habit not found.");

    // Members who aren't the owner get 403: they can see the habit, they just can't change it.
    private static IResult OnlyOwner(string action) => Results.Problem(
        statusCode: StatusCodes.Status403Forbidden,
        title: $"Only the habit's owner can {action} it.");
}
