import { useState } from 'react'
import { useArchiveHabit, useCreateHabit, useHabits, useToggleTodayCheckIn, useUpdateHabit } from '../api/habits'
import { useRemoveMember } from '../api/invites'
import type { Habit, HabitRequest } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { HabitCard } from '../components/HabitCard'
import { HabitForm } from '../components/HabitForm'
import { Modal } from '../components/Modal'
import { ShareDialog } from '../components/ShareDialog'
import { localToday } from '../utils/dates'

// Which modal is open: none, "create", or "edit" with the habit being edited.
// One state value instead of two booleans, so "create and edit at once" can't happen.
// Share stores only the id: the dialog then always shows the latest data (e.g. after removing a partner).
type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; habit: Habit }
  | { mode: 'share'; habitId: string }

export function DashboardPage() {
  const { user } = useAuth()
  const habits = useHabits()
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const archiveHabit = useArchiveHabit()
  const toggleToday = useToggleTodayCheckIn()
  const removeMember = useRemoveMember()
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const close = () => setModal({ mode: 'closed' })
  const sharedHabit = modal.mode === 'share' ? habits.data?.find((h) => h.id === modal.habitId) : undefined

  // Leaving = removing yourself from the habit's members.
  async function handleLeave(habit: Habit) {
    if (!user) return
    await removeMember.mutateAsync({ habitId: habit.id, userId: user.id })
  }

  // mutate (not mutateAsync): we don't wait. The optimistic update already changed the card;
  // if the request fails, the hook rolls the card back and we show why.
  function handleToggleToday(habit: Habit, done: boolean) {
    setToggleError(null)
    toggleToday.mutate(
      { habitId: habit.id, done },
      { onError: (error) => setToggleError(`Couldn't update "${habit.name}": ${error.message}`) },
    )
  }

  // mutateAsync returns a promise, so the form can await it and show errors if it fails.
  async function handleCreate(values: HabitRequest) {
    await createHabit.mutateAsync({ ...values, startDate: localToday() })
    close()
  }

  async function handleUpdate(habit: Habit, values: HabitRequest) {
    await updateHabit.mutateAsync({ id: habit.id, body: values })
    close()
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Hi, {user?.displayName} 👋</h1>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New habit
        </button>
      </div>

      {toggleError && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {toggleError}
        </p>
      )}

      <div className="mt-6">
        {/* The three states of any query: loading, error, success. */}
        {habits.isPending && <p className="text-slate-500">Loading your habits…</p>}

        {habits.isError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Couldn't load your habits: {habits.error.message}{' '}
            <button type="button" onClick={() => habits.refetch()} className="font-medium underline">
              Try again
            </button>
          </div>
        )}

        {habits.isSuccess && habits.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-medium text-slate-700">No habits yet</p>
            <p className="mt-1 text-sm text-slate-500">Create your first habit to get started.</p>
            <button
              type="button"
              onClick={() => setModal({ mode: 'create' })}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + New habit
            </button>
          </div>
        )}

        {habits.isSuccess && habits.data.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
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
        <Modal title="New habit" onClose={close}>
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
