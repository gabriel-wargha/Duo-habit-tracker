import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'
import { habitKeys } from './habits'
import type { AcceptInviteResponse, CreateInviteResponse, InvitePreview } from './types'

// ----- Plain API calls -----
export const invitesApi = {
  create: (habitId: string) => request<CreateInviteResponse>(`/habits/${habitId}/invites`, { method: 'POST' }),
  preview: (code: string) => request<InvitePreview>(`/invites/${encodeURIComponent(code)}`),
  accept: (code: string) => request<AcceptInviteResponse>(`/invites/${encodeURIComponent(code)}/accept`, { method: 'POST' }),
  removeMember: (habitId: string, userId: string) =>
    request<void>(`/habits/${habitId}/members/${userId}`, { method: 'DELETE' }),
}

// The full link to share. window.location.origin = "http://localhost:5173" in development,
// so the link always points at wherever the app is running.
export function inviteUrl(code: string): string {
  return `${window.location.origin}/invite/${code}`
}

// ----- TanStack Query hooks -----

export function useCreateInvite() {
  return useMutation({ mutationFn: invitesApi.create })
}

// `viewer` is part of the key because the answer depends on who's asking (isMember):
// after logging in on the invite page, it's a new key, so the preview is fetched again.
export function useInvitePreview(code: string, viewer: string) {
  return useQuery({
    queryKey: ['invites', code, viewer],
    queryFn: () => invitesApi.preview(code),
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: invitesApi.accept,
    // The new habit should be on the dashboard when we get there.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

// Used both by the owner (remove a partner) and by a partner (remove themselves = leave).
export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ habitId, userId }: { habitId: string; userId: string }) => invitesApi.removeMember(habitId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}
