using System.Buffers.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using HabitTracker.Api.Contracts;
using HabitTracker.Api.Data;
using HabitTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HabitTracker.Api.Endpoints;

// Sharing a habit: invite links, accepting them, and removing/leaving partners.
public static class InviteEndpoints
{
    public static readonly TimeSpan InviteLifetime = TimeSpan.FromDays(7);

    // Owner + one partner for now. Block 13 (groups) raises this.
    public const int MaxMembers = 2;

    public static RouteGroupBuilder MapInviteEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/habits/{habitId:guid}/invites", CreateInvite)
            .WithName("CreateInvite")
            .RequireAuthorization();

        // No RequireAuthorization: the preview must work for people who don't have an account yet.
        // If a valid token *is* sent, ASP.NET still reads it, so we can say "you're already a member".
        api.MapGet("/invites/{code}", PreviewInvite).WithName("PreviewInvite");

        api.MapPost("/invites/{code}/accept", AcceptInvite)
            .WithName("AcceptInvite")
            .RequireAuthorization();

        api.MapDelete("/habits/{habitId:guid}/members/{userId:guid}", RemoveMember)
            .WithName("RemoveMember")
            .RequireAuthorization();

        return api;
    }

    // POST /api/habits/{habitId}/invites – owner only.
    private static async Task<IResult> CreateInvite(Guid habitId, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var membership = await HabitEndpoints.FindMembership(db, habitId, userId);
        if (membership is null) return HabitEndpoints.HabitNotFound();
        if (membership.Role != HabitRole.Owner) return Problem(StatusCodes.Status403Forbidden, "Only the habit's owner can invite people.");

        if (await db.HabitMembers.CountAsync(m => m.HabitId == habitId) >= MaxMembers)
            return Problem(StatusCodes.Status409Conflict, "This habit already has a partner.");

        var invite = new Invite
        {
            HabitId = habitId,
            Code = NewCode(),
            CreatedByUserId = userId,
            ExpiresAtUtc = DateTime.UtcNow.Add(InviteLifetime),
        };
        db.Invites.Add(invite);
        await db.SaveChangesAsync();

        return Results.Created($"/api/invites/{invite.Code}", new CreateInviteResponse(invite.Code, invite.ExpiresAtUtc));
    }

    // GET /api/invites/{code} – anyone with the link.
    private static async Task<IResult> PreviewInvite(string code, ClaimsPrincipal principal, AppDbContext db)
    {
        var invite = await FindInvite(db, code);
        if (invite is null) return InviteNotFound();
        if (UnusableReason(invite) is { } problem) return problem;

        // principal.Identity.IsAuthenticated is true only if a valid token came with the request.
        var isMember = principal.Identity?.IsAuthenticated == true
            && await db.HabitMembers.AnyAsync(m => m.HabitId == invite.HabitId && m.UserId == principal.GetUserId());

        var habit = invite.Habit;
        return Results.Ok(new InvitePreviewResponse(
            habit.Name, habit.Description, habit.Emoji, habit.Color, habit.ScheduleDays,
            invite.CreatedByUser.DisplayName, invite.ExpiresAtUtc, isMember));
    }

    // POST /api/invites/{code}/accept – joins the habit as a Partner.
    private static async Task<IResult> AcceptInvite(string code, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = principal.GetUserId();
        var invite = await FindInvite(db, code);
        if (invite is null) return InviteNotFound();

        var alreadyMember = await db.HabitMembers.AnyAsync(m => m.HabitId == invite.HabitId && m.UserId == userId);
        if (alreadyMember)
        {
            // Accepting your own invite twice (double-click, refresh) is fine. Anyone else already
            // in the habit (like the owner opening their own link) gets a clear 409.
            return invite.AcceptedByUserId == userId
                ? Results.Ok(new AcceptInviteResponse(invite.HabitId))
                : Problem(StatusCodes.Status409Conflict, "You're already tracking this habit.");
        }

        if (UnusableReason(invite) is { } problem) return problem;

        if (await db.HabitMembers.CountAsync(m => m.HabitId == invite.HabitId) >= MaxMembers)
            return Problem(StatusCodes.Status409Conflict, "This habit already has a partner.");

        // A transaction: claiming the invite and adding the member happen together, or not at all.
        await using var transaction = await db.Database.BeginTransactionAsync();

        // Claim the invite with one conditional UPDATE ("...WHERE AcceptedByUserId IS NULL").
        // If two people open the same link at the same moment, the database lets exactly one of them
        // change the row. The other gets 0 rows back and loses, instead of both joining.
        var now = DateTime.UtcNow;
        var claimed = await db.Invites
            .Where(i => i.Id == invite.Id && i.AcceptedByUserId == null && i.ExpiresAtUtc > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(i => i.AcceptedByUserId, userId)
                .SetProperty(i => i.AcceptedAtUtc, now));
        if (claimed == 0) return InviteUsed();

        db.HabitMembers.Add(new HabitMember { HabitId = invite.HabitId, UserId = userId, Role = HabitRole.Partner });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // The unique (HabitId, UserId) index caught a double join. Disposing the transaction rolls back the claim.
            return Problem(StatusCodes.Status409Conflict, "You're already tracking this habit.");
        }

        await transaction.CommitAsync();
        return Results.Ok(new AcceptInviteResponse(invite.HabitId));
    }

    // DELETE /api/habits/{habitId}/members/{userId}
    // The owner can remove a partner. A partner can remove themselves (= leave).
    private static async Task<IResult> RemoveMember(Guid habitId, Guid userId, ClaimsPrincipal principal, AppDbContext db)
    {
        var callerId = principal.GetUserId();
        var caller = await HabitEndpoints.FindMembership(db, habitId, callerId);
        if (caller is null) return HabitEndpoints.HabitNotFound();

        var isLeaving = userId == callerId;
        if (isLeaving && caller.Role == HabitRole.Owner)
            return Problem(StatusCodes.Status409Conflict, "The owner can't leave their own habit. Archive it instead.");
        if (!isLeaving && caller.Role != HabitRole.Owner)
            return Problem(StatusCodes.Status403Forbidden, "Only the habit's owner can remove a partner.");

        var removed = await db.HabitMembers
            .Where(m => m.HabitId == habitId && m.UserId == userId)
            .ExecuteDeleteAsync();
        if (removed == 0) return Problem(StatusCodes.Status404NotFound, "That person isn't a member of this habit.");

        // Their check-ins stay in the database: history isn't deleted, it's just no longer shown.
        return Results.NoContent();
    }

    // 16 random bytes from a cryptographically secure generator = 128 bits: impossible to guess.
    // Base64Url makes it short (22 characters) and safe in a URL (no + / or =).
    // Never use Random/Guid.NewGuid() for secrets: they aren't designed to be unpredictable.
    private static string NewCode() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(16));

    private static Task<Invite?> FindInvite(AppDbContext db, string code) =>
        db.Invites
            .Include(i => i.Habit)
            .Include(i => i.CreatedByUser)
            .SingleOrDefaultAsync(i => i.Code == code && !i.Habit.IsArchived);

    // 410 Gone: the link existed, but it's no longer usable. Different from 404 (never existed).
    private static IResult? UnusableReason(Invite invite) =>
        invite.IsUsed ? InviteUsed()
        : invite.IsExpired(DateTime.UtcNow) ? Problem(StatusCodes.Status410Gone, "This invite has expired. Ask for a new link.")
        : null;

    private static IResult InviteUsed() => Problem(StatusCodes.Status410Gone, "This invite has already been used.");

    private static IResult InviteNotFound() => Problem(StatusCodes.Status404NotFound, "Invite not found.");

    private static IResult Problem(int status, string title) => Results.Problem(statusCode: status, title: title);
}
