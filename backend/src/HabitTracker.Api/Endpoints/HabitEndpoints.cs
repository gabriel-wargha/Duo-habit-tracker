using System.Security.Claims;
using HabitTracker.Api.Contracts;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HabitTracker.Api.Endpoints;

public static class HabitEndpoints
{
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

        // One query each for all check-ins and all members of these habits,
        // instead of one query per habit (the "N+1" problem).
        var habitIds = memberships.Select(m => m.HabitId).ToList();
        var checkIns = await LoadCheckIns(db, userId, habitIds);
        var members = await LoadMembers(db, habitIds);
        var localToday = LocalDate.Resolve(today);

        return Results.Ok(memberships.Select(m => ToResponse(m.Habit, m.Role, checkIns, members, localToday)));
    }

    // GET /api/habits/{id}
    private static async Task<IResult> GetHabit(Guid id, DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var membership = await FindMembership(db, id, userId);
        if (membership is null) return HabitNotFound();

        var checkIns = await LoadCheckIns(db, userId, [id]);
        var members = await LoadMembers(db, [id]);
        return Results.Ok(ToResponse(membership.Habit, membership.Role, checkIns, members, LocalDate.Resolve(today)));
    }

    // POST /api/habits
    private static async Task<IResult> CreateHabit(HabitRequest request, DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var localToday = LocalDate.Resolve(today);
        var habit = new Habit
        {
            Name = request.Name,
            StartDate = request.StartDate ?? localToday,
        };
        Apply(request, habit);

        // There's no OwnerId on Habit: the creator becomes the member with the Owner role.
        // Adding both in one SaveChanges means one transaction: we never get a habit without an owner.
        habit.Members.Add(new HabitMember { UserId = principal.GetUserId(), Role = HabitRole.Owner });
        db.Habits.Add(habit);
        await db.SaveChangesAsync();

        // A brand-new habit has no check-ins yet, and only one member: the creator.
        var members = await LoadMembers(db, [habit.Id]);
        return Results.Created($"/api/habits/{habit.Id}", ToResponse(habit, HabitRole.Owner, [], members, localToday));
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

        var checkIns = await LoadCheckIns(db, userId, [id]);
        var members = await LoadMembers(db, [id]);
        return Results.Ok(ToResponse(membership.Habit, membership.Role, checkIns, members, LocalDate.Resolve(today)));
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

    // The user's check-in dates per habit. Only the current user's: partners' check-ins come in block 9.
    private static async Task<Dictionary<Guid, HashSet<DateOnly>>> LoadCheckIns(AppDbContext db, Guid userId, List<Guid> habitIds)
    {
        var rows = await db.CheckIns
            .Where(c => c.UserId == userId && habitIds.Contains(c.HabitId))
            .Select(c => new { c.HabitId, c.Date })
            .ToListAsync();

        return rows
            .GroupBy(r => r.HabitId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Date).ToHashSet());
    }

    // Everyone in each habit, owner first, then partners in the order they joined.
    private static async Task<Dictionary<Guid, List<MemberResponse>>> LoadMembers(AppDbContext db, List<Guid> habitIds)
    {
        var rows = await db.HabitMembers
            .Where(m => habitIds.Contains(m.HabitId))
            .OrderBy(m => m.Role == HabitRole.Owner ? 0 : 1)
            .ThenBy(m => m.JoinedAtUtc)
            .Select(m => new { m.HabitId, Member = new MemberResponse(m.UserId, m.User.DisplayName, m.Role) })
            .ToListAsync();

        return rows
            .GroupBy(r => r.HabitId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Member).ToList());
    }

    private static HabitResponse ToResponse(
        Habit habit,
        HabitRole role,
        Dictionary<Guid, HashSet<DateOnly>> checkIns,
        Dictionary<Guid, List<MemberResponse>> members,
        DateOnly today)
    {
        var dates = checkIns.GetValueOrDefault(habit.Id) ?? [];
        var stats = StreakCalculator.Calculate(habit.ScheduleDays, habit.StartDate, dates, today);

        return new HabitResponse(
            habit.Id, habit.Name, habit.Description, habit.Emoji, habit.Color,
            habit.ScheduleDays, habit.StartDate, habit.IsArchived, role, habit.CreatedAtUtc, stats,
            members.GetValueOrDefault(habit.Id) ?? []);
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
