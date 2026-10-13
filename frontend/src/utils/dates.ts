// Today's date in the *user's* time zone, as "YYYY-MM-DD".
// Not new Date().toISOString().slice(0, 10): that gives the UTC date,
// which is already "tomorrow" in the evening for anyone west of UTC.
export function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0') // getMonth() is 0-based
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
