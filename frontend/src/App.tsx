import { useEffect, useState } from 'react'

// The shape of the JSON that GET /api/health returns.
type HealthResponse = {
  status: string
  message: string
  timeUtc: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Runs once after the first render ([] = no dependencies).
  useEffect(() => {
    // A relative URL: Vite's proxy forwards it to the API on port 5080.
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        return res.json() as Promise<HealthResponse>
      })
      .then(setHealth)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error')
      })
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4">
      <h1 className="text-3xl font-bold text-slate-900">Habit Tracker</h1>

      {/* Three possible states: loading, error, success. */}
      {!health && !error && <p className="text-slate-500">Checking the API…</p>}

      {error && (
        <p className="rounded-lg bg-red-100 px-4 py-2 text-red-700">
          Could not reach the API: {error}
        </p>
      )}

      {health && (
        <p className="rounded-lg bg-green-100 px-4 py-2 text-green-800">
          ✅ {health.message}
        </p>
      )}
    </main>
  )
}

export default App
