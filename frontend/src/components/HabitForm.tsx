import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { ApiError } from '../api/client'
import type { Habit, HabitRequest } from '../api/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { DEFAULT_HABIT_ICON, HABIT_ICONS, type HabitIconKey } from '@/utils/habitIcons'
import { EVERY_DAY, WEEKDAYS, WEEKDAYS_ONLY, isScheduledOn, toggleDay } from '../utils/schedule'
import { FormField } from './FormField'

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
  if (values.scheduleDays === 0) errors.scheduleDays = 'Pick at least one day.'
  return errors
}

// One form for both "create" and "edit". The parent decides what happens on submit.
export function HabitForm({ habit, submitLabel, onSubmit, onCancel }: HabitFormProps) {
  const [values, setValues] = useState<FormValues>({
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    // An old or unknown icon key shows up as the default, and is saved as such.
    icon: habit && habit.icon in HABIT_ICONS ? habit.icon : DEFAULT_HABIT_ICON,
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
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FormField
        id="habit-name"
        label="Name"
        placeholder="Read 10 pages"
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        error={errors.name}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="habit-description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="habit-description"
          placeholder="Before bed, any book"
          rows={2}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          aria-invalid={errors.description ? true : undefined}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      {/* fieldset + legend = a labelled group of buttons, read correctly by screen readers. */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div className="grid grid-cols-8 gap-1.5">
          {(Object.keys(HABIT_ICONS) as HabitIconKey[]).map((key) => {
            const { icon: Icon, label } = HABIT_ICONS[key]
            const selected = values.icon === key
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => set('icon', key)}
                // The selected icon takes the habit's color, so you preview the result.
                style={selected ? { backgroundColor: `${values.color}1f`, color: values.color, borderColor: values.color } : undefined}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg border transition-colors',
                  selected ? 'border-2' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
        </div>
        {errors.icon && <p className="mt-1 text-sm text-destructive">{errors.icon}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => set('color', color)}
              aria-label={`Color ${color}`}
              aria-pressed={values.color === color}
              style={{ backgroundColor: color }}
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-white transition-transform hover:scale-110',
                values.color === color && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
              )}
            >
              {values.color === color && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
            </button>
          ))}
        </div>
        {errors.color && <p className="mt-1 text-sm text-destructive">{errors.color}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Days</legend>
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
                className={cn(
                  'size-9 rounded-full text-sm font-medium transition-colors',
                  on ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {letter}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-1">
          <Button type="button" variant="ghost" size="xs" onClick={() => set('scheduleDays', EVERY_DAY)}>
            Every day
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => set('scheduleDays', WEEKDAYS_ONLY)}>
            Weekdays
          </Button>
        </div>
        {errors.scheduleDays && <p className="mt-1 text-sm text-destructive">{errors.scheduleDays}</p>}
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
