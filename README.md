# InSync – you two, synced up

InSync is a social habit tracker. You check in on your daily habits, keep your streaks alive, and share a habit with a friend so you can see each other's progress and build a **joint streak**: the days you *both* did it.

### 👉 [Use InSync live](https://habit-tracker-api-gw-hjbvg0c4cfhzfdg9.northcentralus-01.azurewebsites.net)

No install needed: open the link, create an account and start tracking. It runs on free tiers, so the first visit after a quiet period can take 10–30 seconds while the server wakes up.

![The dashboard with four habits, streaks and a partner's check-in](docs/screenshots/dashboard.jpg)

**Features**

- **Habits on your schedule:** pick the weekdays that count (every day, weekdays, Mon/Wed/Fri…), plus an icon and a color.
- **One-tap check-ins:** the card updates instantly and rolls back if the server says no.
- **Fair streaks:** rest days never break a streak, and today isn't "missed" until it's over.
- **Track together:** invite a partner with a single-use link that expires in 7 days. You see each other's check-ins, both streaks and your joint streak.
- **Habit detail page:** everyone's last 30 days side by side, plus a 12-week calendar heatmap.
- **Works on phones**, with keyboard focus outlines, screen-reader labels and readable contrast.

| Habit detail | On a phone |
| --- | --- |
| ![Joint streak, 12-week heatmap and side-by-side rows](docs/screenshots/habit-detail.jpg) | ![The dashboard and the detail page at phone width](docs/screenshots/mobile.jpg) |

**How it fits together:** a React app talks to an ASP.NET Core API under `/api`, which stores data in PostgreSQL with EF Core. Logging in returns a signed JWT that the app sends with every request. Every habit endpoint checks that you're a member of *that* habit. The streak, joint streak and heatmap logic lives in a pure, unit-tested class (`StreakCalculator`). In production, the API also serves the built React app, so everything runs from one Azure App Service.

## Instructions for Build and Use

Steps to build and/or run the software:

1. **Start a PostgreSQL database.** Either use Docker (`docker compose up -d`, which uses `docker-compose.yml`) or Homebrew on macOS:
   ```bash
   brew install postgresql@17 && brew services start postgresql@17
   createdb habittracker
   ```
2. **Configure the API.** Secrets live in .NET user secrets, outside the repo:
   ```bash
   cd backend/src/HabitTracker.Api
   # Docker:
   dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=habittracker;Username=habit;Password=habit_dev_password"
   # Homebrew (your macOS user, no password):
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

Instructions for using the software:

1. Open the live site at https://habit-tracker-api-gw-hjbvg0c4cfhzfdg9.northcentralus-01.azurewebsites.net (or http://localhost:5173 if you're running it locally) and **create an account**.
2. Click **New habit**, give it a name, icon and color, and choose the days it's scheduled on.
3. **Tap a habit's check button** each day you do it, and watch your streak grow.
4. To track together, click **Invite** on a habit's card, and send the invite link to a friend. Once they accept, you'll both see each other's check-ins and your joint streak.
5. Open a habit to see the 30-day side-by-side view and the 12-week heatmap.

## Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* [.NET SDK 10](https://dotnet.microsoft.com/download) (10.0.103, pinned in `global.json`) with ASP.NET Core minimal APIs
* Entity Framework Core 10 with Npgsql (the PostgreSQL provider) and JWT Bearer authentication
* [PostgreSQL 17](https://www.postgresql.org/download/) (Docker or Homebrew)
* [Node.js 22+](https://nodejs.org) and npm
* React 19, TypeScript 6 (strict mode), Vite 8
* TanStack Query 5, React Router 7, Tailwind CSS 4
* xUnit for the backend tests
* Hosting: Azure App Service (API + website), Neon (PostgreSQL) and GitHub Actions (build, test and deploy)

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [ASP.NET Core minimal APIs](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
* [Entity Framework Core documentation](https://learn.microsoft.com/ef/core/)
* [React documentation](https://react.dev)
* [TanStack Query documentation](https://tanstack.com/query/latest)
* [Tailwind CSS documentation](https://tailwindcss.com/docs)
* [JWT introduction (jwt.io)](https://jwt.io/introduction)
* [Deploy to Azure App Service with GitHub Actions](https://learn.microsoft.com/azure/app-service/deploy-github-actions)
* [Neon documentation](https://neon.tech/docs)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] A mobile app for iPhone and Android with React Native (Expo), published on the App Store
* [ ] Reminder push notifications ("Your partner already checked in today")
* [ ] Delete your account from inside the app
* [ ] Real-time partner updates with SignalR, and a "nudge" button
* [ ] Groups and challenges with more than two people, and achievements
