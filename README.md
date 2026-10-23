# InSync – you two, synced up

InSync is a social habit tracker. You check in on your daily habits, keep your streaks alive, and share a habit with a friend so you can see each other's progress and build a **joint streak**: the days you *both* did it.

### 👉 [Use InSync live](https://habit-tracker-api-gw-hjbvg0c4cfhzfdg9.northcentralus-01.azurewebsites.net)

No install needed: open the link, create an account and start tracking. It runs on free tiers, so the first visit after a quiet period can take 10–30 seconds while the server wakes up.

I built InSync as a learning project with an AI pair programmer. [`docs/`](docs/) has the block-by-block plan I followed, and [`AGENTS.md`](AGENTS.md) has the rules the AI worked under.

## Features

- **Habits on your schedule:** pick the weekdays that count (every day, weekdays, Mon/Wed/Fri…), plus an icon and a color.
- **One-tap check-ins:** the card updates instantly and rolls back if the server says no.
- **Fair streaks:** rest days never break a streak, and today isn't "missed" until it's over.
- **Track together:** invite a partner with a single-use link that expires in 7 days. You see each other's check-ins, both streaks and your joint streak.
- **Habit detail page:** everyone's last 30 days side by side, plus a 12-week calendar heatmap.
- **Works on phones**, with keyboard focus outlines, screen-reader labels and readable contrast.

## Technical highlights

- **Timing-safe login.** A login for an email that doesn't exist still runs the slow password hash check against a dummy hash, so response times don't reveal which emails have accounts. Both cases return the same message. ([`AuthEndpoints.cs`](backend/src/HabitTracker.Api/Endpoints/AuthEndpoints.cs))
- **Race-safe invites.** Accepting an invite claims it with one conditional `UPDATE … WHERE AcceptedByUserId IS NULL` inside a transaction, so two people opening the same link at once can't both join. ([`InviteEndpoints.cs`](backend/src/HabitTracker.Api/Endpoints/InviteEndpoints.cs))
- **The database is the final guard.** Unique indexes stop duplicate accounts, memberships and check-ins, and the API turns those violations into a clean `409` or `204` instead of a `500`. ([`AppDbContext.cs`](backend/src/HabitTracker.Api/Data/AppDbContext.cs))
- **Resource-based authorization.** Every habit endpoint checks that you're a member of *that* habit, and returns `404` (not `403`) to non-members so it doesn't confirm the habit exists. ([`HabitEndpoints.cs`](backend/src/HabitTracker.Api/Endpoints/HabitEndpoints.cs))
- **Pure, unit-tested streak logic.** Streaks, joint streaks, completion rates and the heatmap live in a pure class with no database and no clock, covered by 31 xUnit tests. ([`StreakCalculator.cs`](backend/src/HabitTracker.Api/Services/StreakCalculator.cs), [tests](backend/tests/HabitTracker.Api.Tests/StreakCalculatorTests.cs))
- **No N+1 queries.** The dashboard loads all members and check-ins for all habits in two projected queries, however many habits there are.
- **Idempotent check-ins.** `PUT` and `DELETE /api/habits/{id}/checkins/{date}` give the same result when repeated, so double taps and retries are harmless. ([`CheckInEndpoints.cs`](backend/src/HabitTracker.Api/Endpoints/CheckInEndpoints.cs))
- **Optimistic UI with rollback.** A check-in updates the cached card immediately, and a failed request restores the snapshot. ([`habits.ts`](frontend/src/api/habits.ts))
- **Time zones handled explicitly.** Check-ins are the user's local calendar day (`DateOnly`). The server sanity-checks the client's "today" against the UTC−12 to UTC+14 range. ([`LocalDate.cs`](backend/src/HabitTracker.Api/Services/LocalDate.cs))
- **Production details.** The API reads Azure's forwarded headers so rate limits apply per visitor, not per proxy. It also sends HSTS, uses long-lived cache headers for hashed assets, and compresses only the website, never `/api`, to avoid BREACH. ([`Program.cs`](backend/src/HabitTracker.Api/Program.cs))

## How it fits together

A React app talks to an ASP.NET Core minimal API under `/api`, which stores data in PostgreSQL with EF Core. Logging in returns a signed JWT that the app sends with every request. In production, the API also serves the built React app, so everything runs from one Azure App Service. One GitHub Actions workflow ([`deploy.yml`](.github/workflows/deploy.yml)) lints, type-checks, tests, builds and deploys on every push to `main`.

```
backend/src/HabitTracker.Api/
  Domain/      entities (User, Habit, HabitMember, CheckIn, Invite)
  Data/        DbContext and migrations
  Contracts/   request/response DTOs with validation
  Endpoints/   minimal API endpoint groups
  Services/    TokenService, StreakCalculator, LocalDate
backend/tests/ xUnit tests
frontend/src/
  api/         typed API client and TanStack Query hooks
  auth/        AuthContext
  components/  UI components (shadcn/ui on Radix)
  pages/       routes
```

## Run it locally

You need the [.NET SDK 10](https://dotnet.microsoft.com/download) (10.0.103, pinned in `backend/global.json`), [Node.js 22+](https://nodejs.org) and PostgreSQL 17.

1. **Start PostgreSQL.** On macOS, with Homebrew:
   ```bash
   brew install postgresql@17 && brew services start postgresql@17
   createdb habittracker
   ```
2. **Configure the API.** Secrets live in .NET user secrets, outside the repo:
   ```bash
   cd backend/src/HabitTracker.Api
   # Your macOS user, no password (Homebrew's default):
   dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=habittracker;Username=$(whoami)"
   # Any random string of 32+ characters:
   dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
   ```
3. **Create the tables and start the API** (on http://localhost:5080):
   ```bash
   dotnet tool restore
   dotnet ef database update
   dotnet run
   ```
4. **Start the frontend** in a second terminal (on http://localhost:5173). Vite forwards `/api` calls to the API, so no CORS setup is needed:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. **Run the tests:** `cd backend && dotnet test`

## Tech stack

- **Backend:** ASP.NET Core 10 minimal APIs, Entity Framework Core 10 with Npgsql, JWT Bearer authentication, built-in rate limiting
- **Frontend:** React 19, TypeScript 6 (strict mode), Vite 8, TanStack Query 5, React Router 7, Tailwind CSS 4, shadcn/ui
- **Testing:** xUnit
- **Hosting:** Azure App Service (API + website), Neon (PostgreSQL), GitHub Actions (CI/CD)

## Known limitations

- Sessions last 60 minutes, and there's no refresh token yet, so you log in again after that.
- A partner's check-ins appear through polling every 30 seconds, not instantly.
- The tests cover the streak logic. The API endpoints don't have integration tests yet.

## Roadmap

- [ ] Integration tests for the API (auth, membership checks, invites)
- [ ] A mobile app for iPhone and Android with React Native (Expo)
- [ ] Reminder push notifications ("Your partner already checked in today")
- [ ] Delete your account from inside the app
- [ ] Real-time partner updates with SignalR, and a "nudge" button
- [ ] Groups and challenges with more than two people, and achievements
