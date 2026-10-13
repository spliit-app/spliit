export type RecurrenceRuleName = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

function utcDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/**
 * Next occurrence of a recurrence.
 *
 * Monthly dates keep `anchorDay` (the day the series was created on). A 31st
 * clamps to the 28th in February, then returns to the 31st in March.
 * NONE returns `prior` unchanged, so callers that loop must stop on it.
 */
export function nextRecurringDate(
  recurrenceRule: RecurrenceRuleName,
  prior: Date,
  anchorDay?: number | null,
): Date {
  const nextDate = new Date(prior)
  switch (recurrenceRule) {
    case 'DAILY':
      nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      break
    case 'WEEKLY':
      nextDate.setUTCDate(nextDate.getUTCDate() + 7)
      break
    case 'MONTHLY': {
      const anchor = anchorDay ?? nextDate.getUTCDate()
      const probe = new Date(
        Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 1),
      )
      const year = probe.getUTCFullYear()
      const month = probe.getUTCMonth()
      const day = Math.min(Math.max(anchor, 1), utcDaysInMonth(year, month))
      nextDate.setUTCFullYear(year, month, day)
      break
    }
    case 'NONE':
      break
    default: {
      const unknownRule: never = recurrenceRule
      throw new Error(`Unknown recurrence rule: ${unknownRule}`)
    }
  }
  return nextDate
}
