import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { DEMO_LOGIN } from '../utils/demo'

const FEATURES = [
  { emoji: '✅', title: 'One tap a day', text: 'Pick the days that matter, then check in with a single tap.' },
  { emoji: '🔥', title: 'Streaks that are fair', text: "Rest days don't break your streak, and today isn't missed until it's over." },
  { emoji: '🤝', title: 'Better together', text: 'Invite a friend with a link. See each other’s progress and build a joint streak.' },
]

// /welcome – what a logged-out visitor sees first.
export function LandingPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'error'>('idle')

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function tryDemo() {
    setDemoState('loading')
    try {
      await login(DEMO_LOGIN)
      navigate('/', { replace: true })
    } catch {
      setDemoState('error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <span className="text-lg font-bold text-slate-900">Habit Tracker</span>
        <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
          Log in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-10 pb-16">
        <section className="text-center">
          <p className="text-5xl" aria-hidden="true">
            🏃📚💧
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
            Build habits together
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-slate-600">
            Track your daily habits, keep your streaks alive, and share them with a friend, so you keep each other going.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register" className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700">
              Get started, it's free
            </Link>
            <button
              type="button"
              onClick={tryDemo}
              disabled={demoState === 'loading'}
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              {demoState === 'loading' ? 'Opening the demo…' : 'Try the demo'}
            </button>
          </div>
          {demoState === 'error' && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              The demo isn't available right now. Please create an account instead.
            </p>
          )}
        </section>

        <section aria-labelledby="features" className="mt-16">
          <h2 id="features" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-3xl" aria-hidden="true">
                  {feature.emoji}
                </p>
                <h3 className="mt-2 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
