import { Check } from 'lucide-react'
import type { Member } from '../api/types'
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { initials } from '@/utils/initials'

type MemberAvatarsProps = {
  members: Member[]
  color: string
}

// Overlapping avatars with initials. A check badge in the habit's color = done for today.
// Hover (or focus) one to see the name and streak in a tooltip.
export function MemberAvatars({ members, color }: MemberAvatarsProps) {
  return (
    <AvatarGroup>
      {members.map((member) => {
        const status = member.doneToday ? 'done today' : 'not done yet today'
        return (
          <Tooltip key={member.userId}>
            <TooltipTrigger asChild>
              {/* tabIndex makes the avatar focusable, so keyboard users can open the tooltip too. */}
              <Avatar tabIndex={0} aria-label={`${member.displayName}: ${status}`}>
                <AvatarFallback className="text-xs font-medium">{initials(member.displayName)}</AvatarFallback>
                {member.doneToday && (
                  <AvatarBadge style={{ backgroundColor: color }} className="size-3.5!">
                    <Check className="size-2.5! text-white" strokeWidth={4} />
                  </AvatarBadge>
                )}
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              {member.displayName} · {status} · {member.currentStreak} day streak
            </TooltipContent>
          </Tooltip>
        )
      })}
    </AvatarGroup>
  )
}
