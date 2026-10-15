import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { LinkIcon, LoaderCircle } from 'lucide-react'
import { ApiError } from '../api/client'
import { useAcceptInvite, useInvitePreview } from '../api/invites'
import { useAuth } from '../auth/useAuth'
import { HabitIcon } from '../components/HabitIcon'
import { Logo } from '../components/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { describeSchedule } from '../utils/schedule'

// /invite/:code – public: works whether or not you're logged in.
export function InvitePage() {
  const { code = '' } = useParams()
  const { status, user } = useAuth()
  const navigate = useNavigate()
  const preview = useInvitePreview(code, user?.id ?? 'anonymous')
  const accept = useAcceptInvite()

  // Where login/register should send the user back to afterwards (see LoginPage's `from`).
  const backHere = { from: `/invite/${code}` }

  function join() {
    accept.mutate(code, {
      onSuccess: () => {
        toast.success(`You joined "${preview.data?.habitName}"`)
        navigate('/', { replace: true })
      },
    })
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <Link to="/welcome" aria-label="Habit Tracker, home">
        <Logo />
      </Link>

      <Card className="w-full max-w-sm">
        <CardContent>
          {(preview.isPending || status === 'loading') && (
            <div role="status" className="flex justify-center py-8">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading invite…</span>
            </div>
          )}

          {preview.isError && (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <LinkIcon className="size-6" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-lg font-semibold">
                {/* 410 = the link existed but expired or was used; anything else = it never worked. */}
                {preview.error instanceof ApiError && preview.error.status === 410
                  ? preview.error.message
                  : "This invite link isn't valid."}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Ask your partner to send you a new link.</p>
              <Button variant="outline" size="lg" className="mt-5" asChild>
                <Link to="/">Go to Habit Tracker</Link>
              </Button>
            </div>
          )}

          {preview.isSuccess && status !== 'loading' && (
            <div className="flex flex-col gap-5">
              <p className="text-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{preview.data.inviterName}</span> invited you to track
              </p>

              <div className="flex items-center gap-3 rounded-xl border p-4">
                <HabitIcon icon={preview.data.icon} color={preview.data.color} size="lg" />
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold">{preview.data.habitName}</h1>
                  <p className="truncate text-sm text-muted-foreground">
                    {describeSchedule(preview.data.scheduleDays)}
                    {preview.data.habitDescription && <> · {preview.data.habitDescription}</>}
                  </p>
                </div>
              </div>

              {status === 'anonymous' && (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-sm text-muted-foreground">Log in or sign up to join. You'll come right back here.</p>
                  {/* state={backHere}: the login page reads it and returns here after logging in. */}
                  <Button size="lg" asChild>
                    <Link to="/register" state={backHere}>
                      Create an account
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/login" state={backHere}>
                      I already have an account
                    </Link>
                  </Button>
                </div>
              )}

              {status === 'authenticated' &&
                (preview.data.isMember ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">You're already tracking this habit.</p>
                    <Button size="lg" asChild>
                      <Link to="/">Go to your dashboard</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {accept.isError && (
                      <Alert variant="destructive">
                        <AlertDescription>{accept.error.message}</AlertDescription>
                      </Alert>
                    )}
                    <Button size="lg" onClick={join} disabled={accept.isPending}>
                      {accept.isPending ? 'Joining…' : `Join as ${user?.displayName}`}
                    </Button>
                    <Button size="lg" variant="ghost" asChild>
                      <Link to="/">Not now</Link>
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
