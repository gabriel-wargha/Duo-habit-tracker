import type { InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
}

// A labelled input with an error message underneath, built from shadcn's Label and Input.
export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        // aria-invalid turns the border red (shadcn styles it), and screen readers
        // announce the message linked by aria-describedby together with the field.
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className="h-9"
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
