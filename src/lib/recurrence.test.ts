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
