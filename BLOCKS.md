# Habit Tracker – Block Details

Each block is about 1 hour. Every block lists its **goal**, the **tasks**, the **concepts** you'll learn, the **files** it touches, a **done when** check, and a suggested **commit message**.

**Stack:** ASP.NET Core Web API (.NET) · EF Core · PostgreSQL · React + TypeScript · Vite · TanStack Query · React Router · Tailwind CSS
**Hosting (free):** Azure App Service F1 (API) · Azure Static Web Apps (frontend) · Neon (Postgres) · GitHub Actions (CI/CD)

## Core idea: tracking habits with someone else

- A **Habit** can have several **members** (`HabitMember`): one *owner* and one or more *partners*.
- Each member checks in on their own. A `CheckIn` belongs to **one habit + one user + one date**.
- From that we compute **your streak**, **your partner's streak**, and a **joint streak** (days *everyone* completed it).
- Partners join through an **invite link** with a code that expires.

```
User 1───* HabitMember *───1 Habit 1───* CheckIn *───1 User
                                Habit 1───* Invite
```

---

# Part 1 – Build and ship (blocks 1–10)

## Block 1 – Project setup

**Goal:** Both apps run locally and talk to each other.

**Tasks**
1. Create a GitHub repo and a `.gitignore` covering .NET (`bin/`, `obj/`) and Node (`node_modules/`, `dist/`).
2. Scaffold the API: `dotnet new webapi -n HabitTracker.Api` inside `backend/src/`, plus a solution file.
3. Scaffold the frontend: `npm create vite@latest frontend -- --template react-ts`.
4. Add Tailwind CSS to the frontend.
5. Add `docker-compose.yml` with a Postgres container for local development.
6. Add a `GET /api/health` endpoint, and configure Vite's dev proxy so `/api` calls reach the API.
7. Show the health response on the React home page.

**Concepts:** solution and project structure in .NET · minimal APIs · `Program.cs` and the middleware pipeline · Vite dev server and proxy · why a proxy avoids CORS in development · Docker containers for databases · environment-specific config (`appsettings.Development.json`)

**Files:** `backend/HabitTracker.sln`, `backend/src/HabitTracker.Api/*`, `frontend/*`, `docker-compose.yml`, `.gitignore`

**Done when:** the React page shows "API is healthy" fetched from the backend.

**Commit:** `chore: scaffold API, React-TS frontend and local Postgres`

---

## Block 2 – Data model

**Goal:** The database tables exist and match the domain.

**Tasks**
1. Add EF Core and the Npgsql provider.
2. Create entities: `User`, `Habit`, `HabitMember` (role: Owner/Partner), `CheckIn`, `Invite`.
3. Create `AppDbContext` with relationships, max lengths and indexes:
   - unique `User.Email`
   - unique `(HabitId, UserId)` on `HabitMember`
   - unique `(HabitId, UserId, Date)` on `CheckIn` (one check-in per person per day)
4. Store the connection string in configuration (user secrets locally, never in git).
5. Create and apply the first migration.

**Concepts:** entities vs. DTOs · EF Core `DbContext` and `DbSet` · relationships (one-to-many, many-to-many through a join entity) · indexes and unique constraints · migrations · `DateOnly` for calendar days · cascade deletes · .NET user secrets

**Files:** `Domain/*.cs`, `Data/AppDbContext.cs`, `Migrations/*`, `Program.cs`

**Done when:** you can see all tables in pgAdmin or `psql`.

**Commit:** `feat: add domain model and initial migration`

---

## Block 3 – Login (back end)

**Goal:** Users can register and log in, and the API knows who is calling.

**Tasks**
1. `POST /api/auth/register`: validate input, hash the password with `PasswordHasher<User>`, reject duplicate emails.
2. `POST /api/auth/login`: verify the password and return a signed **JWT**.
3. Configure JWT bearer authentication and authorization in `Program.cs`.
4. `GET /api/auth/me`: a protected endpoint returning the current user.
5. Add rate limiting to login to slow down password guessing.
6. Test everything with an `.http` file or the OpenAPI UI.

**Concepts:** authentication vs. authorization · password hashing (never store plain passwords) · JWT structure (header, payload/claims, signature) · signing keys and why they're secret · `[Authorize]` / `RequireAuthorization()` · claims and `ClaimsPrincipal` · rate limiting middleware · HTTP status codes (400, 401, 409)

**Files:** `Endpoints/AuthEndpoints.cs`, `Services/TokenService.cs`, `Contracts/AuthDtos.cs`, `Program.cs`, `HabitTracker.http`

**Done when:** register → login → call `/me` with the token returns your user; without the token you get 401.

**Commit:** `feat: JWT authentication with register, login and me endpoints`

---

## Block 4 – Login (front end)

**Goal:** Real sign-up and login in the browser.

**Tasks**
1. Create a typed API client (`api/client.ts`) that adds the token to requests and handles 401s.
2. Create an `AuthContext` with `user`, `login`, `register`, `logout`.
3. Build Login and Register pages with validation and server error messages.
4. Add React Router with a `ProtectedRoute` that redirects to `/login`.
5. Show an empty dashboard and a header with the user's name and a Logout button.

**Concepts:** React context and custom hooks · TypeScript types for API data · controlled forms · client-side routing · protected routes · where to store tokens (localStorage vs. httpOnly cookies, and the trade-offs) · handling loading and error states

**Files:** `src/api/client.ts`, `src/api/types.ts`, `src/auth/AuthContext.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/components/ProtectedRoute.tsx`, `src/App.tsx`

**Done when:** you can sign up, refresh the page and stay logged in, then log out.

**Commit:** `feat: login and registration UI with protected routes`

---

## Block 5 – Deploy early

**Goal:** The app is live on the internet, with automatic deploys.

**Tasks**
1. Create a free Neon Postgres database and copy its connection string.
2. Create an Azure App Service (Linux, F1 Free) for the API.
3. Set app settings: `ConnectionStrings__Default`, `Jwt__Key`, `Cors__AllowedOrigins`.
4. Configure CORS in the API to allow only the frontend's domain.
5. Apply migrations to Neon.
6. Create an Azure Static Web App for the frontend, with `VITE_API_URL` pointing at the API, plus SPA fallback routing.
7. Add GitHub Actions workflows: one for the API, one for the frontend.
8. Set a budget alert in Azure.

**Concepts:** environments (Development vs. Production) · configuration via environment variables · CORS and why it's needed in production · CI/CD pipelines · build artifacts · secrets in GitHub Actions · SPA routing on static hosts · cold starts on free tiers

**Files:** `.github/workflows/api.yml`, `.github/workflows/frontend.yml`, `frontend/staticwebapp.config.json`, `Program.cs`

**Done when:** you can register and log in on your live URL, and a `git push` redeploys automatically.

**Commit:** `ci: deploy API to Azure App Service and frontend to Static Web Apps`

---

## Block 6 – Habits

**Goal:** Users can create and manage their habits.

**Tasks**
1. Endpoints: `GET /api/habits`, `POST /api/habits`, `PUT /api/habits/{id}`, `DELETE /api/habits/{id}` (archive, not hard delete).
2. Creating a habit also creates the owner's `HabitMember` row.
3. Only members can read a habit, and only the owner can edit or archive it.
4. Validate input (name length, hex color, schedule bitmask).
5. Frontend: install TanStack Query, build habit cards, and a create/edit modal with emoji, color and weekday picker.

**Concepts:** REST resource design · DTOs and mapping · resource-based authorization (checking ownership) · soft deletes · bitmasks for weekday schedules · TanStack Query (queries, mutations, cache invalidation) · reusable components

**Files:** `Endpoints/HabitEndpoints.cs`, `Contracts/HabitDtos.cs`, `src/api/habits.ts`, `src/pages/DashboardPage.tsx`, `src/components/HabitCard.tsx`, `src/components/HabitForm.tsx`

**Done when:** you can create, edit and archive habits on the live site.

**Commit:** `feat: habit CRUD with schedule, color and emoji`

---

## Block 7 – Check-ins and streaks

**Goal:** One tap marks a habit done, and streaks update.

**Tasks**
1. `PUT /api/habits/{id}/checkins/{date}` and `DELETE` for the same route (toggle).
2. Reject future dates and dates before the habit started; use the user's local date from the client.
3. Write a pure `StreakCalculator` that computes current streak, longest streak and 30-day completion rate, skipping unscheduled days and not breaking the streak for an unfinished today.
4. Create an xUnit test project with tests for the calculator's edge cases.
5. Return stats in the habit DTO.
6. Frontend: a "done today" button with an **optimistic update**, a 🔥 streak count, and last-7-days dots.

**Concepts:** idempotent endpoints (PUT/DELETE) · pure functions and why they're easy to test · unit testing with xUnit (Arrange-Act-Assert) · edge cases and time zones · optimistic UI updates and rollback

**Files:** `Services/StreakCalculator.cs`, `Endpoints/CheckInEndpoints.cs`, `tests/HabitTracker.Api.Tests/StreakCalculatorTests.cs`, `src/components/HabitCard.tsx`, `src/components/WeekDots.tsx`

**Done when:** streak tests pass and checking in updates the card instantly.

**Commit:** `feat: daily check-ins with tested streak calculation`

---

## Block 8 – Inviting a partner

**Goal:** You can invite someone to track a habit with you.

**Tasks**
1. `POST /api/habits/{id}/invites`: create an `Invite` with a random, URL-safe code that expires in 7 days.
2. `GET /api/invites/{code}`: preview the habit and the inviter (works before login).
3. `POST /api/invites/{code}/accept`: adds the current user as a Partner; rejects expired, used or duplicate invites.
4. Owners can remove a partner; partners can leave.
5. Frontend: a Share button that copies the link, and an `/invite/:code` page that sends logged-out users to login/register and back.

**Concepts:** secure random tokens (`RandomNumberGenerator`) · expiring links · many-to-many membership · authorization rules by role · redirect-after-login flows · the Clipboard API

**Files:** `Domain/Invite.cs`, `Endpoints/InviteEndpoints.cs`, `src/pages/InvitePage.tsx`, `src/components/ShareDialog.tsx`

**Done when:** two accounts in two browsers share one habit and both see it on their dashboard.

**Commit:** `feat: invite partners to shared habits via expiring links`

---

## Block 9 – Tracking together

**Goal:** You can see your partner's progress next to yours.

**Tasks**
1. `GET /api/habits/{id}`: details with every member's check-ins for the last 30 days, each member's streak, and the **joint streak**.
2. Extend the calculator with a joint streak (days *all* members completed) and test it.
3. Dashboard cards show partner avatars (initials) with a ✅ when they've finished today.
4. Habit detail page: rows of check-in dots per member, side by side.
5. Auto-refresh with TanStack Query's `refetchInterval` (30 seconds) and refetch on window focus.

**Concepts:** aggregating data across users · avoiding N+1 queries (`Include`, projections with `Select`) · set intersection for joint streaks · polling vs. real-time (and why we upgrade in block 11) · composing UI from small components

**Files:** `Services/StreakCalculator.cs`, `Endpoints/HabitEndpoints.cs`, `src/pages/HabitDetailPage.tsx`, `src/components/MemberAvatars.tsx`, `src/components/MemberProgress.tsx`

**Done when:** your partner checks in and you see it within 30 seconds.

**Commit:** `feat: shared progress view with joint streaks`

---

## Block 10 – Polish and v1 release

**Goal:** A resume-ready v1 you'd proudly share.

**Tasks**
1. Calendar heatmap on the habit detail page (last 12 weeks).
2. Loading skeletons, empty states ("Create your first habit"), and friendly error messages.
3. Mobile layout pass and basic accessibility (labels, focus states, contrast).
4. A landing page for logged-out visitors explaining the app.
5. Seed a demo account with sample data.
6. README: description, features, screenshots, architecture diagram, tech stack, live link, demo login, how to run locally.
7. Tag the release `v1.0.0`.

**Concepts:** UX states (loading/empty/error) · responsive design with Tailwind · accessibility basics · data seeding · writing a strong project README · semantic versioning

**Files:** `src/components/Heatmap.tsx`, `src/pages/LandingPage.tsx`, `Data/Seed.cs`, `README.md`

**Done when:** the live site looks good on phone and desktop, and a stranger can understand it from the README.

**Commit:** `feat: v1 polish, landing page and README` → tag `v1.0.0`

---

# Part 2 – Make it amazing (blocks 11–15)

## Block 11 – Real-time with SignalR

**Goal:** Partner activity appears instantly.

**Tasks**
1. Add a SignalR hub; authenticate it with the JWT (passed as `access_token` in the query string).
2. Put each user in groups per shared habit; broadcast `CheckInChanged` when a member checks in.
3. Frontend: connect with `@microsoft/signalr`, update the TanStack Query cache on events, and show a toast ("Alex just kept a 12-day streak 🔥").
4. A "Nudge" button that sends your partner a friendly ping.
5. Remove the polling from block 9 (keep refetch on focus as a fallback).

**Concepts:** WebSockets and SignalR · hubs, groups and connection lifecycle · authenticating real-time connections · pushing server events into a client cache · reconnect handling

**Done when:** a check-in in one browser appears in the other in under a second.

**Commit:** `feat: real-time partner updates and nudges with SignalR`

## Block 12 – Reminders

**Goal:** Users get a reminder before they forget.

**Tasks**
1. Add `ReminderTime` per habit and `TimeZone` per user.
2. A `BackgroundService` that runs every minute, finds habits due for a reminder in each user's local time, and skips ones already done today.
3. Send emails through a free-tier email API behind an `IEmailSender` interface.
4. Settings page for reminder preferences and time zone.
5. Document the free-tier limitation (the app sleeps) and the workaround (external scheduler or a paid plan).

**Concepts:** hosted/background services · dependency injection scopes inside background work · time zones (`TimeZoneInfo`) · interfaces for swappable services · idempotency (don't send twice)

**Done when:** you receive a reminder email at the time you set.

**Commit:** `feat: scheduled reminder emails`

## Block 13 – Groups and challenges

**Goal:** Track habits with more than one person and compete.

**Tasks**
1. Allow 3+ members per habit (limit, for example, 10).
2. Challenges: a habit with a start and end date ("30-day no sugar").
3. Weekly leaderboard by completion rate.
4. Activity feed: who checked in, who joined, streak milestones.

**Concepts:** modeling time-boxed features · ranking queries (`GROUP BY`, ordering) · feed design (event records) · pagination

**Done when:** a group of three can run a challenge and see the leaderboard.

**Commit:** `feat: group challenges, leaderboard and activity feed`

## Block 14 – Insights and achievements

**Goal:** Users see their progress and earn badges.

**Tasks**
1. Stats page: full-year heatmap, best weekdays, completion trend chart.
2. Achievements (7, 30, 100-day streaks; first shared habit) stored per user and awarded when earned.
3. Celebration animation when a badge is unlocked.

**Concepts:** aggregation queries · charting in React · event-driven rules (award on check-in) · delightful UI details

**Done when:** you unlock a badge and see it on your profile.

**Commit:** `feat: insights page and achievements`

## Block 15 – Production quality

**Goal:** It looks and works like a professional product.

**Tasks**
1. Integration tests with `WebApplicationFactory` + Testcontainers (real Postgres in Docker), run in CI.
2. Installable PWA (manifest, icons, service worker).
3. Google login.
4. Refresh tokens in httpOnly cookies instead of a long-lived token in localStorage.
5. Error monitoring and logging with Application Insights; global error handling with ProblemDetails.

**Concepts:** integration vs. unit tests · test containers · PWAs · OAuth/OpenID Connect · refresh-token rotation · observability

**Done when:** CI runs integration tests, the app installs on your phone, and errors show up in your dashboard.

**Commit:** `feat: integration tests, PWA, Google login and monitoring`
