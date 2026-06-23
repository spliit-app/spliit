import { groupExpensesByCalendarMonth } from './expense-date-groups'

const options = {
  currentMonthLabel: 'Current Month',
  locale: 'en-US',
  now: new Date('2026-06-15T12:00:00.000Z'),
}

function expense(expenseDate: string) {
  return { expenseDate: new Date(expenseDate) }
}

describe('groupExpensesByCalendarMonth', () => {
  it('includes the current month suffix for the current month', () => {
    const groups = groupExpensesByCalendarMonth(
      [expense('2026-06-15T00:00:00.000Z')],
      options,
    )

    expect(groups[0]?.label).toBe('June - Current Month')
  })

  it('omits the year for a previous month in the same year', () => {
    const groups = groupExpensesByCalendarMonth(
      [expense('2026-05-15T00:00:00.000Z')],
      options,
    )

    expect(groups[0]?.label).toBe('May')
  })

  it('includes the year for a month outside the current year', () => {
    const groups = groupExpensesByCalendarMonth(
      [expense('2025-12-15T00:00:00.000Z')],
      options,
    )

    expect(groups[0]?.label).toBe('December 2025')
  })

  it('uses UTC date parts when assigning expenses to a month', () => {
    const groups = groupExpensesByCalendarMonth(
      [expense('2026-06-01T00:00:00.000Z')],
      options,
    )

    expect(groups[0]?.key).toBe('2026-06')
    expect(groups[0]?.label).toBe('June - Current Month')
  })
})
