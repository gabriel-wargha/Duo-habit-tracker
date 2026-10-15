import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useHabitDetail, useToggleTodayCheckIn } from '../api/habits'
import { useAuth } from '../auth/useAuth'
import { Heatmap } from '../components/Heatmap'
import { MemberProgress } from '../components/MemberProgress'
import { HabitDetailSkeleton } from '../components/Skeleton'
import { describeSchedule } from '../utils/schedule'

// /habits/:id – everyone's last 30 days side by side, plus the "together" row.
export function HabitDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const detail = useHabitDetail(id)
  const toggleToday = useToggleTodayCheckIn()

  if (detail.isPending) return <HabitDetailSkeleton />

  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404
    return (
      <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {notFound ? "This habit doesn't exist, or you're not tracking it." : `Couldn't load this habit: ${detail.error.message}`}{' '}
        <Link to="/" className="font-medium underline">
          Back to your habits
        </Link>
      </div>
    )
  }

  const { habit, progress, joint, heatmap } = detail.data
  const doneToday = habit.stats.doneToday

  return (
    <section className="flex flex-col gap-6">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← All habits
      </Link>

      <div
        style={{ borderLeftColor: habit.color }}
        className="flex items-start gap-3 rounded-2xl border border-l-8 border-slate-200 bg-white p-4 shadow-sm"
      >
        <span className="text-4xl" aria-hidden="true">
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900">{habit.name}</h1>
          {habit.description && <p className="text-sm text-slate-500">{habit.description}</p>}
          <p className="text-xs text-slate-500">{describeSchedule(habit.scheduleDays)}</p>
        </div>
        {/* No optimistic update here: the button waits for the server, then the page refetches. */}
        <button
          type="button"
          onClick={() => toggleToday.mutate({ habitId: habit.id, done: !doneToday })}
          disabled={toggleToday.isPending}
          aria-pressed={doneToday}
          aria-label={doneToday ? `Undo ${habit.name} for today` : `Mark ${habit.name} done for today`}
          style={doneToday ? { backgroundColor: habit.color, borderColor: habit.color } : { borderColor: habit.color }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-xl disabled:opacity-60 ${
            doneToday ? 'text-white' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          ✓
        </button>
      </div>

      {toggleToday.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't update today: {toggleToday.error.message}
        </p>
      )}

      {joint && (
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-sm text-slate-300">Together</p>
          <p className="text-3xl font-bold">🤝 {joint.stats.currentStreak} day{joint.stats.currentStreak === 1 ? '' : 's'}</p>
          <p className="text-sm text-slate-300">
            {joint.stats.doneToday ? 'Everyone is done today 🎉' : 'Not everyone is done today yet'} · best together{' '}
            {joint.stats.longestStreak}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-slate-700">Last 12 weeks</h2>
        <Heatmap days={heatmap} memberCount={progress.length} color={habit.color} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <h2 className="px-3 pt-2 text-sm font-medium text-slate-700">Last 30 days</h2>
        {progress.map((member) => (
          <MemberProgress
            key={member.userId}
            name={member.displayName}
            note={member.userId === user?.id ? '(you)' : member.role === 'Owner' ? '(owner)' : '(partner)'}
            stats={member.stats}
            days={member.last30Days}
            color={habit.color}
          />
        ))}
        {joint && (
          <MemberProgress
            name="Together"
            note="(days you all did it)"
            stats={joint.stats}
            days={joint.last30Days}
            color={habit.color}
            highlight
          />
        )}
        <p className="px-3 pt-1 pb-2 text-xs text-slate-500">
          Updates every 30 seconds. Faint dots are days that didn't count: not scheduled, or before someone joined.
        </p>
      </div>
    </section>
  )
}
