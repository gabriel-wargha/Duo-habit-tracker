import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest, User } from '../api/types'

// 'loading' = we have a token but haven't asked the API who it belongs to yet.
// Without this state, a refresh would flash the login page before /me answers.
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
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
