import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { localToday } from '../utils/dates'
import { request } from './client'
import type { Habit, HabitRequest } from './types'

// ----- Plain API calls -----
// `today` is the user's local date: the server needs it to calculate streaks.
export const habitsApi = {
  list: (today: string) => request<Habit[]>(`/habits?today=${today}`),
  create: (body: HabitRequest) => request<Habit>('/habits', { method: 'POST', body }),
  update: (id: string, body: HabitRequest) => request<Habit>(`/habits/${id}`, { method: 'PUT', body }),
  archive: (id: string) => request<void>(`/habits/${id}`, { method: 'DELETE' }),
  checkIn: (id: string, date: string, today: string) =>
    request<void>(`/habits/${id}/checkins/${date}?today=${today}`, { method: 'PUT' }),
  undoCheckIn: (id: string, date: string) => request<void>(`/habits/${id}/checkins/${date}`, { method: 'DELETE' }),
}

// ----- TanStack Query hooks -----
// A query key names a piece of cached data. The list's key includes the date, so after midnight
// it's a different cache entry and streaks are recalculated for the new day.
// Invalidating ['habits'] marks *every* key that starts with it as stale (a prefix match).
export const habitKeys = {
  all: ['habits'] as const,
  list: (today: string) => ['habits', today] as const,
}

// Query = reading data. TanStack Query fetches it, caches it, and gives us
// isPending / isError / data, so components don't need their own useEffect + useState.
export function useHabits() {
  const today = localToday()
  return useQuery({
    queryKey: habitKeys.list(today),
    queryFn: () => habitsApi.list(today),
  })
}

// Mutation = changing data. After it succeeds, we invalidate the list
// so the dashboard refetches and shows the change.
export function useCreateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: habitsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

export function useUpdateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: HabitRequest }) => habitsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

export function useArchiveHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: habitsApi.archive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

// ----- Check-ins, with an optimistic update -----

// Our best guess of what the server will say after checking in (or undoing) today.
// It only needs to be right for the next few hundred milliseconds: once the request finishes,
// we refetch and the server's real numbers replace it.
export function withTodayCheckIn(habit: Habit, today: string, done: boolean): Habit {
  const day = habit.stats.last7Days.find((d) => d.date === today)
  if (!day || day.isDone === done) return habit

  // Bonus check-ins on unscheduled days don't change the streak (same rule as StreakCalculator).
  const change = day.isScheduled ? (done ? 1 : -1) : 0
  const currentStreak = Math.max(0, habit.stats.currentStreak + change)

  return {
    ...habit,
    stats: {
      ...habit.stats,
      doneToday: done,
      currentStreak,
      longestStreak: Math.max(habit.stats.longestStreak, currentStreak),
      last7Days: habit.stats.last7Days.map((d) => (d.date === today ? { ...d, isDone: done } : d)),
    },
  }
}

type ToggleVariables = { habitId: string; done: boolean }

export function useToggleTodayCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ habitId, done }: ToggleVariables) => {
      const today = localToday()
      return done ? habitsApi.checkIn(habitId, today, today) : habitsApi.undoCheckIn(habitId, today)
    },

    // 1. Before the request is sent: update the cache right away, so the card changes instantly.
    onMutate: async ({ habitId, done }) => {
      // Stop any refetch in flight, so old data can't land on top of our optimistic change.
      await queryClient.cancelQueries({ queryKey: habitKeys.all })

      // Keep a snapshot so we can roll back if the server says no.
      const previous = queryClient.getQueriesData<Habit[]>({ queryKey: habitKeys.all })

      const today = localToday()
      queryClient.setQueriesData<Habit[]>({ queryKey: habitKeys.all }, (habits) =>
        habits?.map((h) => (h.id === habitId ? withTodayCheckIn(h, today, done) : h)),
      )

      return { previous } // becomes `context` in onError
    },

    // 2. If the request fails: put the snapshot back.
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },

    // 3. Success or failure: refetch, so the cache matches the server exactly
    //    (for example the 30-day rate, which we didn't try to guess).
    //    `void` = start the refetch but don't wait for it. If we returned the promise, the mutation
    //    would only finish (and the page's onError only run) after the refetch, including its retries,
    //    which TanStack Query pauses while the tab is in the background. The error would show late or never.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.all })
    },
  })
}
