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
