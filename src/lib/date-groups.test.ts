import dayjs from 'dayjs'
import {
  EXPENSE_GROUPS,
  getExpenseGroup,
  getGroupedExpensesByDate,
  getWeekStartsOn,
  isSameWeek,
} from './date-groups'

describe('getWeekStartsOn', () => {
  it('returns Monday (1) for German locale', () => {
    expect(getWeekStartsOn('de-DE')).toBe(1)
  })

  it('returns Sunday (0) for US English locale', () => {
    expect(getWeekStartsOn('en-US')).toBe(0)
  })

  it('falls back to Monday (1) when the locale cannot be parsed', () => {
    // An empty/malformed locale makes `new Intl.Locale` throw, exercising the
    // fallback path (also hit on engines without `Intl` week info).
    expect(getWeekStartsOn('')).toBe(1)
  })
})

describe('isSameWeek', () => {
  // 2024-01-01 is a Monday, 2024-01-07 a Sunday, 2024-01-08 the next Monday.
  const monday = dayjs('2024-01-01')
  const sameSunday = dayjs('2024-01-07')
  const nextMonday = dayjs('2024-01-08')
  const previousSunday = dayjs('2023-12-31')

  describe('with a Monday-based week (weekStartsOn = 1)', () => {
    it('groups Monday through the following Sunday together', () => {
      expect(isSameWeek(monday, sameSunday, 1)).toBe(true)
    })

    it('does not group the Sunday before Monday into the same week', () => {
      expect(isSameWeek(monday, previousSunday, 1)).toBe(false)
    })

    it('starts a new week on the following Monday', () => {
      expect(isSameWeek(monday, nextMonday, 1)).toBe(false)
    })
  })

  describe('with a Sunday-based week (weekStartsOn = 0)', () => {
    it('groups the Sunday before Monday into the same week', () => {
      expect(isSameWeek(monday, previousSunday, 0)).toBe(true)
    })

    it('does not group Monday with the following Sunday', () => {
      expect(isSameWeek(monday, sameSunday, 0)).toBe(false)
    })
  })

  it('ignores the time of day', () => {
    expect(
      isSameWeek(dayjs('2024-01-01T23:59:59'), dayjs('2024-01-01T00:00:00'), 1),
    ).toBe(true)
  })
})

/**
 * `expenseDate` is a DATE column, so it is carried at UTC midnight. Reading it
 * in the local timezone moves it to the previous day west of UTC, which used
 * to file an expense under "Last month" while its card still showed the
 * stored day. Those cases are only observable with TZ set west of UTC, so
 * they run under `npm run test:tz`; a UTC runner takes the passing side of
 * the defect.
 */
describe('getGroupedExpensesByDate', () => {
  const weekStartsOn = 0

  it('groups a DATE value by its stored calendar day, not the local one', () => {
    const expenses = [{ expenseDate: new Date('2024-08-01T00:00:00.000Z') }]

    const grouped = getGroupedExpensesByDate(
      expenses,
      dayjs('2024-08-20'),
      weekStartsOn,
    )

    expect(Object.keys(grouped)).toEqual([EXPENSE_GROUPS.EARLIER_THIS_MONTH])
    expect(grouped[EXPENSE_GROUPS.LAST_MONTH]).toBeUndefined()
  })

  it('does not read a first-of-year value as the last day of the previous year', () => {
    const expenses = [{ expenseDate: new Date('2024-01-01T00:00:00.000Z') }]

    const grouped = getGroupedExpensesByDate(
      expenses,
      dayjs('2024-06-15'),
      weekStartsOn,
    )

    expect(Object.keys(grouped)).toEqual([EXPENSE_GROUPS.EARLIER_THIS_YEAR])
    expect(grouped[EXPENSE_GROUPS.LAST_YEAR]).toBeUndefined()
  })

  // Not a regression test: east of UTC the local parse already agreed with the
  // stored day, so this passes either way. It guards against a fix that
  // over-corrects by pushing the day forwards instead.
  it('does not move the stored day forwards on an east-of-UTC host', () => {
    const expenses = [{ expenseDate: new Date('2024-08-31T00:00:00.000Z') }]

    const grouped = getGroupedExpensesByDate(
      expenses,
      dayjs('2024-09-10'),
      weekStartsOn,
    )

    expect(Object.keys(grouped)).toEqual([EXPENSE_GROUPS.LAST_MONTH])
  })
})

describe('getExpenseGroup', () => {
  const weekStartsOn = 0

  it('places a future expense in upcoming', () => {
    expect(
      getExpenseGroup(dayjs('2024-09-01'), dayjs('2024-08-20'), weekStartsOn),
    ).toBe(EXPENSE_GROUPS.UPCOMING)
  })

  it('places an expense in the current month in earlierThisMonth', () => {
    expect(
      getExpenseGroup(dayjs('2024-08-05'), dayjs('2024-08-20'), weekStartsOn),
    ).toBe(EXPENSE_GROUPS.EARLIER_THIS_MONTH)
  })

  it('places an expense in the previous month in lastMonth', () => {
    expect(
      getExpenseGroup(dayjs('2024-07-15'), dayjs('2024-08-20'), weekStartsOn),
    ).toBe(EXPENSE_GROUPS.LAST_MONTH)
  })

  it('places an expense in the previous year in lastYear', () => {
    expect(
      getExpenseGroup(dayjs('2023-08-15'), dayjs('2024-08-20'), weekStartsOn),
    ).toBe(EXPENSE_GROUPS.LAST_YEAR)
  })

  it('places an older expense in older', () => {
    expect(
      getExpenseGroup(dayjs('2022-08-15'), dayjs('2024-08-20'), weekStartsOn),
    ).toBe(EXPENSE_GROUPS.OLDER)
  })
})
