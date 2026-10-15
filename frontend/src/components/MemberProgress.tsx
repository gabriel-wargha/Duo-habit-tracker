import type { DayStatus, HabitStats } from '../api/types'
import { dayLabel, dotAppearance } from '../utils/days'

type MemberProgressProps = {
  name: string
  // "(you)", "(partner)"…, shown small next to the name.
  note?: string
  stats: HabitStats
  days: DayStatus[]
  color: string
  // The "together" row gets a subtle background so it stands apart from the people.
  highlight?: boolean
}

// One row on the habit detail page: a name, their numbers, and their last 30 days as dots.
// The same component draws each member and the joint "together" row, so they line up
// day by day and you can compare them at a glance.
export function MemberProgress({ name, note, stats, days, color, highlight = false }: MemberProgressProps) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-slate-100' : ''}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium text-slate-900">
          {name} {note && <span className="text-xs font-normal text-slate-500">{note}</span>}
        </p>
        <p className="flex gap-3 text-sm">
          <span className={`font-semibold ${stats.currentStreak > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
            🔥 {stats.currentStreak}
          </span>
          <span className="text-slate-500">Best {stats.longestStreak}</span>
          <span className="text-slate-500">{Math.round(stats.completionRate30 * 100)}%</span>
        </p>
      </div>

      {/* 30 equal columns that shrink with the screen, so the row fits on a phone without scrolling. */}
      <ol className="mt-2 grid grid-cols-30 gap-0.5" aria-label={`${name}, last 30 days`}>
        {days.map((day, index) => {
          const isToday = index === days.length - 1
          const label = dayLabel(day, isToday)
          const dot = dotAppearance(day, isToday, color)
          return (
            <li key={day.date} title={label} className="flex justify-center">
              <span className="sr-only">{label}</span>
              <span aria-hidden="true" style={dot.style} className={`aspect-square w-full max-w-4 rounded-full ${dot.className}`} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
