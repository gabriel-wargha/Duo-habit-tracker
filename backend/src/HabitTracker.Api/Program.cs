using HabitTracker.Api.Data;
using HabitTracker.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ----- 1. Services: things the app can use (registered in the DI container) -----
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// The connection string comes from configuration: user secrets locally,
// an environment variable (ConnectionStrings__Default) in production. Never from git.
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "Missing connection string 'Default'. Set it with: dotnet user-secrets set \"ConnectionStrings:Default\" \"...\"");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

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
