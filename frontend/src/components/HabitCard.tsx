import { useState } from 'react'
import { Link } from 'react-router'
import type { Habit } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { describeSchedule } from '../utils/schedule'
import { MemberAvatars } from './MemberAvatars'
import { WeekDots } from './WeekDots'

type HabitCardProps = {
  habit: Habit
  onEdit: (habit: Habit) => void
  onArchive: (habit: Habit) => Promise<void>
  onShare: (habit: Habit) => void
  onLeave: (habit: Habit) => Promise<void>
  // Check in (done = true) or undo (done = false) for today.
  onToggleToday: (habit: Habit, done: boolean) => void
}

// Shows one habit. It doesn't call the API itself: the parent passes in what Edit and Archive do,
// so the same card can be reused anywhere (dashboard today, a partner view in block 9).
export function HabitCard({ habit, onEdit, onArchive, onShare, onLeave, onToggleToday }: HabitCardProps) {
  // Archiving and leaving ask for confirmation inline instead of window.confirm(), which blocks the whole page.
  const { user } = useAuth()
  const [confirming, setConfirming] = useState<'archive' | 'leave' | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOwner = habit.role === 'Owner'
  const { stats } = habit
  // Today can be unscheduled: you can still check in (a bonus), it just doesn't count for the streak.
  const todayScheduled = stats.last7Days.at(-1)?.isScheduled ?? false
  const owner = habit.members.find((m) => m.role === 'Owner')
  const partners = habit.members.filter((m) => m.role === 'Partner')
  // Everyone except you: their avatars get a ✅ when they've finished today.
  const others = habit.members.filter((m) => m.userId !== user?.id)

  async function confirm() {
    setWorking(true)
    setError(null)
    try {
      await (confirming === 'leave' ? onLeave(habit) : onArchive(habit))
      // Success: the list refetches and this card disappears, so there's nothing to reset.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setWorking(false)
      setConfirming(null)
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
          <h2 className="truncate font-semibold text-slate-900">
            {/* The name opens the detail page with everyone's progress side by side. */}
            <Link to={`/habits/${habit.id}`} className="hover:underline">
              {habit.name}
            </Link>
          </h2>
          {habit.description && <p className="truncate text-sm text-slate-500">{habit.description}</p>}
          <p className="text-xs text-slate-500">{describeSchedule(habit.scheduleDays)}</p>
          {/* Who you're tracking with: owners see their partner, partners see the owner. */}
          {isOwner && partners.length > 0 && (
            <p className="mt-0.5 text-xs font-medium text-slate-600">👥 with {partners.map((p) => p.displayName).join(', ')}</p>
          )}
          {!isOwner && owner && <p className="mt-0.5 text-xs font-medium text-slate-600">👥 shared by {owner.displayName}</p>}
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
            stats.doneToday ? 'text-white' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          ✓
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm *:whitespace-nowrap">
        <span
          className={`font-semibold ${stats.currentStreak > 0 ? 'text-orange-600' : 'text-slate-500'}`}
          aria-label={`Current streak: ${stats.currentStreak} days`}
        >
          🔥 {stats.currentStreak}
        </span>
        <span className="text-slate-500">Best {stats.longestStreak}</span>
        <span className="text-slate-500">{Math.round(stats.completionRate30 * 100)}% · 30 days</span>
        {!todayScheduled && <span className="text-xs text-slate-500">Rest day</span>}
        {habit.jointStreak !== null && (
          <span className="font-semibold text-slate-700" aria-label={`Joint streak: ${habit.jointStreak} days`}>
            🤝 {habit.jointStreak}
          </span>
        )}
        {others.length > 0 && (
          <span className="ml-auto">
            <MemberAvatars members={others} color={habit.color} />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <WeekDots days={stats.last7Days} color={habit.color} />

        {confirming ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">{confirming === 'leave' ? 'Leave?' : 'Archive?'}</span>
            <button
              type="button"
              onClick={confirm}
              disabled={working}
              className="rounded-lg bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {working ? '…' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100"
            >
              No
            </button>
          </div>
        ) : isOwner ? (
          // Only the owner may change a habit; the API enforces this too (403).
          <div className="flex gap-1 text-sm">
            <button
              type="button"
              onClick={() => onShare(habit)}
              className="rounded-lg px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => onEdit(habit)}
              className="rounded-lg px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirming('archive')}
              className="rounded-lg px-2.5 py-1 font-medium text-slate-500 hover:bg-slate-100"
            >
              Archive
            </button>
          </div>
        ) : (
          // Partners can't edit or archive, but they can leave.
          <button
            type="button"
            onClick={() => setConfirming('leave')}
            className="rounded-lg px-2.5 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Leave
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </article>
  )
}
