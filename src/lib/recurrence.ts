export type RecurrenceRuleName =
  'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

/** Whether a series repeats on a fixed day of month (stored as `anchorDay`). */
export function usesAnchorDay(
  recurrenceRule: RecurrenceRuleName | null,
): boolean {
  return recurrenceRule === 'MONTHLY' || recurrenceRule === 'YEARLY'
}

function utcDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/**
 * Next occurrence of a recurrence.
 *
 * Monthly and yearly dates keep `anchorDay` (the day the series was created
 * on). A 31st clamps to the 28th in February, then returns to the 31st in
 * March. A yearly series on 29 February falls on the 28th in common years.
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
    case 'MONTHLY':
    case 'YEARLY': {
      const monthsAhead = recurrenceRule === 'MONTHLY' ? 1 : 12
      const anchor = anchorDay ?? nextDate.getUTCDate()
      const probe = new Date(
        Date.UTC(
          nextDate.getUTCFullYear(),
          nextDate.getUTCMonth() + monthsAhead,
          1,
        ),
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
