using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace HabitTracker.Api.Endpoints;

public static class ClaimsPrincipalExtensions
{
    // The current user's id, from the "sub" claim of the validated JWT.
    // Only call this on endpoints with RequireAuthorization(), where the token is guaranteed valid.
    public static Guid GetUserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("The token has no 'sub' claim."));
}
