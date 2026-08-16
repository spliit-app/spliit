export type StatsPeriod = 'all' | 'thisMonth' | 'last30' | 'thisYear'

export type StatsRange = { from?: string; to?: string }

export const STATS_PERIODS: StatsPeriod[] = [
  'all',
  'thisMonth',
  'last30',
  'thisYear',
]

function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Resolves a named period into an inclusive `{ from, to }` range of
 * `YYYY-MM-DD` dates, computed from the user's local "today". `all` returns an
 * empty range (no filtering).
 */
export function getRangeForPeriod(
  period: StatsPeriod,
  now = new Date(),
): StatsRange {
  switch (period) {
    case 'thisMonth':
      return {
        from: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateString(now),
      }
    case 'last30': {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      return { from: toDateString(from), to: toDateString(now) }
    }
    case 'thisYear':
      return {
        from: toDateString(new Date(now.getFullYear(), 0, 1)),
        to: toDateString(now),
      }
    case 'all':
    default:
      return {}
  }
}
