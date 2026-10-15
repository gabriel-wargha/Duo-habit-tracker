import { Repeat2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// The app's mark: a "repeat" icon on a dark tile, plus the name. Used in every header.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Repeat2 className="size-4" strokeWidth={2.5} aria-hidden="true" />
      </span>
      Habit Tracker
    </span>
  )
}
