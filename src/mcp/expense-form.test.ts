import {
  buildCreateExpenseForm,
  buildUpdateExpenseForm,
  type ExistingExpenseForForm,
} from '@/mcp/expense-form'
import type { ExpensesCreateInput } from '@/mcp/schemas'

const participants = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
]

function createInput(
  overrides: Partial<ExpensesCreateInput> = {},
): ExpensesCreateInput {
  return {
    title: 'Dinner',
    amount: 3000,
    paidBy: 'alice',
    splitMode: 'EVENLY',
    isReimbursement: false,
    recurrenceRule: 'NONE',
    ...overrides,
  }
}

function existingExpense(
  overrides: Partial<ExistingExpenseForForm> = {},
): ExistingExpenseForForm {
  return {
    expenseDate: new Date('2026-01-02T00:00:00.000Z'),
    title: 'Old title',
    amount: 3000,
    originalAmount: null,
    originalCurrency: null,
    conversionRate: null,
    categoryId: 0,
    paidById: 'alice',
    paidFor: [
      { participantId: 'alice', shares: 1500 },
      { participantId: 'bob', shares: 1500 },
    ],
    splitMode: 'BY_AMOUNT',
    isReimbursement: false,
    documents: [],
    notes: null,
    recurrenceRule: 'NONE',
    ...overrides,
  }
}

describe('buildCreateExpenseForm', () => {
  it('defaults to every participant at 100 shares and a UTC-midnight date', () => {
    const form = buildCreateExpenseForm(
      createInput({ expenseDate: '2026-03-01' }),
      participants,
    )

    expect(form.paidFor).toEqual([
      { participant: 'alice', shares: 100 },
      { participant: 'bob', shares: 100 },
    ])
    expect(form.expenseDate.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })

  it('stores percentages as basis points', () => {
    const form = buildCreateExpenseForm(
      createInput({
        splitMode: 'BY_PERCENTAGE',
        paidFor: [
          { participantId: 'alice', shares: 60 },
          { participantId: 'bob', shares: 40 },
        ],
      }),
      participants,
    )

    expect(form.paidFor).toEqual([
      { participant: 'alice', shares: 6000 },
      { participant: 'bob', shares: 4000 },
    ])
  })

  it('splits a by-amount expense evenly by default', () => {
    const form = buildCreateExpenseForm(
      createInput({ splitMode: 'BY_AMOUNT' }),
      participants,
    )

    expect(form.paidFor).toEqual([
      { participant: 'alice', shares: 1500 },
      { participant: 'bob', shares: 1500 },
    ])
  })

  it('rejects by-amount shares that do not add up to the expense', () => {
    expect(() =>
      buildCreateExpenseForm(
        createInput({
          splitMode: 'BY_AMOUNT',
          paidFor: [
            { participantId: 'alice', shares: 1500 },
            { participantId: 'bob', shares: 1000 },
          ],
        }),
        participants,
      ),
    ).toThrow('BY_AMOUNT shares must sum to amount')
  })
})

describe('buildUpdateExpenseForm', () => {
  it('preserves unchanged fields when only the title changes', () => {
    const form = buildUpdateExpenseForm(
      existingExpense({
        documents: [
          {
            id: 'document',
            url: 'https://example.com/receipt.png',
            width: 100,
            height: 200,
          },
        ],
        recurrenceRule: 'MONTHLY',
      }),
      { expenseId: 'expense-id-1234567890', title: 'New title' },
      participants,
    )

    expect(form.title).toBe('New title')
    expect(form.amount).toBe(3000)
    expect(form.paidBy).toBe('alice')
    expect(form.paidFor).toEqual([
      { participant: 'alice', shares: 1500 },
      { participant: 'bob', shares: 1500 },
    ])
    expect(form.expenseDate.toISOString()).toBe('2026-01-02T00:00:00.000Z')
    expect(form.documents).toHaveLength(1)
    expect(form.recurrenceRule).toBe('MONTHLY')
  })

  it('rebuilds default shares when the split mode changes', () => {
    const form = buildUpdateExpenseForm(
      existingExpense(),
      { expenseId: 'expense-id-1234567890', splitMode: 'BY_PERCENTAGE' },
      participants,
    )

    expect(form.paidFor).toEqual([
      { participant: 'alice', shares: 5000 },
      { participant: 'bob', shares: 5000 },
    ])
  })
})
