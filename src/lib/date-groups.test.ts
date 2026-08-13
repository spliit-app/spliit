import dayjs from 'dayjs'
import { getWeekStartsOn, isSameWeek } from './date-groups'

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
