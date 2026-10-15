import type { DayStatus } from '../api/types'
import { cn } from '@/lib/utils'
import { dayLabel, dotAppearance, parseLocalDate } from '../utils/days'

type WeekDotsProps = {
  days: DayStatus[]
  color: string
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // index = Date.getDay(), 0 = Sunday

// The last 7 days as dots, oldest on the left and today on the right.
// See utils/days.ts for what each dot style means.
export function WeekDots({ days, color }: WeekDotsProps) {
  return (
    <ol className="flex gap-1.5" aria-label="Last 7 days">
      {days.map((day, index) => {
        const isToday = index === days.length - 1
        const label = dayLabel(day, isToday)
        const dot = dotAppearance(day, isToday, color)

        return (
          <li key={day.date} className="flex flex-col items-center gap-1" title={label}>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" style={dot.style} className={cn('size-4 rounded-full', dot.className)} />
            <span
              aria-hidden="true"
              className={cn('text-[10px] leading-none', isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')}
            >
              {LETTERS[parseLocalDate(day.date).getDay()]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
