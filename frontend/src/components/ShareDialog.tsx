import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Link2, UserMinus } from 'lucide-react'
import { inviteUrl, useCreateInvite, useRemoveMember } from '../api/invites'
import type { Habit } from '../api/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { initials } from '@/utils/initials'
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
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null) // userId awaiting "Remove"
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
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Blocked (permissions, old browser): select the text so the user can press Ctrl/Cmd+C.
      linkRef.current?.select()
      toast.info("Couldn't copy automatically: the link is selected, press Ctrl/Cmd+C.")
    }
  }

  return (
    <Modal title={`Share "${habit.name}"`} description="Track it together: you'll see each other's check-ins." onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="text-sm font-medium">Members</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {habit.members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3 text-sm">
                <Avatar>
                  <AvatarFallback className="text-xs font-medium">{initials(member.displayName)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium">{member.displayName}</span>
                {member.role === 'Owner' ? (
                  <Badge variant="secondary">Owner</Badge>
                ) : confirmRemove === member.userId ? (
                  <span className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={removeMember.isPending}
                      onClick={() =>
                        removeMember.mutate(
                          { habitId: habit.id, userId: member.userId },
                          {
                            onSuccess: () => {
                              setConfirmRemove(null)
                              toast.success(`${member.displayName} was removed.`)
                            },
                            onError: (error) => toast.error(error.message),
                          },
                        )
                      }
                    >
                      Remove
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(null)}>
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${member.displayName}`}
                    onClick={() => setConfirmRemove(member.userId)}
                  >
                    <UserMinus />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section>
          <h3 className="text-sm font-medium">Invite a partner</h3>

          {isFull ? (
            <p className="mt-2 text-sm text-muted-foreground">
              You're already tracking this with {partners.map((p) => p.displayName).join(', ')}. Remove them to invite
              someone else.
            </p>
          ) : !invite || !link ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Anyone with the link can join once. It expires in 7 days.</p>
              <Button
                className="mt-3 w-full"
                size="lg"
                onClick={() => createInvite.mutate(habit.id, { onError: (error) => toast.error(error.message) })}
                disabled={createInvite.isPending}
              >
                <Link2 data-icon="inline-start" />
                {createInvite.isPending ? 'Creating link…' : 'Create invite link'}
              </Button>
            </>
          ) : (
            <>
              <div className="mt-3 flex gap-2">
                <Input
                  ref={linkRef}
                  readOnly
                  value={link}
                  aria-label="Invite link"
                  onFocus={(e) => e.target.select()}
                  className="h-9 min-w-0 flex-1 bg-muted/50 font-mono text-xs"
                />
                <Button size="lg" onClick={copy} className="w-24">
                  {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Single use. Expires{' '}
                {new Date(invite.expiresAtUtc).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.
              </p>
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
