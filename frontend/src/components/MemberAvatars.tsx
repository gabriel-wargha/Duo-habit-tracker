import type { Member } from '../api/types';

type MemberAvatarsProps = {
	members: Member[];
	color: string;
};

// "EMMA L" → "EL", "gabriel" → "G"
function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	const letters =
		parts.length > 1
			? parts[0][0] + parts[parts.length - 1][0]
			: parts[0].slice(0, 1);
	return letters.toUpperCase();
}

// Small round avatars with initials. A ✅ badge means that person is done for today.
export function MemberAvatars({ members, color }: MemberAvatarsProps) {
	return (
		<ul className="flex -space-x-1.5">
			{members.map((member) => {
				const label = `${member.displayName}: ${member.doneToday ? 'done today' : 'not done yet today'}, 🔥 ${member.currentStreak}`;
				return (
					<li key={member.userId} className="relative" title={label}>
						<span className="sr-only">{label}</span>
						<span
							aria-hidden="true"
							// A ring in the habit's color when done, so it reads at a glance even without the badge.
							style={member.doneToday ? { borderColor: color } : undefined}
							className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-slate-100 text-xs font-semibold text-slate-700 ${
								member.doneToday ? '' : 'border-white'
							}`}>
							{initials(member.displayName)}
						</span>
						{member.doneToday && (
							<span
								aria-hidden="true"
								className="absolute -right-1 -bottom-1 text-xs leading-none">
								✅
							</span>
						)}
					</li>
				);
			})}
		</ul>
	);
}
