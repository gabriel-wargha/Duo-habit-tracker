import { Flame, Trophy } from 'lucide-react'
import type { DayStatus, HabitStats } from '../api/types'
import { cn } from '@/lib/utils'
import { dayLabel, dotAppearance } from '../utils/days'

type MemberProgressProps = {
  name: string
  // "You", "Partner"…, shown small next to the name.
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
    <div className={cn('rounded-lg p-3', highlight && 'bg-muted/60')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">
          {name} {note && <span className="text-xs font-normal text-muted-foreground">{note}</span>}
        </p>
        <p className="flex items-center gap-3 text-sm">
          <span
            className={cn('flex items-center gap-1 font-semibold', stats.currentStreak > 0 ? 'text-orange-600' : 'text-muted-foreground')}
            aria-label={`Current streak: ${stats.currentStreak} days`}
          >
            <Flame className="size-3.5" aria-hidden="true" />
            {stats.currentStreak}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground" aria-label={`Best streak: ${stats.longestStreak} days`}>
            <Trophy className="size-3.5" aria-hidden="true" />
            {stats.longestStreak}
          </span>
          <span className="text-muted-foreground">{Math.round(stats.completionRate30 * 100)}%</span>
        </p>
      </div>

      {/* 30 equal columns that shrink with the screen, so the row fits on a phone without scrolling. */}
      <ol className="mt-2.5 grid grid-cols-30 gap-0.5" aria-label={`${name}, last 30 days`}>
        {days.map((day, index) => {
          const isToday = index === days.length - 1
          const label = dayLabel(day, isToday)
          const dot = dotAppearance(day, isToday, color)
          return (
            <li key={day.date} title={label} className="flex justify-center">
              <span className="sr-only">{label}</span>
              <span aria-hidden="true" style={dot.style} className={cn('aspect-square w-full max-w-3.5 rounded-full', dot.className)} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
