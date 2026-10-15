import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import type { RegisterRequest } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AuthShell } from '../components/AuthShell'
import { FormField } from '../components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type Errors = Partial<Record<keyof RegisterRequest, string>>

// Mirrors the server's rules in Contracts/AuthDtos.cs, so users see problems before submitting.
function validate(form: RegisterRequest): Errors {
  const errors: Errors = {}
  if (!form.displayName.trim()) errors.displayName = 'Name is required.'
  else if (form.displayName.trim().length > 100) errors.displayName = 'Name must be 100 characters or fewer.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (form.password.length > 100) errors.password = 'Password must be 100 characters or fewer.'
  return errors
}

export function RegisterPage() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // One state object for the whole form; `update` changes one field at a time.
  const [form, setForm] = useState<RegisterRequest>({ displayName: '', email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (status === 'authenticated') return <Navigate to={from} replace />

  function update(field: keyof RegisterRequest, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validate(form)
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await register({ ...form, email: form.email.trim(), displayName: form.displayName.trim() })
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors)
        // 409 = email taken: show it next to the email field instead of at the top.
        if (error.status === 409) setFieldErrors({ email: error.message })
        else setFormError(error.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create an account"
      description="Track habits on your own or with a partner. Free."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-medium text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <FormField
          id="displayName"
          label="Name"
          autoComplete="name"
          placeholder="Your first name is enough"
          value={form.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          error={fieldErrors.displayName}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={fieldErrors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={fieldErrors.password}
        />

        <Button type="submit" size="lg" disabled={submitting} className="mt-1 w-full">
          {submitting ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>
    </AuthShell>
  )
}
