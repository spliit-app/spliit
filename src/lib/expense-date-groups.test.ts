import { getFixedMonthlyGroupedExpenses } from './expense-date-groups'

describe('getFixedMonthlyGroupedExpenses', () => {
  const today = new Date(2026, 5, 23)

  it('marks the current month', () => {
    const groups = getFixedMonthlyGroupedExpenses(
      [{ expenseDate: new Date(Date.UTC(2026, 5, 10)) }],
      'en-US',
      today,
    )

    expect(groups[0].label).toBe('June - Current Month')
  })

  it('omits the year for previous months in the current year', () => {
    const groups = getFixedMonthlyGroupedExpenses(
      [{ expenseDate: new Date(Date.UTC(2026, 4, 10)) }],
      'en-US',
      today,
    )

    expect(groups[0].label).toBe('May')
  })

  it('includes the year for months outside the current year', () => {
    const groups = getFixedMonthlyGroupedExpenses(
      [{ expenseDate: new Date(Date.UTC(2025, 11, 10)) }],
      'en-US',
      today,
    )

    expect(groups[0].label).toBe('December 2025')
  })

  it('uses UTC date parts so first-of-month dates do not shift groups', () => {
    const groups = getFixedMonthlyGroupedExpenses(
      [{ expenseDate: new Date('2026-06-01T00:00:00.000Z') }],
      'en-US',
      today,
    )

    expect(groups[0].key).toBe('2026-06')
    expect(groups[0].label).toBe('June - Current Month')
  })
})
