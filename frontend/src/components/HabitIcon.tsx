import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { habitIcon } from '@/utils/habitIcons'

type HabitIconProps = {
  icon: string // a key from HABIT_ICONS, as stored by the API
  color: string // the habit's hex color
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { tile: 'size-8 rounded-lg', icon: 'size-4' },
  md: { tile: 'size-10 rounded-xl', icon: 'size-5' },
  lg: { tile: 'size-12 rounded-xl', icon: 'size-6' },
}

// The habit's icon on a soft tile in the habit's own color. The `1f` suffix on the hex color
// is its alpha channel (0x1f ≈ 12% opacity): a tint of the same color, no extra palette needed.
export function HabitIcon({ icon, color, size = 'md', className }: HabitIconProps) {
  const s = SIZES[size]
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: `${color}1f`, color }}
      className={cn('flex shrink-0 items-center justify-center', s.tile, className)}
    >
      {/* createElement instead of <Icon />: the icon component comes from a lookup table,
          and this makes it clear to the linter that we're not defining a new component per render. */}
      {createElement(habitIcon(icon), { className: s.icon, strokeWidth: 2.25 })}
    </span>
  )
}
