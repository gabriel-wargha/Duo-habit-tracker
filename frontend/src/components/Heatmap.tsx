import type { CSSProperties } from 'react'
import type { HeatmapDay } from '../api/types'
import { parseLocalDate } from '../utils/days'

type HeatmapProps = {
  days: HeatmapDay[] // starts on a Sunday, ends today (see StreakCalculator.Heatmap)
  memberCount: number
  color: string
}

const ROW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] // every other row, like GitHub

function describe(day: HeatmapDay, memberCount: number): string {
  if (!day.isScheduled && day.doneCount === 0) return 'not scheduled'
  if (memberCount > 1) return `${day.doneCount} of ${memberCount} done`
  return day.doneCount > 0 ? 'done' : 'missed'
}

// A calendar heatmap: one column per week, one row per weekday (Sunday on top).
// The color gets stronger the more members did it that day: light = some of you, full = everyone.
export function Heatmap({ days, memberCount, color }: HeatmapProps) {
  // Split into weeks of 7. The last week is cut off at today, so it can be shorter.
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  // A month name above the first week that starts in a new month.
  const monthLabels = weeks.map((week, index) => {
    const month = parseLocalDate(week[0].date).getMonth()
    const previous = index > 0 ? parseLocalDate(weeks[index - 1][0].date).getMonth() : -1
    return month !== previous ? parseLocalDate(week[0].date).toLocaleDateString(undefined, { month: 'short' }) : ''
  })

  return (
    <figure>
      {/* Screen readers get a summary instead of 84 separate squares. */}
      <figcaption className="sr-only">
        Last {weeks.length} weeks: done on {days.filter((d) => d.doneCount > 0).length} of{' '}
        {days.filter((d) => d.isScheduled).length} scheduled days.
      </figcaption>

      <div className="flex gap-1" aria-hidden="true">
        <div className="mt-5 grid grid-rows-7 gap-1 pr-1 text-[10px] leading-none text-muted-foreground">
          {ROW_LABELS.map((label, i) => (
            <span key={i} className="flex h-full items-center">
              {label}
            </span>
          ))}
        </div>

        {/* Each week column is at most 16px wide, and shrinks (minmax(0, …)) to fit a phone. */}
        <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1rem))` }}>
          {weeks.map((week, w) => (
            <div key={week[0].date} className="flex flex-col gap-1">
              <span className="h-4 text-[10px] leading-4 whitespace-nowrap text-muted-foreground">{monthLabels[w]}</span>
              {week.map((day) => {
                const date = parseLocalDate(day.date)
                const label = `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${describe(day, memberCount)}`

                let style: CSSProperties | undefined
                let className = 'bg-muted-foreground/12' // scheduled, nobody did it
                if (day.doneCount > 0) {
                  className = ''
                  // 1 of 2 → 55% strength, 2 of 2 → full color.
                  const strength = 0.1 + 0.9 * (day.doneCount / Math.max(memberCount, 1))
                  style = { backgroundColor: color, opacity: strength }
                } else if (!day.isScheduled) {
                  className = 'bg-muted/60'
                }

                return <span key={day.date} title={label} style={style} className={`aspect-square rounded-sm ${className}`} />
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground" aria-hidden="true">
        <span>Less</span>
        <span className="size-3 rounded-sm bg-muted-foreground/12" />
        {memberCount > 1 && <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.55 }} />}
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        <span>{memberCount > 1 ? 'Everyone' : 'Done'}</span>
      </div>
    </figure>
  )
}
