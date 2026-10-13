// A habit's schedule is one number: a bitmask with one bit per weekday.
// Bit 0 (value 1) = Sunday ... bit 6 (value 64) = Saturday, the same numbering as
// JavaScript's Date.getDay() and C#'s DayOfWeek. So "is day d on?" is (mask & (1 << d)) !== 0.
//
//   Sat Fri Thu Wed Tue Mon Sun
//    0   1   0   1   0   1   0    = 2 + 8 + 32 = 42 → Mon, Wed, Fri

export const EVERY_DAY = 0b1111111 // 127
export const WEEKDAYS_ONLY = 0b0111110 // 62: Mon–Fri

// Listed Monday first, which is how most people read a week. `day` is the bit number.
export const WEEKDAYS = [
  { day: 1, short: 'Mon', letter: 'M' },
  { day: 2, short: 'Tue', letter: 'T' },
  { day: 3, short: 'Wed', letter: 'W' },
  { day: 4, short: 'Thu', letter: 'T' },
  { day: 5, short: 'Fri', letter: 'F' },
  { day: 6, short: 'Sat', letter: 'S' },
  { day: 0, short: 'Sun', letter: 'S' },
] as const

export function isScheduledOn(mask: number, day: number): boolean {
  return (mask & (1 << day)) !== 0
}

// XOR flips one bit: on → off, off → on, leaving the other days alone.
export function toggleDay(mask: number, day: number): number {
  return mask ^ (1 << day)
}

// A short human label: "Every day", "Weekdays", "Weekends" or "Mon, Wed, Fri".
export function describeSchedule(mask: number): string {
  if (mask === EVERY_DAY) return 'Every day'
  if (mask === WEEKDAYS_ONLY) return 'Weekdays'
  if (mask === 0b1000001) return 'Weekends'
  return WEEKDAYS.filter((w) => isScheduledOn(mask, w.day))
    .map((w) => w.short)
    .join(', ')
}
