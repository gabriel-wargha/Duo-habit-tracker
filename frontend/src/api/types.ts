// TypeScript versions of the API's DTOs (backend/src/HabitTracker.Api/Contracts).
// If the API changes a shape, update it here and the compiler shows every place to fix.

export type User = {
  id: string
  email: string
  displayName: string
}

export type AuthResponse = {
  token: string
  expiresAtUtc: string // ISO date string; JSON has no Date type
  user: User
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  displayName: string
}

// The standard error body the API returns (RFC 9457 ProblemDetails).
// `errors` is only there for 400 validation errors: field name → messages.
export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}

// ----- Habits (Contracts/HabitDtos.cs) -----

export type HabitRole = 'Owner' | 'Partner'

export type Habit = {
  id: string
  name: string
  description: string | null
  emoji: string
  color: string // hex, like "#22c55e"
  scheduleDays: number // weekday bitmask, see utils/schedule.ts
  startDate: string // "YYYY-MM-DD", a calendar day without time zone
  isArchived: boolean
  role: HabitRole // the current user's role in this habit
  createdAtUtc: string
  stats: HabitStats // the current user's progress (Services/StreakCalculator.cs)
  members: Member[] // everyone tracking this habit, owner first
  jointStreak: number | null // days in a row everyone completed; null when tracked alone
}

export type Member = {
  userId: string
  displayName: string
  role: HabitRole
  doneToday: boolean
  currentStreak: number
}

export type DayStatus = {
  date: string // "YYYY-MM-DD"
  isScheduled: boolean
  isDone: boolean
}

export type HabitStats = {
  currentStreak: number
  longestStreak: number
  completionRate30: number // 0–1
  doneToday: boolean
  last7Days: DayStatus[] // oldest first, ends with today
}

// GET /api/habits/{id}: the card data plus everyone's last 30 days.
export type HabitDetail = {
  habit: Habit
  progress: MemberProgress[] // one row per member, owner first
  joint: JointProgress | null // the "together" row; null when tracked alone
}

export type MemberProgress = {
  userId: string
  displayName: string
  role: HabitRole
  startDate: string // when this member's stats start (a partner: the day they joined)
  stats: HabitStats
  last30Days: DayStatus[]
}

export type JointProgress = {
  startDate: string
  stats: HabitStats
  last30Days: DayStatus[]
}

// Sent to POST /api/habits (create) and PUT /api/habits/{id} (update).
export type HabitRequest = {
  name: string
  description: string | null
  emoji: string
  color: string
  scheduleDays: number
  startDate?: string
}

// ----- Invites (Contracts/InviteDtos.cs) -----

export type CreateInviteResponse = {
  code: string
  expiresAtUtc: string
}

export type InvitePreview = {
  habitName: string
  habitDescription: string | null
  emoji: string
  color: string
  scheduleDays: number
  inviterName: string
  expiresAtUtc: string
  isMember: boolean // true if you're logged in and already track this habit
}

export type AcceptInviteResponse = {
  habitId: string
}
