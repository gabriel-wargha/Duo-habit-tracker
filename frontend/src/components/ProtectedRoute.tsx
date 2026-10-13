import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'

// Wraps every page that needs a logged-in user (see App.tsx).
// Note: this is for user experience only. The real protection is the API returning 401.
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <p className="p-8 text-center text-slate-500">Loading…</p>
  }

  if (status === 'anonymous') {
    // Remember where the user wanted to go, so login can send them back there.
    // `replace` swaps this history entry, so the Back button doesn't bounce back here.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Logged in: render the matching child route.
  return <Outlet />
}
