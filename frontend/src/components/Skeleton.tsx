// Grey placeholder shapes shown while data loads. They have the same size as the real content,
// so nothing jumps around when it arrives, and the page feels faster than a "Loading…" line.
// motion-safe: the pulse is skipped for people who turned on "reduce motion" in their OS.

function Bar({ className }: { className: string }) {
  return <span className={`block rounded bg-slate-200 motion-safe:animate-pulse ${className}`} />
}

export function HabitCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-l-8 border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Bar className="h-9 w-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Bar className="h-4 w-2/3" />
          <Bar className="h-3 w-1/3" />
        </div>
        <Bar className="h-12 w-12 rounded-full" />
      </div>
      <Bar className="h-4 w-1/2" />
      <Bar className="h-5 w-48" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div role="status" className="grid gap-3 sm:grid-cols-2">
      <span className="sr-only">Loading your habits…</span>
      {[0, 1, 2, 3].map((i) => (
        <HabitCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function HabitDetailSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading habit…</span>
      <Bar className="h-4 w-24" />
      <HabitCardSkeleton />
      <Bar className="h-40 w-full rounded-2xl" />
      <Bar className="h-48 w-full rounded-2xl" />
    </div>
  )
}
