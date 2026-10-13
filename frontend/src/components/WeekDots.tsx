import type { CSSProperties } from 'react'
import type { DayStatus } from '../api/types'

type WeekDotsProps = {
  days: DayStatus[]
  color: string
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // index = Date.getDay(), 0 = Sunday

// "2026-10-13" → a Date at local midnight. (new Date("2026-10-13") would be UTC midnight,
// which is still the 12th in the Americas.)
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function describe(day: DayStatus, isToday: boolean): string {
  if (day.isDone) return 'done'
  if (!day.isScheduled) return 'not scheduled'
  return isToday ? 'not done yet' : 'missed'
}

// The last 7 days as dots, oldest on the left and today on the right:
//   filled = done · outline = missed · dashed = today, still open · faint = not scheduled
export function WeekDots({ days, color }: WeekDotsProps) {
  return (
    <ol className="flex gap-1.5" aria-label="Last 7 days">
      {days.map((day, index) => {
        const date = parseLocalDate(day.date)
        const isToday = index === days.length - 1
        const label = `${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${describe(day, isToday)}`

        let dotClass = 'border-2 border-slate-300' // missed
        let dotStyle: CSSProperties | undefined
        if (day.isDone) {
          dotClass = ''
          dotStyle = { backgroundColor: color }
        } else if (!day.isScheduled) {
          dotClass = 'scale-50 bg-slate-200'
        } else if (isToday) {
          dotClass = 'border-2 border-dashed'
          dotStyle = { borderColor: color }
        }

        return (
          <li key={day.date} className="flex flex-col items-center gap-0.5" title={label}>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" style={dotStyle} className={`h-5 w-5 rounded-full ${dotClass}`} />
            <span
              aria-hidden="true"
              className={`text-[10px] ${isToday ? 'font-bold text-slate-700' : 'text-slate-400'}`}
            >
              {LETTERS[date.getDay()]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
