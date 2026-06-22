import { expenseFormSchema, groupFormSchema } from './schemas'

describe('expenseFormSchema', () => {
  it('validates required fields', () => {
    const result = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      originalAmount: undefined,
      originalCurrency: '',
      conversionRate: undefined,
      paidBy: 'p0',
      paidFor: [{ participant: 'p0', shares: 1 }],
      splitMode: 'EVENLY',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      notes: undefined,
      recurrenceRule: 'NONE',
    })

    expect(result.success).toBe(true)
  })

  it('allows valid recurring rules', () => {
    const result = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Rent',
      category: 0,
      amount: 1000,
      originalAmount: undefined,
      originalCurrency: '',
      conversionRate: undefined,
      paidBy: 'p0',
      paidFor: [{ participant: 'p0', shares: 1 }],
      splitMode: 'EVENLY',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      notes: undefined,
      recurrenceRule: 'MONTHLY',
    })

    expect(result.success).toBe(true)
  })

  it('fails when title is missing', () => {
    const result = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      category: 0,
      amount: 1000,
      originalCurrency: '',
      paidBy: 'p0',
      paidFor: [{ participant: 'p0', shares: 1 }],
      splitMode: 'EVENLY',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid split mode', () => {
    const result = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [{ participant: 'p0', shares: 1 }],
      splitMode: 'INVALID_MODE',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(result.success).toBe(false)
  })

  it('validates currency format', () => {
    const valid = groupFormSchema.safeParse({
      name: 'Trip',
      information: undefined,
      currency: '€',
      currencyCode: 'EUR',
      participants: [{ name: 'Alice' }],
    })

    expect(valid.success).toBe(true)

    const invalid = groupFormSchema.safeParse({
      name: 'Trip',
      information: undefined,
      currency: 'TOO_LONG',
      currencyCode: 'EUR',
      participants: [{ name: 'Alice' }],
    })

    expect(invalid.success).toBe(false)
  })

  it('validates percentage sums to 100%', () => {
    // Invalid: sum < 100% (2500 + 3000 = 5500 = 55%)
    const resultLess = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [
        { participant: 'p0', shares: 2500 },
        { participant: 'p1', shares: 3000 },
      ],
      splitMode: 'BY_PERCENTAGE',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(resultLess.success).toBe(false)

    // Invalid: sum > 100% (6000 + 5000 = 11000 = 110%)
    const resultMore = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [
        { participant: 'p0', shares: 6000 },
        { participant: 'p1', shares: 5000 },
      ],
      splitMode: 'BY_PERCENTAGE',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(resultMore.success).toBe(false)

    // Valid: sum = 100% (7000 + 3000 = 10000 = 100%)
    const resultValid = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [
        { participant: 'p0', shares: 7000 },
        { participant: 'p1', shares: 3000 },
      ],
      splitMode: 'BY_PERCENTAGE',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(resultValid.success).toBe(true)
  })

  it('validates amount sum equals total', () => {
    // Invalid: sum < total (300 + 400 = 700 < 1000)
    const resultLess = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [
        { participant: 'p0', shares: 300 },
        { participant: 'p1', shares: 400 },
      ],
      splitMode: 'BY_AMOUNT',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(resultLess.success).toBe(false)

    // Invalid: sum > total (600 + 700 = 1300 > 1000)
    const resultMore = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [
        { participant: 'p0', shares: 600 },
        { participant: 'p1', shares: 700 },
      ],
      splitMode: 'BY_AMOUNT',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(resultMore.success).toBe(false)

    // Valid: sum = total (600 + 400 = 1000)
    const resultValid = expenseFormSchema.safeParse({
      expenseDate: new Date('2025-01-01T00:00:00.000Z'),
      title: 'Dinner',
      category: 0,
      amount: 1000,
      paidBy: 'p0',
      paidFor: [
        { participant: 'p0', shares: 600 },
        { participant: 'p1', shares: 400 },
      ],
      splitMode: 'BY_AMOUNT',
      saveDefaultSplittingOptions: false,
      isReimbursement: false,
      documents: [],
      recurrenceRule: 'NONE',
    })

    expect(resultValid.success).toBe(true)
  })
})

describe('groupFormSchema', () => {
  it('validates group creation', () => {
    const result = groupFormSchema.safeParse({
      name: 'Weekend Trip',
      information: 'Beach vacation',
      currency: '$',
      currencyCode: 'USD',
      participants: [{ name: 'Alice' }, { name: 'Bob' }],
    })

    expect(result.success).toBe(true)
  })

  it('requires at least 1 participant (business logic requires 2)', () => {
    // Single participant passes schema validation
    const resultOne = groupFormSchema.safeParse({
      name: 'Solo Trip',
      currency: '$',
      currencyCode: 'USD',
      participants: [{ name: 'Alice' }],
    })

    expect(resultOne.success).toBe(true) // Current behavior

    // Zero participants fails
    const resultZero = groupFormSchema.safeParse({
      name: 'Trip',
      currency: '$',
      currencyCode: 'USD',
      participants: [],
    })

    expect(resultZero.success).toBe(false)

    // Note: Business logic should enforce 2+ participants
    // This test documents current schema behavior
  })
})
