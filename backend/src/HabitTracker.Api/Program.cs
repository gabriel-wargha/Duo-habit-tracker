using HabitTracker.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// ----- 1. Services: things the app can use (registered in the DI container) -----
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// ----- 2. Middleware pipeline: every request passes through these, in order -----
if (app.Environment.IsDevelopment())
{
    // The API description at /openapi/v1.json, only in Development.
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// ----- 3. Endpoints: all our routes live under /api -----
var api = app.MapGroup("/api");
api.MapHealthEndpoints();

app.Run();
