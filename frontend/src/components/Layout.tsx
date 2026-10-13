import { Link, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

// The frame around every logged-in page: a header, then the page itself (<Outlet />).
export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-slate-900">
            Habit Tracker
          </Link>
          <div className="flex items-center gap-3">
            <span className="truncate text-sm text-slate-600">{user?.displayName}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
