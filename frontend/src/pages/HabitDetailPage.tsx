import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Check, Flame, Trophy, Users } from 'lucide-react'
import { ApiError } from '../api/client'
import { useHabitDetail, useToggleTodayCheckIn } from '../api/habits'
import { useAuth } from '../auth/useAuth'
import { HabitIcon } from '../components/HabitIcon'
import { Heatmap } from '../components/Heatmap'
import { MemberProgress } from '../components/MemberProgress'
import { HabitDetailSkeleton } from '../components/Skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { describeSchedule } from '../utils/schedule'

// /habits/:id – everyone's last 30 days side by side, the "together" row, and a 12-week heatmap.
export function HabitDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const detail = useHabitDetail(id)
  const toggleToday = useToggleTodayCheckIn()

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
      <Link to="/">
        <ArrowLeft data-icon="inline-start" />
        All habits
      </Link>
    </Button>
  )

  if (detail.isPending) return <HabitDetailSkeleton />

  if (detail.isError) {
    const notFound = detail.error instanceof ApiError && detail.error.status === 404
    return (
      <section className="flex flex-col gap-4">
        {backLink}
        <Alert variant="destructive">
          <AlertDescription>
            {notFound ? "This habit doesn't exist, or you're not tracking it." : `Couldn't load this habit: ${detail.error.message}`}
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const { habit, progress, joint, heatmap } = detail.data
  const doneToday = habit.stats.doneToday

  return (
    <section className="flex flex-col gap-6">
      {backLink}

      {/* flex-wrap: on a phone the button drops below the title instead of squeezing it. */}
      <div className="flex flex-wrap items-center gap-4">
        <HabitIcon icon={habit.icon} color={habit.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{habit.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {describeSchedule(habit.scheduleDays)}
            {habit.description && <> · {habit.description}</>}
          </p>
        </div>
        {/* No optimistic update here: the button waits for the server, then the page refetches. */}
        <Button
          size="lg"
          variant={doneToday ? 'default' : 'outline'}
          disabled={toggleToday.isPending}
          aria-pressed={doneToday}
          onClick={() =>
            toggleToday.mutate(
              { habitId: habit.id, done: !doneToday },
              { onError: (error) => toast.error("Couldn't update today", { description: error.message }) },
            )
          }
          style={doneToday ? { backgroundColor: habit.color } : undefined}
          className={cn('w-full sm:w-auto', doneToday && 'text-white hover:opacity-90')}
        >
          <Check data-icon="inline-start" strokeWidth={3} />
          {doneToday ? 'Done today' : 'Mark done'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Flame className="size-4 text-orange-600" />}
          label="Your streak"
          value={habit.stats.currentStreak}
          hint={`Best ${habit.stats.longestStreak}`}
        />
        {joint ? (
          <StatCard
            icon={<Users className="size-4" />}
            label="Together"
            value={joint.stats.currentStreak}
            hint={joint.stats.doneToday ? 'Everyone is done today' : 'Not everyone is done today'}
          />
        ) : (
          <StatCard
            icon={<Trophy className="size-4 text-amber-500" />}
            label="Best streak"
            value={habit.stats.longestStreak}
            hint="Your record"
          />
        )}
        <StatCard
          icon={<Check className="size-4 text-emerald-600" />}
          label="Last 30 days"
          value={`${Math.round(habit.stats.completionRate30 * 100)}%`}
          hint="of scheduled days done"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 12 weeks</CardTitle>
          <CardDescription>
            {progress.length > 1 ? 'Darker means more of you did it that day.' : 'Every square is a day.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap days={heatmap} memberCount={progress.length} color={habit.color} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last 30 days</CardTitle>
          <CardDescription>Updates every 30 seconds. Faint dots didn't count: not scheduled, or before someone joined.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-2">
          {progress.map((member) => (
            <MemberProgress
              key={member.userId}
              name={member.displayName}
              note={member.userId === user?.id ? 'You' : member.role === 'Owner' ? 'Owner' : 'Partner'}
              stats={member.stats}
              days={member.last30Days}
              color={habit.color}
            />
          ))}
          {joint && (
            <MemberProgress
              name="Together"
              note="days you all did it"
              stats={joint.stats}
              days={joint.last30Days}
              color={habit.color}
              highlight
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}

type StatCardProps = { icon: ReactNode; label: string; value: number | string; hint: string }

function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {icon}
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
