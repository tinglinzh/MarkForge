const relative = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
const absolute = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' }
]

/** Human "5 分钟前" style label for an epoch-ms timestamp, relative to `now`. */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  let duration = (timestamp - now) / 1000
  for (const { amount, unit } of DIVISIONS) {
    if (Math.abs(duration) < amount) {
      return relative.format(Math.round(duration), unit)
    }
    duration /= amount
  }
  return relative.format(Math.round(duration), 'year')
}

/** Full date-time label for tooltips, e.g. "2026/06/09 14:30". */
export function formatAbsoluteTime(timestamp: number): string {
  return absolute.format(timestamp)
}
