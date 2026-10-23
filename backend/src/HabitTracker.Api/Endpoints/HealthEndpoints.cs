namespace HabitTracker.Api.Endpoints;

public static class HealthEndpoints
{
    public static RouteGroupBuilder MapHealthEndpoints(this RouteGroupBuilder api)
    {
        // GET /api/health – for uptime checks (Azure's health check can ping it).
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
