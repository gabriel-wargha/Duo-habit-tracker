import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Archive, Check, Ellipsis, Flame, LogOut, Moon, Pencil, Trophy, UserPlus, Users } from 'lucide-react'
import type { Habit } from '../api/types'
import { useAuth } from '../auth/useAuth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { describeSchedule } from '../utils/schedule'
import { HabitIcon } from './HabitIcon'
import { MemberAvatars } from './MemberAvatars'
import { WeekDots } from './WeekDots'

type HabitCardProps = {
  habit: Habit
  onEdit: (habit: Habit) => void
  onArchive: (habit: Habit) => Promise<void>
  onShare: (habit: Habit) => void
  onLeave: (habit: Habit) => Promise<void>
  // Check in (done = true) or undo (done = false) for today.
  onToggleToday: (habit: Habit, done: boolean) => void
}

// One habit on the dashboard. It doesn't call the API itself: the parent passes in what each
// action does, so the card stays a pure "display + buttons" component.
export function HabitCard({ habit, onEdit, onArchive, onShare, onLeave, onToggleToday }: HabitCardProps) {
  const { user } = useAuth()
  // Archiving and leaving ask first, in an AlertDialog: a modal that must be answered.
  const [confirming, setConfirming] = useState<'archive' | 'leave' | null>(null)
  const [working, setWorking] = useState(false)
  const isOwner = habit.role === 'Owner'
  const { stats } = habit
  // Today can be unscheduled: you can still check in (a bonus), it just doesn't count for the streak.
  const todayScheduled = stats.last7Days.at(-1)?.isScheduled ?? false
  const owner = habit.members.find((m) => m.role === 'Owner')
  const partners = habit.members.filter((m) => m.role === 'Partner')
  // Everyone except you: their avatars get a check badge when they've finished today.
  const others = habit.members.filter((m) => m.userId !== user?.id)

  async function confirm() {
    setWorking(true)
    try {
      await (confirming === 'leave' ? onLeave(habit) : onArchive(habit))
      toast.success(confirming === 'leave' ? `You left "${habit.name}".` : `"${habit.name}" archived.`)
      // Success: the list refetches and this card disappears, so there's nothing to reset.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
      setWorking(false)
      setConfirming(null)
    }
  }

  return (
    <Card className="gap-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 px-4">
        <HabitIcon icon={habit.icon} color={habit.color} />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base leading-tight font-semibold">
            {/* The name opens the detail page with everyone's progress side by side. */}
            <Link to={`/habits/${habit.id}`} className="hover:underline">
              {habit.name}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {describeSchedule(habit.scheduleDays)}
            {habit.description && <> · {habit.description}</>}
          </p>
        </div>

        {/* The main action: one tap to check in, another to undo. aria-pressed makes it a toggle
            for screen readers. The cache updates before the server answers (see useToggleTodayCheckIn). */}
        <button
          type="button"
          onClick={() => onToggleToday(habit, !stats.doneToday)}
          aria-pressed={stats.doneToday}
          aria-label={stats.doneToday ? `Undo ${habit.name} for today` : `Mark ${habit.name} done for today`}
          style={stats.doneToday ? { backgroundColor: habit.color, borderColor: habit.color } : { borderColor: `${habit.color}66` }}
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90',
            stats.doneToday ? 'text-white shadow-sm' : 'text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground',
          )}
        >
          <Check className="size-5" strokeWidth={3} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 text-sm *:whitespace-nowrap">
        <span
          className={cn('flex items-center gap-1 font-semibold', stats.currentStreak > 0 ? 'text-orange-600' : 'text-muted-foreground')}
          aria-label={`Current streak: ${stats.currentStreak} days`}
        >
          <Flame className="size-4" aria-hidden="true" />
          {stats.currentStreak}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground" aria-label={`Best streak: ${stats.longestStreak} days`}>
          <Trophy className="size-3.5" aria-hidden="true" />
          {stats.longestStreak}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="text-muted-foreground">
              {Math.round(stats.completionRate30 * 100)}%
            </span>
          </TooltipTrigger>
          <TooltipContent>Done on {Math.round(stats.completionRate30 * 100)}% of scheduled days, last 30 days</TooltipContent>
        </Tooltip>
        {habit.jointStreak !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="flex items-center gap-1 font-semibold text-foreground">
                <Users className="size-3.5" aria-hidden="true" />
                {habit.jointStreak}
              </span>
            </TooltipTrigger>
            <TooltipContent>Joint streak: {habit.jointStreak} days you all did it</TooltipContent>
          </Tooltip>
        )}
        {!todayScheduled && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Moon className="size-3" aria-hidden="true" />
            Rest day
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-3 border-t px-4 pt-3">
        <WeekDots days={stats.last7Days} color={habit.color} />

        <div className="flex items-center gap-2">
          {others.length > 0 ? (
            <MemberAvatars members={others} color={habit.color} />
          ) : (
            isOwner && (
              <Button variant="ghost" size="sm" onClick={() => onShare(habit)} className="text-muted-foreground">
                <UserPlus data-icon="inline-start" />
                Invite
              </Button>
            )
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${habit.name}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {isOwner ? (
                // Only the owner may change a habit; the API enforces this too (403).
                <>
                  <DropdownMenuItem onSelect={() => onShare(habit)}>
                    <UserPlus />
                    {partners.length > 0 ? 'Manage sharing' : 'Invite a partner'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(habit)}>
                    <Pencil />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirming('archive')}>
                    <Archive />
                    Archive
                  </DropdownMenuItem>
                </>
              ) : (
                // Partners can't edit or archive, but they can leave.
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirming('leave')}>
                  <LogOut />
                  Leave habit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isOwner && owner && (
        <p className="-mt-1 px-4 text-xs text-muted-foreground">Shared by {owner.displayName}</p>
      )}

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && !working && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming === 'leave' ? `Leave "${habit.name}"?` : `Archive "${habit.name}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming === 'leave'
                ? `It disappears from your dashboard. ${owner?.displayName ?? 'The owner'} can invite you again later.`
                : 'It disappears from your dashboard, and partners stop seeing it. Your check-in history is kept.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={working}
              // preventDefault keeps the dialog open while the request runs.
              onClick={(event) => {
                event.preventDefault()
                void confirm()
              }}
            >
              {working ? 'Working…' : confirming === 'leave' ? 'Leave' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
