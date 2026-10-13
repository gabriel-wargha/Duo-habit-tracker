# Habit Tracker – Build Plan

Stack: ASP.NET Core Web API + EF Core + Postgres | React + TypeScript + Vite + TanStack Query + Tailwind
Hosting: postponed – the app runs locally for now (see "Later" below).

## Part 1 – Build the app (blocks 1–10)
- [x] 1. Project setup – repo, scaffold API + Vite React-TS, Postgres in Docker, Vite proxy. Done: React shows data from API.
- [x] 2. Data model – User, Habit, HabitMember, CheckIn (unique HabitId+UserId+Date), first migration.
- [x] 3. Login back end – register/login, password hashing, JWT, /me, rate limits on login and register, same-timing login errors.
- [x] 4. Login front end – login/register pages, auth context, protected routes, logout.
- ⏸ 5. Deploy – postponed, moved to "Later" below. Skip it: after block 4, go to block 6.
- [x] 6. Habits – create/edit/archive: name, emoji, color, scheduled weekdays.
- [ ] 7. Check-ins and streaks – "done today" toggle, unit-tested streak logic, last-7-days dots.
- [ ] 8. Invite a partner – share link with expiring code, accept page adds HabitMember.
- [ ] 9. Track together – side-by-side check-ins, each streak + joint streak, polling refresh.
- [ ] 10. Polish + v1 – heatmap, loading/empty/error states, mobile, demo account, README.

## Part 2 – Make it amazing (blocks 11–15)
- [ ] 11. Real-time with SignalR – instant partner updates, nudge button.
- [ ] 12. Reminders – background service, emails in user's time zone.
- [ ] 13. Groups and challenges – 3+ members, 30-day challenges, leaderboard, activity feed.
- [ ] 14. Insights and achievements – year heatmap, trends, streak badges.
- [ ] 15. Production quality – Testcontainers tests, PWA, Google login, refresh tokens, monitoring.

## Later – Deploy (postponed)
- [ ] Deploy – Neon DB, Azure App Service + Static Web Apps, CORS, HSTS, forwarded headers, env vars, GitHub Actions. Details at the end of BLOCKS.md.

Tip: commit at the end of every block.
