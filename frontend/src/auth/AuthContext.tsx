import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, authApi, setUnauthorizedHandler, tokenStorage } from '../api/client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../api/types'
import { AuthContext, type AuthStatus } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))
  // Bumping this re-runs the "who am I?" effect below (used by retry).
  const [attempt, setAttempt] = useState(0)

  const queryClient = useQueryClient()

  const logout = useCallback(() => {
    tokenStorage.clear()
    // Forget all cached API data, so the next person to log in on this browser
    // never sees the previous user's habits, not even for a split second.
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  // Any 401 on a logged-in request (e.g. the token expired) logs us out.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // On page load: if there's a saved token, ask the API who we are.
  useEffect(() => {
    if (!tokenStorage.get()) return

    let cancelled = false // ignore the answer if the component unmounted meanwhile
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // Only a 401 means the token is bad (and the 401 handler already logged us out).
        // No answer (status 0) or a server error (5xx) says nothing about the token: keep it.
        const serverUnreachable = error instanceof ApiError && (error.status === 0 || error.status >= 500)
        if (serverUnreachable) setStatus('offline')
        else logout()
      })
    return () => {
      cancelled = true
    }
  }, [logout, attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }, [])

  const signIn = useCallback((response: AuthResponse) => {
    tokenStorage.set(response.token)
    setUser(response.user)
    setStatus('authenticated')
  }, [])

  const login = useCallback(async (request: LoginRequest) => signIn(await authApi.login(request)), [signIn])
  const register = useCallback(async (request: RegisterRequest) => signIn(await authApi.register(request)), [signIn])

  // useMemo: consumers only re-render when one of these values actually changes.
  const value = useMemo(
    () => ({ user, status, login, register, logout, retry }),
    [user, status, login, register, logout, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
