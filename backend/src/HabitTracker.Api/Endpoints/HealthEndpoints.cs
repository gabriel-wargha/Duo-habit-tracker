namespace HabitTracker.Api.Endpoints;

// Each feature gets its own file with an extension method like this one,
// so Program.cs stays short: it just calls app.MapXxxEndpoints().
public static class HealthEndpoints
{
    public static RouteGroupBuilder MapHealthEndpoints(this RouteGroupBuilder api)
    {
        // GET /api/health – a tiny endpoint to prove the API is up.
        // Hosting platforms (like Azure) can also ping this to check the app is alive.
        api.MapGet("/health", () => Results.Ok(new
        {
            status = "Healthy",
            message = "API is healthy",
            timeUtc = DateTime.UtcNow
        }))
        .WithName("GetHealth");

        return api;
    }
}
