import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Grey placeholder shapes shown while data loads, built from shadcn's Skeleton (a pulsing block).
// They have the same size as the real content, so nothing jumps around when it arrives.

export function HabitCardSkeleton() {
  return (
    <Card className="gap-4">
      <div className="flex items-start gap-3 px-4">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="mx-4 h-4 w-1/2" />
      <div className="border-t px-4 pt-3">
        <Skeleton className="h-7 w-44" />
      </div>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2">
      <span className="sr-only">Loading your habits…</span>
      {[0, 1, 2, 3].map((i) => (
        <HabitCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function HabitDetailSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading habit…</span>
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}
