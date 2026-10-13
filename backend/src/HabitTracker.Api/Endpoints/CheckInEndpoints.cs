using System.Security.Claims;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using HabitTracker.Api.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HabitTracker.Api.Endpoints;

public static class CheckInEndpoints
{
    public static RouteGroupBuilder MapCheckInEndpoints(this RouteGroupBuilder api)
    {
        // The check-in is identified by its habit and its day, so the URL *is* the resource:
        // PUT puts it there, DELETE removes it. No check-in id needed.
        var checkIns = api.MapGroup("/habits/{habitId:guid}/checkins").RequireAuthorization();

        checkIns.MapPut("/{date}", CheckIn).WithName("CheckIn");
        checkIns.MapDelete("/{date}", UndoCheckIn).WithName("UndoCheckIn");

        return api;
    }

    // PUT /api/habits/{habitId}/checkins/2026-10-13?today=2026-10-13
    // Idempotent: calling it twice leaves exactly one check-in, so a double-tap or a retry is harmless.
    private static async Task<IResult> CheckIn(Guid habitId, DateOnly date, DateOnly? today, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        // Any member (owner or partner) can check in, but only for themselves.
        var membership = await HabitEndpoints.FindMembership(db, habitId, userId);
        if (membership is null) return HabitEndpoints.HabitNotFound();

        var localToday = LocalDate.Resolve(today);
        if (date > localToday) return InvalidDate("You can't check in for a day that hasn't happened yet.");
        if (date < membership.Habit.StartDate) return InvalidDate("You can't check in before the habit started.");

        var exists = await db.CheckIns.AnyAsync(c => c.HabitId == habitId && c.UserId == userId && c.Date == date);
        if (exists) return Results.NoContent();

        db.CheckIns.Add(new CheckIn { HabitId = habitId, UserId = userId, Date = date });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Two taps at the same moment: both passed the check above, the unique index stopped the second.
            // The check-in exists, which is exactly what the caller wanted.
        }

        return Results.NoContent();
    }

    // DELETE /api/habits/{habitId}/checkins/2026-10-13
    // Also idempotent: removing a check-in that isn't there is still "it's not there" → 204.
    private static async Task<IResult> UndoCheckIn(Guid habitId, DateOnly date, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var membership = await HabitEndpoints.FindMembership(db, habitId, userId);
        if (membership is null) return HabitEndpoints.HabitNotFound();

        // ExecuteDeleteAsync runs a single DELETE in the database, without loading the row first.
        await db.CheckIns
            .Where(c => c.HabitId == habitId && c.UserId == userId && c.Date == date)
            .ExecuteDeleteAsync();

        return Results.NoContent();
    }

    private static IResult InvalidDate(string message) => Results.ValidationProblem(
        new Dictionary<string, string[]> { ["date"] = [message] });
}
