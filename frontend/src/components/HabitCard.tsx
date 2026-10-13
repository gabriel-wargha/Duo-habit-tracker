import { useState } from 'react'
import type { Habit } from '../api/types'
import { describeSchedule } from '../utils/schedule'
import { WeekDots } from './WeekDots'

type HabitCardProps = {
  habit: Habit
  onEdit: (habit: Habit) => void
  onArchive: (habit: Habit) => Promise<void>
  // Check in (done = true) or undo (done = false) for today.
  onToggleToday: (habit: Habit, done: boolean) => void
}

// Shows one habit. It doesn't call the API itself: the parent passes in what Edit and Archive do,
// so the same card can be reused anywhere (dashboard today, a partner view in block 9).
export function HabitCard({ habit, onEdit, onArchive, onToggleToday }: HabitCardProps) {
  // Archiving asks for confirmation inline instead of window.confirm(), which blocks the whole page.
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOwner = habit.role === 'Owner'
  const { stats } = habit
  // Today can be unscheduled: you can still check in (a bonus), it just doesn't count for the streak.
  const todayScheduled = stats.last7Days.at(-1)?.isScheduled ?? false

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
          <p className="text-xs text-slate-400">{describeSchedule(habit.scheduleDays)}</p>
        </div>

        {/* The main action: one tap to check in, another to undo. aria-pressed makes it a toggle
            for screen readers. The cache updates before the server answers (see useToggleTodayCheckIn). */}
        <button
          type="button"
          onClick={() => onToggleToday(habit, !stats.doneToday)}
          aria-pressed={stats.doneToday}
          aria-label={stats.doneToday ? `Undo ${habit.name} for today` : `Mark ${habit.name} done for today`}
          style={stats.doneToday ? { backgroundColor: habit.color, borderColor: habit.color } : { borderColor: habit.color }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-xl transition-transform active:scale-90 ${
            stats.doneToday ? 'text-white' : 'text-slate-300 hover:bg-slate-50'
          }`}
        >
          ✓
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span
          className={`font-semibold ${stats.currentStreak > 0 ? 'text-orange-600' : 'text-slate-400'}`}
          aria-label={`Current streak: ${stats.currentStreak} days`}
        >
          🔥 {stats.currentStreak}
        </span>
        <span className="text-slate-500">Best {stats.longestStreak}</span>
        <span className="text-slate-500">{Math.round(stats.completionRate30 * 100)}% · 30 days</span>
        {!todayScheduled && <span className="text-xs text-slate-400">Rest day</span>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <WeekDots days={stats.last7Days} color={habit.color} />

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
