import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import type { Habit, HabitRequest } from '../api/types'
import { EVERY_DAY, WEEKDAYS, WEEKDAYS_ONLY, isScheduledOn, toggleDay } from '../utils/schedule'
import { FormField } from './FormField'

const EMOJIS = ['✅', '📚', '🏃', '💧', '🧘', '💪', '🥗', '😴', '✍️', '🎸', '🧹', '💊']
const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ef4444', '#f97316', '#eab308', '#14b8a6']

type FormValues = Omit<HabitRequest, 'description' | 'startDate'> & { description: string }
type Errors = Partial<Record<keyof FormValues, string>>

type HabitFormProps = {
  // Pass a habit to edit it; leave it out to create a new one.
  habit?: Habit
  submitLabel: string
  onSubmit: (values: HabitRequest) => Promise<void>
  onCancel: () => void
}

// Same rules as the API (Contracts/HabitDtos.cs), for instant feedback.
function validate(values: FormValues): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = 'Name is required.'
  else if (values.name.trim().length > 100) errors.name = 'Name must be 100 characters or fewer.'
  if (values.description.length > 500) errors.description = 'Description must be 500 characters or fewer.'
  if (!values.emoji.trim()) errors.emoji = 'Pick an emoji.'
  if (values.scheduleDays === 0) errors.scheduleDays = 'Pick at least one day.'
  return errors
}

// One form for both "create" and "edit". The parent decides what happens on submit.
export function HabitForm({ habit, submitLabel, onSubmit, onCancel }: HabitFormProps) {
  const [values, setValues] = useState<FormValues>({
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    emoji: habit?.emoji ?? EMOJIS[0],
    color: habit?.color ?? COLORS[0],
    scheduleDays: habit?.scheduleDays ?? EVERY_DAY,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // A generic setter: `K` ties the field name to its value type,
  // so set('scheduleDays', 'abc') is a compile error.
  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() || null })
      // On success the parent closes the modal, which unmounts this form: no state to reset.
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        setFormError(error.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <FormField
        id="habit-name"
        label="Name"
        placeholder="Read 10 pages"
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        error={errors.name}
      />

      <FormField
        id="habit-description"
        label="Description (optional)"
        placeholder="Before bed, any book"
        value={values.description}
        onChange={(e) => set('description', e.target.value)}
        error={errors.description}
      />

      {/* fieldset + legend = a labelled group of buttons, read correctly by screen readers. */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Emoji</legend>
        <div className="grid grid-cols-6 gap-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => set('emoji', emoji)}
              aria-pressed={values.emoji === emoji}
              className={`rounded-lg border py-1.5 text-xl ${
                values.emoji === emoji ? 'border-slate-900 bg-slate-100' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <input
          aria-label="Or type any emoji"
          placeholder="Or type any emoji"
          maxLength={16}
          value={EMOJIS.includes(values.emoji) ? '' : values.emoji}
          onChange={(e) => set('emoji', e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {errors.emoji && <p className="mt-1 text-sm text-red-600">{errors.emoji}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Color</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => set('color', color)}
              aria-label={`Color ${color}`}
              aria-pressed={values.color === color}
              style={{ backgroundColor: color }}
              className={`h-8 w-8 rounded-full ${
                values.color === color ? 'ring-2 ring-slate-900 ring-offset-2' : ''
              }`}
            />
          ))}
        </div>
        {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Days</legend>
        <div className="flex gap-1.5">
          {WEEKDAYS.map(({ day, short, letter }) => {
            const on = isScheduledOn(values.scheduleDays, day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => set('scheduleDays', toggleDay(values.scheduleDays, day))}
                aria-label={short}
                aria-pressed={on}
                className={`h-9 w-9 rounded-full text-sm font-medium ${
                  on ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-3 text-xs">
          <button type="button" className="text-slate-600 underline" onClick={() => set('scheduleDays', EVERY_DAY)}>
            Every day
          </button>
          <button type="button" className="text-slate-600 underline" onClick={() => set('scheduleDays', WEEKDAYS_ONLY)}>
            Weekdays
          </button>
        </div>
        {errors.scheduleDays && <p className="mt-1 text-sm text-red-600">{errors.scheduleDays}</p>}
      </fieldset>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
