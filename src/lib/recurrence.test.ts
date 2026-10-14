import { nextRecurringDate } from './recurrence'

describe('nextRecurringDate', () => {
  it('keeps the monthly anchor day after a short month', () => {
    const january = new Date(Date.UTC(2025, 0, 31))
    const february = nextRecurringDate('MONTHLY', january, 31)
    expect(february.toISOString().slice(0, 10)).toBe('2025-02-28')
    const march = nextRecurringDate('MONTHLY', february, 31)
    expect(march.toISOString().slice(0, 10)).toBe('2025-03-31')
  })

  it('steps daily and weekly without an anchor', () => {
    const start = new Date(Date.UTC(2025, 0, 31))
    expect(nextRecurringDate('DAILY', start).toISOString().slice(0, 10)).toBe(
      '2025-02-01',
    )
    expect(nextRecurringDate('WEEKLY', start).toISOString().slice(0, 10)).toBe(
      '2025-02-07',
    )
  })
})

describe('nextRecurringDate edge cases', () => {
  const day = (date: Date) => date.toISOString().slice(0, 10)

  it('lands on February 29th in a leap year', () => {
    const january = new Date(Date.UTC(2024, 0, 31))
    expect(day(nextRecurringDate('MONTHLY', january, 31))).toBe('2024-02-29')
  })

  it('clamps a 29th or 30th anchor to the end of February', () => {
    const january = new Date(Date.UTC(2025, 0, 30))
    expect(day(nextRecurringDate('MONTHLY', january, 30))).toBe('2025-02-28')
    expect(day(nextRecurringDate('MONTHLY', january, 29))).toBe('2025-02-28')
  })

  it('rolls from December into January of the next year', () => {
    const december = new Date(Date.UTC(2025, 11, 31))
    expect(day(nextRecurringDate('MONTHLY', december, 31))).toBe('2026-01-31')
  })

  it('falls back to the day of the prior date without an anchor', () => {
    const february = new Date(Date.UTC(2025, 1, 28))
    expect(day(nextRecurringDate('MONTHLY', february))).toBe('2025-03-28')
    expect(day(nextRecurringDate('MONTHLY', february, null))).toBe('2025-03-28')
  })

  it('keeps the time of day of the prior date', () => {
    const prior = new Date(Date.UTC(2025, 0, 31, 13, 45))
    expect(nextRecurringDate('MONTHLY', prior, 31).toISOString()).toBe(
      '2025-02-28T13:45:00.000Z',
    )
  })

  it('returns the prior date unchanged for NONE', () => {
    const prior = new Date(Date.UTC(2025, 0, 31))
    const next = nextRecurringDate('NONE', prior)
    expect(next.getTime()).toBe(prior.getTime())
    expect(next).not.toBe(prior)
  })

  it('throws on an unknown rule', () => {
    const prior = new Date(Date.UTC(2025, 0, 31))
    expect(() => nextRecurringDate('YEARLY' as never, prior)).toThrow(
      'Unknown recurrence rule: YEARLY',
    )
  })
})
