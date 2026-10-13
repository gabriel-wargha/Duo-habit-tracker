import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, setUnauthorizedHandler, tokenStorage } from '../api/client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../api/types'
import { AuthContext, type AuthStatus } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))

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
      .catch(() => {
        // Invalid/expired token (the 401 handler already cleared it) or API down.
        if (!cancelled) logout()
      })
    return () => {
      cancelled = true
    }
  }, [logout])

  const signIn = useCallback((response: AuthResponse) => {
    tokenStorage.set(response.token)
    setUser(response.user)
    setStatus('authenticated')
  }, [])

  const login = useCallback(async (request: LoginRequest) => signIn(await authApi.login(request)), [signIn])
  const register = useCallback(async (request: RegisterRequest) => signIn(await authApi.register(request)), [signIn])

  // useMemo: consumers only re-render when one of these values actually changes.
  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
