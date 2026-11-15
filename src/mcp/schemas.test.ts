import {
  expensesCreateSchema,
  expensesGetSchema,
  expensesUpdateSchema,
  groupsGetSchema,
  groupsUpdateSchema,
  statsMonthExpensesSchema,
} from '@/mcp/schemas'

const expense = {
  title: 'Dinner',
  amount: 3000,
  paidBy: 'alice',
}

describe('expensesCreateSchema', () => {
  it('accepts real ISO dates and rejects impossible calendar dates', () => {
    expect(
      expensesCreateSchema.safeParse({
        ...expense,
        expenseDate: '2026-02-28',
      }).success,
    ).toBe(true)
    expect(
      expensesCreateSchema.safeParse({
        ...expense,
        expenseDate: '2026-02-30',
      }).success,
    ).toBe(false)
  })

  it('rejects zero and out-of-range amounts', () => {
    expect(
      expensesCreateSchema.safeParse({ ...expense, amount: 0 }).success,
    ).toBe(false)
    expect(
      expensesCreateSchema.safeParse({ ...expense, amount: 1_000_000_001 })
        .success,
    ).toBe(false)
  })

  it('rejects duplicate paidFor participants', () => {
    expect(
      expensesCreateSchema.safeParse({
        ...expense,
        paidFor: [
          { participantId: 'alice', shares: 50 },
          { participantId: 'alice', shares: 50 },
        ],
        splitMode: 'BY_PERCENTAGE',
      }).success,
    ).toBe(false)
  })

  it('does not accept a client-minted expense id', () => {
    expect(
      expensesCreateSchema.parse({ ...expense, expenseId: 'client-id' }),
    ).not.toHaveProperty('expenseId')
  })

  it('bounds IDs without hard-coding a nanoid length', () => {
    expect(
      expensesCreateSchema.safeParse({
        ...expense,
        paidBy: 'short',
      }).success,
    ).toBe(true)
    expect(
      expensesCreateSchema.safeParse({
        ...expense,
        paidBy: 'x'.repeat(65),
      }).success,
    ).toBe(false)
  })
})

describe('expensesUpdateSchema', () => {
  it('accepts read-shaped dates, rates, and payer objects', () => {
    const parsed = expensesUpdateSchema.parse({
      expenseId: 'expense',
      title: 'Dinner',
      amount: 3000,
      expenseDate: '2026-01-02T00:00:00.000Z',
      paidBy: { id: 'alice', name: 'Alice' },
      paidFor: [{ participantId: 'alice', shares: 100 }],
      conversionRate: '1.23',
      originalCurrency: 'EUR',
      originalAmount: 1000,
    })

    expect(parsed.expenseDate).toBe('2026-01-02')
    expect(parsed.paidBy).toBe('alice')
    expect(parsed.conversionRate).toBe(1.23)
  })

  it('accepts nullable fields returned by expenses_get', () => {
    expect(
      expensesUpdateSchema.parse({
        expenseId: 'expense',
        notes: null,
        originalAmount: null,
        originalCurrency: null,
        conversionRate: null,
      }),
    ).toMatchObject({
      notes: null,
      originalAmount: null,
      originalCurrency: null,
      conversionRate: null,
    })
  })

  it('converts offset datetimes to their UTC date', () => {
    expect(
      expensesUpdateSchema.parse({
        expenseId: 'expense',
        expenseDate: '2026-01-02T23:00:00-05:00',
      }).expenseDate,
    ).toBe('2026-01-03')
  })
})

describe('groupsUpdateSchema', () => {
  it('rejects empty participant ids', () => {
    expect(
      groupsUpdateSchema.safeParse({
        participants: [{ id: '', name: 'Ghost' }],
      }).success,
    ).toBe(false)
  })
})

describe('statsMonthExpensesSchema', () => {
  it('accepts only months 01 through 12', () => {
    expect(
      statsMonthExpensesSchema.safeParse({ month: '2026-12' }).success,
    ).toBe(true)
    expect(
      statsMonthExpensesSchema.safeParse({ month: '2026-13' }).success,
    ).toBe(false)
    expect(
      statsMonthExpensesSchema.safeParse({ month: '2026-00' }).success,
    ).toBe(false)
  })
})

describe('group scoping', () => {
  it('strips groupId arguments so the request header remains authoritative', () => {
    expect(groupsGetSchema.parse({ groupId: 'other-group' })).toEqual({})
    expect(
      expensesGetSchema.parse({
        groupId: 'other-group',
        expenseId: 'expense',
      }),
    ).toEqual({ expenseId: 'expense' })
  })
})
