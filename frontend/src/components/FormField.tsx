import type { InputHTMLAttributes } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

// A labelled input with an error message underneath. Shared by Login and Register.
export function FormField({ label, error, id, ...inputProps }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        // aria-* lets screen readers announce the error with the field.
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-slate-200'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
