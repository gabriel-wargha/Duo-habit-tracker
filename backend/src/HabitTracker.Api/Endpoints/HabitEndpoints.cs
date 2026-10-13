using System.Security.Claims;
using HabitTracker.Api.Contracts;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
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

    // GET /api/habits – the active habits the current user is a member of.
    private static async Task<IResult> GetHabits(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();

        // Start from the user's memberships: that's both the filter ("only my habits")
        // and where the role comes from. Select(...) means EF only loads the columns we need.
        var habits = await db.HabitMembers
            .Where(m => m.UserId == userId && !m.Habit.IsArchived)
            .OrderBy(m => m.Habit.CreatedAtUtc)
            .Select(m => new HabitResponse(
                m.Habit.Id, m.Habit.Name, m.Habit.Description, m.Habit.Emoji, m.Habit.Color,
                m.Habit.ScheduleDays, m.Habit.StartDate, m.Habit.IsArchived, m.Role, m.Habit.CreatedAtUtc))
            .ToListAsync();

        return Results.Ok(habits);
    }

    // GET /api/habits/{id}
    private static async Task<IResult> GetHabit(Guid id, ClaimsPrincipal principal, AppDbContext db)
    {
        var membership = await FindMembership(db, id, principal.GetUserId());
        return membership is null
            ? HabitNotFound()
            : Results.Ok(ToResponse(membership.Habit, membership.Role));
    }

    // POST /api/habits
    private static async Task<IResult> CreateHabit(HabitRequest request, ClaimsPrincipal principal, AppDbContext db)
    {
        var habit = new Habit
        {
            Name = request.Name,
            StartDate = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
        };
        Apply(request, habit);

        // There's no OwnerId on Habit: the creator becomes the member with the Owner role.
        // Adding both in one SaveChanges means one transaction: we never get a habit without an owner.
        habit.Members.Add(new HabitMember { UserId = principal.GetUserId(), Role = HabitRole.Owner });
        db.Habits.Add(habit);
        await db.SaveChangesAsync();

        return Results.Created($"/api/habits/{habit.Id}", ToResponse(habit, HabitRole.Owner));
    }

    // PUT /api/habits/{id}
    private static async Task<IResult> UpdateHabit(Guid id, HabitRequest request, ClaimsPrincipal principal, AppDbContext db)
    {
        var membership = await FindMembership(db, id, principal.GetUserId());
        if (membership is null) return HabitNotFound();
        if (membership.Role != HabitRole.Owner) return OnlyOwner("edit");

        Apply(request, membership.Habit);
        if (request.StartDate is { } startDate) membership.Habit.StartDate = startDate;
        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(membership.Habit, membership.Role));
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
    private static Task<HabitMember?> FindMembership(AppDbContext db, Guid habitId, Guid userId, bool includeArchived = false) =>
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

    private static HabitResponse ToResponse(Habit habit, HabitRole role) => new(
        habit.Id, habit.Name, habit.Description, habit.Emoji, habit.Color,
        habit.ScheduleDays, habit.StartDate, habit.IsArchived, role, habit.CreatedAtUtc);

    // Non-members get 404, not 403: a 403 would confirm that a habit with this id exists.
    private static IResult HabitNotFound() => Results.Problem(
        statusCode: StatusCodes.Status404NotFound,
        title: "Habit not found.");

    // Members who aren't the owner get 403: they can see the habit, they just can't change it.
    private static IResult OnlyOwner(string action) => Results.Problem(
        statusCode: StatusCodes.Status403Forbidden,
        title: $"Only the habit's owner can {action} it.");
}
