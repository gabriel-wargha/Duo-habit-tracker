import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'

// Wraps every page that needs a logged-in user (see App.tsx).
// Note: this is for user experience only. The real protection is the API returning 401.
export function ProtectedRoute() {
  const { status, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <p role="status" className="p-8 text-center text-slate-500">
        Loading…
      </p>
    )
  }

  if (status === 'offline') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div role="alert" className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl" aria-hidden="true">
            📡
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-900">Can't reach the server</h1>
          <p className="mt-1 text-sm text-slate-500">Check your connection. You're still logged in.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Try again
          </button>
        </div>
      </main>
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
