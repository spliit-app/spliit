import {
  addMonths,
  getEntryType,
  getMonthEnd,
  getMonthlyReport,
  getOpenInstallmentPlans,
  getUpcomingMonths,
  MonthlyReportSource,
} from './monthly-report'

const lucas = { id: 'lucas', name: 'Lucas' }
const ve = { id: 've', name: 'Verônica' }
const day = (value: string) => new Date(`${value}T00:00:00.000Z`)

function expense(
  overrides: Partial<MonthlyReportSource> & { id: string; date: string },
): MonthlyReportSource {
  const { date, ...rest } = overrides
  return {
    title: rest.id,
    category: null,
    expenseDate: day(date),
    amount: 10000,
    isReimbursement: false,
    splitMode: 'EVENLY',
    recurrenceRule: 'NONE',
    occurrenceNumber: null,
    series: null,
    paidBy: lucas,
    paidFor: [
      { participant: lucas, shares: 100 },
      { participant: ve, shares: 100 },
    ],
    ...rest,
  }
}

const fridge = (number: number, date: string, sourceExpenseId?: string) =>
  expense({
    id: sourceExpenseId ? `fridge:${number}` : `fridge-${number}`,
    title: 'Fridge',
    date,
    amount: number === 1 ? 33334 : 33333,
    recurrenceRule: 'MONTHLY',
    occurrenceNumber: number,
    series: {
      id: 'fridge',
      kind: 'INSTALLMENTS',
      occurrenceCount: 3,
      totalAmount: 100000,
    },
    sourceExpenseId,
  })

describe('getEntryType', () => {
  it('tells installments, recurring, one-off expenses and reimbursements apart', () => {
    expect(getEntryType(fridge(1, '2026-11-16'))).toBe('installment')
    expect(
      getEntryType(
        expense({ id: 'n', date: '2026-11-10', recurrenceRule: 'MONTHLY' }),
      ),
    ).toBe('recurring')
    // The occurrence a series was stopped at still belongs to it.
    expect(
      getEntryType(
        expense({
          id: 'n',
          date: '2026-11-10',
          series: {
            id: 's',
            kind: 'RECURRING',
            occurrenceCount: null,
            totalAmount: null,
          },
        }),
      ),
    ).toBe('recurring')
    expect(getEntryType(expense({ id: 'm', date: '2026-11-02' }))).toBe(
      'oneOff',
    )
    expect(
      getEntryType(
        expense({ id: 'r', date: '2026-11-02', isReimbursement: true }),
      ),
    ).toBe('reimbursement')
  })
})

describe('getMonthlyReport', () => {
  const expenses = [
    fridge(1, '2026-11-16'),
    expense({ id: 'market', date: '2026-11-02', amount: 20000, paidBy: ve }),
    expense({ id: 'october', date: '2026-10-30', amount: 99900 }),
    expense({
      id: 'payback',
      date: '2026-11-20',
      amount: 5000,
      isReimbursement: true,
      paidBy: ve,
      paidFor: [{ participant: lucas, shares: 100 }],
    }),
  ]
  const expected = [
    fridge(2, '2026-12-16', 'fridge-1'),
    expense({
      id: 'netflix:6',
      sourceExpenseId: 'netflix',
      title: 'Netflix',
      date: '2026-11-28',
      amount: 5590,
      recurrenceRule: 'MONTHLY',
    }),
  ]
  const report = getMonthlyReport({
    month: '2026-11',
    expenses,
    expected,
    participants: [lucas, ve],
  })

  it('only keeps what falls in the month', () => {
    expect(report.entries.map((entry) => entry.id)).toEqual([
      'market',
      'fridge-1',
      'payback',
      'netflix:6',
    ])
  })

  it('counts an installment purchase for its installment only', () => {
    const installment = report.entries.find((e) => e.id === 'fridge-1')!
    expect(installment).toMatchObject({
      type: 'installment',
      amount: 33334,
      occurrenceNumber: 1,
      occurrenceCount: 3,
      remaining: { count: 2, amount: 66666 },
    })
    expect(report.totals.byType.installment).toEqual({
      amount: 33334,
      count: 1,
    })
  })

  it('separates recorded and expected spending, without reimbursements', () => {
    expect(report.totals.recorded).toBe(53334)
    expect(report.totals.expected).toBe(5590)
    expect(report.totals.total).toBe(58924)
    expect(report.totals.byType.reimbursement).toEqual({
      amount: 5000,
      count: 1,
    })
    const netflix = report.entries.find((e) => e.id === 'netflix:6')!
    expect(netflix).toMatchObject({ expected: true, expenseId: 'netflix' })
  })

  it('settles the month, reimbursements included', () => {
    const [lucasRow, veRow] = report.settlement.participants
    // Lucas paid 333.34 and owes half of 533.34; Verônica paid 200 and 50 back.
    expect(lucasRow).toMatchObject({ paid: 33334, share: 26667 })
    expect(veRow).toMatchObject({ paid: 20000, share: 26667 })
    expect(lucasRow.balance + veRow.balance).toBe(0)
    expect(lucasRow.balance).toBe(33334 - 26667 - 5000)
    expect(report.settlement.reimbursements).toEqual([
      { from: 've', to: 'lucas', amount: 1667 },
    ])
    expect(report.settlementWithExpected.participants[0].paid).toBe(
      33334 + 5590,
    )
  })
})

describe('remaining installments', () => {
  it('counts only the installments a stopped plan still has', () => {
    const report = getMonthlyReport({
      month: '2026-11',
      expenses: [fridge(1, '2026-11-16')],
      expected: [],
      participants: [lucas, ve],
      // The plan was stopped: no installment is expected after the first.
      installments: [fridge(1, '2026-11-16')],
    })
    expect(report.entries[0].remaining).toEqual({ count: 0, amount: 0 })
  })

  it('adds up the installments still to come', () => {
    const report = getMonthlyReport({
      month: '2026-11',
      expenses: [fridge(1, '2026-11-16')],
      expected: [],
      participants: [lucas, ve],
      installments: [
        fridge(1, '2026-11-16'),
        fridge(2, '2026-12-16', 'fridge-1'),
        fridge(3, '2027-01-16', 'fridge-1'),
      ],
    })
    expect(report.entries[0].remaining).toEqual({ count: 2, amount: 66666 })
  })
})

describe('getUpcomingMonths', () => {
  it('adds up what is committed per month', () => {
    const months = getUpcomingMonths({
      fromMonth: '2026-11',
      count: 3,
      expenses: [fridge(1, '2026-11-16')],
      expected: [
        fridge(2, '2026-12-16', 'fridge-1'),
        fridge(3, '2027-01-16', 'fridge-1'),
        expense({
          id: 'netflix:6',
          date: '2026-12-10',
          amount: 5590,
          recurrenceRule: 'MONTHLY',
        }),
      ],
    })
    expect(months).toEqual([
      {
        month: '2026-11',
        installment: 33334,
        recurring: 0,
        oneOff: 0,
        total: 33334,
      },
      {
        month: '2026-12',
        installment: 33333,
        recurring: 5590,
        oneOff: 0,
        total: 38923,
      },
      {
        month: '2027-01',
        installment: 33333,
        recurring: 0,
        oneOff: 0,
        total: 33333,
      },
    ])
  })
})

describe('getOpenInstallmentPlans', () => {
  it('sums what is left of each plan', () => {
    expect(
      getOpenInstallmentPlans([
        fridge(3, '2027-01-16', 'fridge-1'),
        fridge(2, '2026-12-16', 'fridge-1'),
      ]),
    ).toEqual([
      {
        seriesId: 'fridge',
        expenseId: 'fridge-1',
        title: 'Fridge',
        occurrenceCount: 3,
        recordedCount: 1,
        remainingCount: 2,
        remainingAmount: 66666,
        nextDate: day('2026-12-16'),
        lastDate: day('2027-01-16'),
      },
    ])
  })
})

describe('month helpers', () => {
  it('steps across years', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('finds the last day of a month', () => {
    expect(getMonthEnd('2027-02').toISOString().slice(0, 10)).toBe('2027-02-28')
  })
})
