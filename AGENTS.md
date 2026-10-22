# AGENTS.md – How we work on this project

This file tells any AI coding agent (Claude, Copilot, Cursor, Codex, etc.) how to work in this repo.
The project owner is **learning** while building, so the explanations matter as much as the code.

## Project context

- **What:** A social habit tracker. Users log in, track habits, and track habits *together* with partners.
- **Plan:** `docs/PLAN.md` is the checklist. `docs/BLOCKS.md` has the details for every block (goal, tasks, concepts, files, done-when, commit).
- **Stack:** ASP.NET Core Web API + EF Core + PostgreSQL (`backend/`) · React + TypeScript + Vite + TanStack Query + React Router + Tailwind (`frontend/`).
- **Hosting:** live on one Azure App Service: the API also serves the built React app, and `.github/workflows/deploy.yml` tests and deploys every push to `main`. The database is Neon in production and Postgres from Homebrew locally. Don't add paid services or new hosting without asking.

## The workflow

The owner will say something like **"Build block 4"**. For every block, follow these steps in order.

### 1. Prepare
- Read `docs/PLAN.md` and the block's section in `docs/BLOCKS.md`.
- Check that earlier blocks are done (checked in `docs/PLAN.md`). If one isn't, say so and ask before continuing. Block 5 (deploy) is postponed: skip it and don't treat it as missing.
- Look at the current code before changing anything. Never assume what's there.
- If something in the block is unclear or conflicts with the existing code, ask **one** short question before building.

### 2. Build
- Do only that block's tasks. Don't jump ahead to later blocks.
- Keep changes small and readable. Prefer clear code over clever code.
- Add short comments where the *why* isn't obvious, not on every line.
- If you need to deviate from `docs/BLOCKS.md` (a package changed, a better approach exists), explain why in the summary.

### 3. Verify
- Build the backend (`dotnet build`) and run tests (`dotnet test`) when there are tests.
- Typecheck and build the frontend (`npm run build`).
- Check the block's **"Done when"** condition. If you can't check it yourself (for example, it needs the browser), give the owner exact steps to check it.
- Never claim something works if it wasn't verified. Say what was and wasn't checked.

### 4. Explain (after building)
After the block is built, write an explanation using this format:

```
## Block N – <name>: what we built
<2–3 sentences: what the app can do now that it couldn't before>

## Concepts
### <Concept 1>
- **What it is:** plain-language explanation, as if to a student who knows basic C# and JavaScript.
- **Why it matters:** the problem it solves, and what would go wrong without it.
- **How we applied it:** the exact file(s) and the key lines, with a short code excerpt.
- **Interview tip:** one sentence the owner could say about it in an interview.

### <Concept 2>
...

## Files changed
- `path/to/file` – what it does (one line each)

## Try it yourself
- Steps to run and see the result
- One small exercise to practice the concept (optional, for example "add a max length rule to Description")

## Commit
git add . && git commit -m "<suggested message from BLOCKS.md>"
```

Cover **every concept listed for the block in `docs/BLOCKS.md`**, plus any new concept that came up during the build.

### 5. Wrap up
- Check off the block in `docs/PLAN.md` (`- [ ]` → `- [x]`).
- Suggest the commit message. **Don't commit or push** unless the owner asks; they commit themselves so they review their own history.
- End with one line previewing the next block.

## Rules

- **Secrets never go in git.** Connection strings and JWT keys live in .NET user secrets locally (and in the host's environment variables once the app is deployed). Keep `.env*` files out of git (except `.env.example`).
- **Free tier first.** Don't add services that cost money without asking.
- **TypeScript strict mode** on the frontend. No `any` unless there's a comment explaining why.
- **Business logic stays testable.** Logic like streak calculation lives in pure classes with xUnit tests.
- **API conventions:** routes under `/api`, JSON in camelCase, errors as ProblemDetails, correct status codes (400 validation, 401 not logged in, 403 not allowed, 404 not found, 409 conflict).
- **Dates:** check-ins use `DateOnly` for the user's local calendar day; timestamps are stored in UTC.
- **Don't delete or rewrite the owner's code** outside the block's scope without asking.
- If a command needs to run on the owner's machine (for example, `dotnet ef database update`), give the exact command and what to expect.

## Project layout (target)

```
habit-tracker/
├── .claude/CLAUDE.md   # points Claude Code to this file
├── AGENTS.md
├── README.md
├── docs/
│   ├── PLAN.md
│   └── BLOCKS.md
├── .github/workflows/   # deploy.yml: test + deploy to Azure
├── backend/
│   ├── global.json          # pins the .NET SDK version
│   ├── .config/dotnet-tools.json  # dotnet-ef
│   ├── HabitTracker.sln
│   ├── src/HabitTracker.Api/
│   │   ├── Program.cs
│   │   ├── Domain/        # entities
│   │   ├── Data/          # DbContext, migrations, seed
│   │   ├── Contracts/     # request/response DTOs
│   │   ├── Endpoints/     # minimal API endpoint groups
│   │   └── Services/      # business logic (TokenService, StreakCalculator)
│   └── tests/HabitTracker.Api.Tests/
└── frontend/
    └── src/
        ├── api/           # typed API client + types
        ├── auth/          # AuthContext
        ├── components/
        └── pages/
```
