import type { CSSProperties } from 'react'
import type { DayStatus } from '../api/types'

// "2026-10-13" → a Date at local midnight. (new Date("2026-10-13") would be UTC midnight,
// which is still the 12th in the Americas.)
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function describeDay(day: DayStatus, isToday: boolean): string {
  if (day.isDone) return 'done'
  if (!day.isScheduled) return 'not scheduled'
  return isToday ? 'not done yet' : 'missed'
}

// "Tuesday, Oct 13: done" – for tooltips and screen readers.
export function dayLabel(day: DayStatus, isToday: boolean): string {
  const date = parseLocalDate(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  return `${date}: ${describeDay(day, isToday)}`
}

// How a day's dot looks, shared by the 7-day strip and the 30-day rows:
//   filled = done · outline = missed · dashed = today, still open · faint = not scheduled
export function dotAppearance(day: DayStatus, isToday: boolean, color: string): { className: string; style?: CSSProperties } {
  if (day.isDone) return { className: '', style: { backgroundColor: color } }
  if (!day.isScheduled) return { className: 'scale-[0.35] bg-muted-foreground/25' }
  if (isToday) return { className: 'border-2 border-dashed', style: { borderColor: color } }
  return { className: 'border-2 border-muted-foreground/25' }
}
