import dayjs, { Dayjs } from 'dayjs'
import { dateOnlyToLocalDate } from './utils'

/**
 * Determine the first day of the week for a given locale, expressed using
 * dayjs' day index convention (0 = Sunday, 1 = Monday, … 6 = Saturday).
 *
 * The value is derived from the platform `Intl.Locale` week information
 * (e.g. Monday for `de-DE`, Sunday for `en-US`). When that information is
 * unavailable, we fall back to Monday, which is the correct default for the
 * large majority of the app's supported locales.
 */
export function getWeekStartsOn(locale: string): number {
  try {
    const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    // `firstDay` is 1..7 (Monday..Sunday). Convert to dayjs' 0..6 (Sunday..Saturday).
    const firstDay =
      intlLocale.getWeekInfo?.().firstDay ?? intlLocale.weekInfo?.firstDay
    if (firstDay) return firstDay % 7
  } catch {
    // Unsupported locale or missing Intl week info: fall through to the default.
  }
  return 1
}

/**
 * Return the start of the week containing `date`, honouring the given
 * first-day-of-week. Independent of dayjs' globally configured locale so the
 * result is deterministic.
 */
function startOfWeek(date: Dayjs, weekStartsOn: number): Dayjs {
  const diff = (date.day() - weekStartsOn + 7) % 7
  return date.subtract(diff, 'day').startOf('day')
}

/**
 * Whether `a` and `b` fall in the same week, where the week starts on
 * `weekStartsOn` (0 = Sunday … 6 = Saturday).
 */
export function isSameWeek(a: Dayjs, b: Dayjs, weekStartsOn: number): boolean {
  return startOfWeek(a, weekStartsOn).isSame(
    startOfWeek(b, weekStartsOn),
    'day',
  )
}

export const EXPENSE_GROUPS = {
  UPCOMING: 'upcoming',
  THIS_WEEK: 'thisWeek',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
  LAST_MONTH: 'lastMonth',
  EARLIER_THIS_YEAR: 'earlierThisYear',
  LAST_YEAR: 'lastYear',
  OLDER: 'older',
}

export function getExpenseGroup(
  date: Dayjs,
  today: Dayjs,
  weekStartsOn: number,
) {
  if (today.isBefore(date)) {
    return EXPENSE_GROUPS.UPCOMING
  } else if (isSameWeek(today, date, weekStartsOn)) {
    return EXPENSE_GROUPS.THIS_WEEK
  } else if (today.isSame(date, 'month')) {
    return EXPENSE_GROUPS.EARLIER_THIS_MONTH
  } else if (today.subtract(1, 'month').isSame(date, 'month')) {
    return EXPENSE_GROUPS.LAST_MONTH
  } else if (today.isSame(date, 'year')) {
    return EXPENSE_GROUPS.EARLIER_THIS_YEAR
  } else if (today.subtract(1, 'year').isSame(date, 'year')) {
    return EXPENSE_GROUPS.LAST_YEAR
  } else {
    return EXPENSE_GROUPS.OLDER
  }
}

/**
 * Buckets expenses by the date group their `expenseDate` falls into.
 *
 * `expenseDate` is a DATE column carried at UTC midnight, so it is converted
 * with `dateOnlyToLocalDate` before classification; parsing it directly would
 * file it under the previous day west of UTC.
 *
 * `today` is a parameter so the bucketing is deterministic in tests.
 */
export function getGroupedExpensesByDate<T extends { expenseDate: Date }>(
  expenses: T[],
  today: Dayjs,
  weekStartsOn: number,
) {
  return expenses.reduce((result: { [key: string]: T[] }, expense) => {
    const expenseGroup = getExpenseGroup(
      dayjs(dateOnlyToLocalDate(expense.expenseDate)),
      today,
      weekStartsOn,
    )
    result[expenseGroup] = result[expenseGroup] ?? []
    result[expenseGroup].push(expense)
    return result
  }, {})
}
