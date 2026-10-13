import { useAuth } from '../auth/useAuth'

// Empty for now: block 6 fills this with the user's habits.
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Hi, {user?.displayName} 👋</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium text-slate-700">No habits yet</p>
        <p className="mt-1 text-sm text-slate-500">Soon you'll be able to create your first habit here.</p>
      </div>
    </section>
  )
}
