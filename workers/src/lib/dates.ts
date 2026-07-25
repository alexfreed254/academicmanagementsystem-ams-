/** Date helpers pinned to Africa/Nairobi (EAT) — matches the Flask app's pytz usage. */

const EAT_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Nairobi',
  month: 'long',
  year: 'numeric',
})

/** Today's date in EAT as YYYY-MM-DD. */
export function todayEAT(): string {
  return EAT_FORMAT.format(new Date())
}

/** Current year in EAT. */
export function currentYearEAT(): number {
  return parseInt(todayEAT().slice(0, 4), 10)
}

/** "July 2026" style label in EAT. */
export function currentMonthLabelEAT(): string {
  return MONTH_FORMAT.format(new Date())
}

/** ISO date string N days before today (EAT). */
export function daysAgoEAT(days: number): string {
  const [y, m, d] = todayEAT().split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - days)
  return dt.toISOString().slice(0, 10)
}
