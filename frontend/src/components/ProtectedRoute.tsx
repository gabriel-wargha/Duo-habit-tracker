import { Navigate, Outlet, useLocation } from 'react-router'
import { LoaderCircle, RotateCw, WifiOff } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { Button } from '@/components/ui/button'
import { StatusScreen } from './StatusScreen'

// Wraps every page that needs a logged-in user (see App.tsx).
// Note: this is for user experience only. The real protection is the API returning 401.
export function ProtectedRoute() {
  const { status, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div role="status" className="flex min-h-svh items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  if (status === 'offline') {
    return (
      <StatusScreen
        icon={WifiOff}
        title="Can't reach the server"
        action={
          <Button size="lg" onClick={retry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
        }
      >
        Check your connection. You're still logged in.
      </StatusScreen>
    )
  }

  if (status === 'anonymous') {
    // Someone opening the app's home page without an account sees the landing page;
    // a deep link (like /habits/123) goes to login, which brings them back afterwards.
    if (location.pathname === '/') return <Navigate to="/welcome" replace />

    // Remember where the user wanted to go, so login can send them back there.
    // `replace` swaps this history entry, so the Back button doesn't bounce back here.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Logged in: render the matching child route.
  return <Outlet />
}
