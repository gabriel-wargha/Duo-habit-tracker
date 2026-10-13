import { useState } from 'react'
import type { Habit } from '../api/types'
import { WEEKDAYS, describeSchedule, isScheduledOn } from '../utils/schedule'

type HabitCardProps = {
  habit: Habit
  onEdit: (habit: Habit) => void
  onArchive: (habit: Habit) => Promise<void>
}

// Shows one habit. It doesn't call the API itself: the parent passes in what Edit and Archive do,
// so the same card can be reused anywhere (dashboard today, a partner view in block 9).
export function HabitCard({ habit, onEdit, onArchive }: HabitCardProps) {
  // Archiving asks for confirmation inline instead of window.confirm(), which blocks the whole page.
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOwner = habit.role === 'Owner'

  async function archive() {
    setArchiving(true)
    setError(null)
    try {
      await onArchive(habit)
      // Success: the list refetches and this card disappears, so there's nothing to reset.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive this habit.')
      setArchiving(false)
      setConfirming(false)
    }
  }

  return (
    <article
      // The habit's color as a left accent stripe. Inline style because Tailwind can't know
      // user-picked colors at build time.
      style={{ borderLeftColor: habit.color }}
      className="flex flex-col gap-3 rounded-2xl border border-l-8 border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden="true">
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-slate-900">{habit.name}</h2>
          {habit.description && <p className="truncate text-sm text-slate-500">{habit.description}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* The 7 days, with scheduled ones filled in the habit's color. */}
        <div className="flex gap-1" aria-label={`Scheduled: ${describeSchedule(habit.scheduleDays)}`}>
          {WEEKDAYS.map(({ day, letter }) => {
            const on = isScheduledOn(habit.scheduleDays, day)
            return (
              <span
                key={day}
                aria-hidden="true"
                style={on ? { backgroundColor: habit.color } : undefined}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                  on ? 'text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {letter}
              </span>
            )
          })}
        </div>

        {/* Only the owner may change a habit; the API enforces this too (403). */}
        {isOwner &&
          (confirming ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Archive?</span>
              <button
                type="button"
                onClick={archive}
                disabled={archiving}
                className="rounded-lg bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {archiving ? 'Archiving…' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100"
              >
                No
              </button>
            </div>
          ) : (
            <div className="flex gap-1 text-sm">
              <button
                type="button"
                onClick={() => onEdit(habit)}
                className="rounded-lg px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg px-2.5 py-1 font-medium text-slate-500 hover:bg-slate-100"
              >
                Archive
              </button>
            </div>
          ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </article>
  )
}
