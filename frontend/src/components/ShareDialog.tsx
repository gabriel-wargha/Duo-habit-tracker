import { useRef, useState } from 'react'
import { inviteUrl, useCreateInvite, useRemoveMember } from '../api/invites'
import type { Habit } from '../api/types'
import { Modal } from './Modal'

const MAX_MEMBERS = 2 // owner + one partner; matches InviteEndpoints.MaxMembers on the server

type ShareDialogProps = {
  habit: Habit
  onClose: () => void
}

// Owner-only: create an invite link, copy it, and see or remove the partner.
export function ShareDialog({ habit, onClose }: ShareDialogProps) {
  const createInvite = useCreateInvite()
  const removeMember = useRemoveMember()
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null) // userId awaiting "Yes"
  const linkRef = useRef<HTMLInputElement>(null)

  const partners = habit.members.filter((m) => m.role === 'Partner')
  const isFull = habit.members.length >= MAX_MEMBERS
  const invite = createInvite.data
  const link = invite ? inviteUrl(invite.code) : null

  async function copy() {
    if (!link) return
    try {
      // The Clipboard API: async, and only allowed on secure pages (https or localhost).
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Blocked (permissions, old browser): select the text so the user can press Ctrl/Cmd+C.
      setCopyFailed(true)
      linkRef.current?.select()
    }
  }

  return (
    <Modal title={`Share ${habit.emoji} ${habit.name}`} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="text-sm font-medium text-slate-700">Tracking together</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {habit.members.map((member) => (
              <li key={member.userId} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-800">
                  {member.displayName}{' '}
                  <span className="text-xs text-slate-400">{member.role === 'Owner' ? '(you, owner)' : '(partner)'}</span>
                </span>
                {member.role === 'Partner' &&
                  (confirmRemove === member.userId ? (
                    <span className="flex items-center gap-2">
                      <span className="text-slate-600">Remove?</span>
                      <button
                        type="button"
                        disabled={removeMember.isPending}
                        onClick={() =>
                          removeMember.mutate(
                            { habitId: habit.id, userId: member.userId },
                            { onSuccess: () => setConfirmRemove(null) },
                          )
                        }
                        className="rounded-lg bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(null)}
                        className="rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(member.userId)}
                      className="rounded-lg px-2.5 py-1 font-medium text-slate-500 hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  ))}
              </li>
            ))}
          </ul>
          {removeMember.isError && <p className="mt-2 text-sm text-red-600">{removeMember.error.message}</p>}
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-700">Invite a partner</h3>

          {isFull ? (
            <p className="mt-2 text-sm text-slate-500">
              You're already tracking this with {partners.map((p) => p.displayName).join(', ')}. Remove them to invite
              someone else.
            </p>
          ) : !invite || !link ? (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Anyone with the link can join once. It expires in 7 days.
              </p>
              <button
                type="button"
                onClick={() => createInvite.mutate(habit.id)}
                disabled={createInvite.isPending}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {createInvite.isPending ? 'Creating link…' : 'Create invite link'}
              </button>
              {createInvite.isError && <p className="mt-2 text-sm text-red-600">{createInvite.error.message}</p>}
            </>
          ) : (
            <>
              <div className="mt-2 flex gap-2">
                <input
                  ref={linkRef}
                  readOnly
                  value={link}
                  aria-label="Invite link"
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {copyFailed
                  ? "Couldn't copy automatically: the link is selected, press Ctrl/Cmd+C."
                  : `Single use. Expires ${new Date(invite.expiresAtUtc).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`}
              </p>
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
