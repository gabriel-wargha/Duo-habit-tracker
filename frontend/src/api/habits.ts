import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'
import type { Habit, HabitRequest } from './types'

// ----- Plain API calls -----
export const habitsApi = {
  list: () => request<Habit[]>('/habits'),
  create: (body: HabitRequest) => request<Habit>('/habits', { method: 'POST', body }),
  update: (id: string, body: HabitRequest) => request<Habit>(`/habits/${id}`, { method: 'PUT', body }),
  archive: (id: string) => request<void>(`/habits/${id}`, { method: 'DELETE' }),
}

// ----- TanStack Query hooks -----
// A query key names a piece of cached data. Every hook that uses ['habits'] shares one cache entry,
// and "invalidating" that key tells TanStack Query the data is stale and should be fetched again.
export const habitKeys = {
  all: ['habits'] as const,
}

// Query = reading data. TanStack Query fetches it, caches it, and gives us
// isPending / isError / data, so components don't need their own useEffect + useState.
export function useHabits() {
  return useQuery({
    queryKey: habitKeys.all,
    queryFn: habitsApi.list,
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
