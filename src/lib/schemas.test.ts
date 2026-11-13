import { expenseFormSchema, groupFormSchema } from './schemas'

function byAmountExpense(amount: string, shares: string[]) {
  return {
    expenseDate: new Date('2026-09-01'),
    title: 'Dinner',
    amount,
    paidBy: 'a',
    splitMode: 'BY_AMOUNT',
    saveDefaultSplittingOptions: false,
    isReimbursement: false,
    paidFor: shares.map((shares, i) => ({ participant: `p${i}`, shares })),
  }
}

function issueMessages(input: unknown): string[] {
  const result = expenseFormSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.message)
}

describe('expenseFormSchema, split by amount', () => {
  it('accepts amounts that add up to the expense amount', () => {
    expect(
      issueMessages(
        byAmountExpense('524.34', [
          '110.11',
          '209.74',
          '104.87',
          '89.14',
          '10.48',
        ]),
      ),
    ).toEqual([])
  })

  it('rejects amounts one cent off', () => {
    expect(
      issueMessages(
        byAmountExpense('524.34', [
          '110.11',
          '209.74',
          '104.87',
          '89.14',
          '10.49',
        ]),
      ),
    ).toEqual(['amountSum'])
  })

  it('sums amounts typed with a decimal comma', () => {
    expect(
      issueMessages(byAmountExpense('100', ['50', '30', '20,00'])),
    ).toEqual([])
  })

  it('reports an emptied amount instead of throwing on it', () => {
    expect(issueMessages(byAmountExpense('100', ['60', '']))).toEqual([
      'noZeroShares',
      'amountSum',
    ])
  })

  it('rejects an expense title consisting only of whitespace', () => {
    const res = expenseFormSchema.safeParse({
      ...byAmountExpense('100', ['50', '50']),
      title: '   ',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.message === 'min2')).toBe(true)
    }
  })

  it('trims leading and trailing whitespace from an expense title', () => {
    const res = expenseFormSchema.safeParse({
      ...byAmountExpense('100', ['50', '50']),
      title: '  Dinner with friends  ',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.title).toBe('Dinner with friends')
    }
  })
})

describe('groupFormSchema', () => {
  const validBase = {
    name: 'Trip to Rome',
    currency: 'EUR',
    currencyCode: 'EUR',
    participants: [{ name: 'Alice' }, { name: 'Bob' }],
  }

  it('rejects a group name consisting only of whitespace', () => {
    const res = groupFormSchema.safeParse({
      ...validBase,
      name: '     ',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['name'], message: 'min2' }),
        ]),
      )
    }
  })

  it('trims leading and trailing whitespace from a group name', () => {
    const res = groupFormSchema.safeParse({
      ...validBase,
      name: '  Weekend Getaway  ',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.name).toBe('Weekend Getaway')
    }
  })

  it('rejects a participant name consisting only of whitespace', () => {
    const res = groupFormSchema.safeParse({
      ...validBase,
      participants: [{ name: 'Alice' }, { name: '   ' }],
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['participants', 1, 'name'],
            message: 'min2',
          }),
        ]),
      )
    }
  })

  it('trims leading and trailing whitespace from participant names', () => {
    const res = groupFormSchema.safeParse({
      ...validBase,
      participants: [{ name: '  Alice  ' }, { name: ' Bob ' }],
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.participants[0].name).toBe('Alice')
      expect(res.data.participants[1].name).toBe('Bob')
    }
  })

  it('detects duplicate participant names when one has surrounding whitespace', () => {
    const res = groupFormSchema.safeParse({
      ...validBase,
      participants: [{ name: 'Alice' }, { name: '  Alice  ' }],
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'custom',
            message: 'duplicateParticipantName',
            path: ['participants', 1, 'name'],
          }),
        ]),
      )
    }
  })
})
