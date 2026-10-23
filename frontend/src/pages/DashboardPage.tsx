import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, RotateCw, Sprout } from 'lucide-react'
import { useArchiveHabit, useCreateHabit, useHabits, useToggleTodayCheckIn, useUpdateHabit } from '../api/habits'
import { useRemoveMember } from '../api/invites'
import type { Habit, HabitRequest } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { HabitCard } from '../components/HabitCard'
import { HabitForm } from '../components/HabitForm'
import { DashboardSkeleton } from '../components/Skeleton'
import { Modal } from '../components/Modal'
import { ShareDialog } from '../components/ShareDialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { localToday } from '../utils/dates'

// Which modal is open: none, "create", or "edit" with the habit being edited.
// One state value instead of two booleans, so "create and edit at once" can't happen.
// Share stores only the id: the dialog then always shows the latest data (e.g. after removing a partner).
type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; habit: Habit }
  | { mode: 'share'; habitId: string }

// "Thursday, October 15", in the user's language.
const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export function DashboardPage() {
  const { user } = useAuth()
  const habits = useHabits()
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const archiveHabit = useArchiveHabit()
  const toggleToday = useToggleTodayCheckIn()
  const removeMember = useRemoveMember()
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const close = () => setModal({ mode: 'closed' })
  const sharedHabit = modal.mode === 'share' ? habits.data?.find((h) => h.id === modal.habitId) : undefined

  // Today's progress: habits scheduled today, and how many of them are done.
  const dueToday = habits.data?.filter((h) => h.stats.last7Days.at(-1)?.isScheduled) ?? []
  const doneToday = dueToday.filter((h) => h.stats.doneToday).length
  const firstName = user?.displayName.split(' ')[0]

  // Leaving = removing yourself from the habit's members.
  async function handleLeave(habit: Habit) {
    if (!user) return
    await removeMember.mutateAsync({ habitId: habit.id, userId: user.id })
  }

  // mutate (not mutateAsync): we don't wait. The optimistic update already changed the card;
  // if the request fails, the hook rolls the card back and a toast says why.
  function handleToggleToday(habit: Habit, done: boolean) {
    toggleToday.mutate(
      { habitId: habit.id, done },
      { onError: (error) => toast.error(`Couldn't update "${habit.name}"`, { description: error.message }) },
    )
  }

  // mutateAsync returns a promise, so the form can await it and show errors if it fails.
  async function handleCreate(values: HabitRequest) {
    await createHabit.mutateAsync({ ...values, startDate: localToday() })
    toast.success(`"${values.name}" created`)
    close()
  }

  async function handleUpdate(habit: Habit, values: HabitRequest) {
    await updateHabit.mutateAsync({ id: habit.id, body: values })
    toast.success('Changes saved')
    close()
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{todayLabel()}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
        </div>
        <Button size="lg" onClick={() => setModal({ mode: 'create' })}>
          <Plus data-icon="inline-start" />
          New habit
        </Button>
      </div>

      {/* Today's progress bar: role="progressbar" + aria-value* so screen readers read "2 of 4". */}
      {habits.isSuccess && dueToday.length > 0 && (
        <div className="mt-6 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Done today"
            aria-valuemin={0}
            aria-valuemax={dueToday.length}
            aria-valuenow={doneToday}
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted-foreground/12"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${(doneToday / dueToday.length) * 100}%` }}
            />
          </div>
          <p className="text-sm whitespace-nowrap text-muted-foreground">
            <span className="font-semibold text-foreground">
              {doneToday} of {dueToday.length}
            </span>{' '}
            done today
          </p>
        </div>
      )}

      <div className="mt-6">
        {habits.isPending && <DashboardSkeleton />}

        {habits.isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-2">
              Couldn't load your habits: {habits.error.message}
              <Button variant="outline" size="sm" onClick={() => habits.refetch()}>
                <RotateCw data-icon="inline-start" />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {habits.isSuccess && habits.data.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed bg-background px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Sprout className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium">No habits yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Start small: one habit you can do on most days. You can invite a friend to it later.
            </p>
            <Button size="lg" className="mt-5" onClick={() => setModal({ mode: 'create' })}>
              <Plus data-icon="inline-start" />
              Create your first habit
            </Button>
          </div>
        )}

        {habits.isSuccess && habits.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {habits.data.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onEdit={(h) => setModal({ mode: 'edit', habit: h })}
                onArchive={(h) => archiveHabit.mutateAsync(h.id)}
                onToggleToday={handleToggleToday}
                onShare={(h) => setModal({ mode: 'share', habitId: h.id })}
                onLeave={handleLeave}
              />
            ))}
          </div>
        )}
      </div>

      {modal.mode === 'create' && (
        <Modal title="New habit" description="Pick something small enough to do on a bad day." onClose={close}>
          <HabitForm submitLabel="Create habit" onSubmit={handleCreate} onCancel={close} />
        </Modal>
      )}

      {sharedHabit && <ShareDialog habit={sharedHabit} onClose={close} />}

      {modal.mode === 'edit' && (
        <Modal title="Edit habit" onClose={close}>
          <HabitForm
            habit={modal.habit}
            submitLabel="Save changes"
            onSubmit={(values) => handleUpdate(modal.habit, values)}
            onCancel={close}
          />
        </Modal>
      )}
    </section>
  )
}
