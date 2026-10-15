import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest, User } from '../api/types'

// 'loading' = we have a token but haven't asked the API who it belongs to yet.
// Without this state, a refresh would flash the login page before /me answers.
// 'offline' = we have a token, but couldn't reach the API to check it. We keep the token
// (it's probably still fine) and let the user try again, instead of logging them out.
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'offline'

export type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
  // After 'offline': ask the API again.
  retry: () => void
}

// null by default, so useAuth can detect being used outside the provider.
// (Lives in its own file because React's fast refresh wants component files to export only components.)
export const AuthContext = createContext<AuthContextValue | null>(null)

// The custom hook every component uses: `const { user, logout } = useAuth()`.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
