import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useAcceptInvite, useInvitePreview } from '../api/invites'
import { useAuth } from '../auth/useAuth'
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
    accept.mutate(code, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {(preview.isPending || status === 'loading') && <p className="text-center text-slate-500">Loading invite…</p>}

        {preview.isError && (
          <div className="text-center">
            <p className="text-4xl" aria-hidden="true">
              🔗
            </p>
            <h1 className="mt-2 text-lg font-semibold text-slate-900">
              {/* 410 = the link existed but expired or was used; anything else = it never worked. */}
              {preview.error instanceof ApiError && preview.error.status === 410
                ? preview.error.message
                : "This invite link isn't valid."}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Ask your partner to send you a new link.</p>
            <Link to="/" className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
              Go to Habit Tracker
            </Link>
          </div>
        )}

        {preview.isSuccess && status !== 'loading' && (
          <div className="text-center">
            <p className="text-sm text-slate-500">
              <strong className="text-slate-800">{preview.data.inviterName}</strong> invited you to track
            </p>
            <div
              className="mt-4 rounded-2xl border border-l-8 border-slate-200 p-4 text-left"
              style={{ borderLeftColor: preview.data.color }}
            >
              <p className="text-3xl" aria-hidden="true">
                {preview.data.emoji}
              </p>
              <h1 className="mt-1 text-lg font-semibold text-slate-900">{preview.data.habitName}</h1>
              {preview.data.habitDescription && (
                <p className="text-sm text-slate-500">{preview.data.habitDescription}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">{describeSchedule(preview.data.scheduleDays)}</p>
            </div>

            {status === 'anonymous' && (
              <div className="mt-6 flex flex-col gap-2">
                <p className="text-sm text-slate-600">Log in or sign up to join. You'll come right back here.</p>
                {/* state={backHere}: the login page reads it and returns here after logging in. */}
                <Link
                  to="/register"
                  state={backHere}
                  className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
                >
                  Create an account
                </Link>
                <Link
                  to="/login"
                  state={backHere}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  I already have an account
                </Link>
              </div>
            )}

            {status === 'authenticated' &&
              (preview.data.isMember ? (
                <div className="mt-6">
                  <p className="text-sm text-slate-600">You're already tracking this habit.</p>
                  <Link to="/" className="mt-3 inline-block font-medium text-slate-900 underline">
                    Go to your dashboard
                  </Link>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2">
                  {accept.isError && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {accept.error.message}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={join}
                    disabled={accept.isPending}
                    className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {accept.isPending ? 'Joining…' : `Join as ${user?.displayName}`}
                  </button>
                  <Link to="/" className="text-sm text-slate-500 underline">
                    Not now
                  </Link>
                </div>
              ))}
          </div>
        )}
      </div>
    </main>
  )
}
