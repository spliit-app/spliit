import { registerSpliitTools } from '@/mcp/tools'
import { getGroupExpenses } from '../lib/api'

jest.mock('../lib/api', () => ({
  getGroupExpenses: jest.fn(),
  getGroupExport: jest.fn(),
}))

type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

type Handler = (input: unknown) => Promise<ToolResult>

type ExpenseResponse = {
  expense: {
    expenseDate: string
    conversionRate: number
    paidFor: { participantId: string; shares: number }[]
    documents: { id: string; url: string; width: number; height: number }[]
  }
}

const group = {
  id: 'group',
  name: 'Trip',
  information: null,
  currency: '$',
  currencyCode: null,
  participants: [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
  ],
}

const expense = {
  id: 'expense',
  expenseDate: new Date('2026-01-02T00:00:00.000Z'),
  title: 'Dinner',
  amount: 3000,
  splitMode: 'BY_SHARES',
  paidFor: [
    { participantId: 'alice', shares: 100 },
    { participantId: 'bob', shares: 200 },
  ],
  documents: [
    {
      id: 'document',
      url: 'https://example.com/receipt.png',
      width: 10,
      height: 20,
      expenseId: 'expense',
    },
  ],
  conversionRate: { toNumber: () => 1.23 },
  notes: null,
  originalAmount: null,
  originalCurrency: null,
  paidBy: { id: 'alice', name: 'Alice' },
  paidById: 'alice',
  categoryId: 0,
  category: { id: 0, grouping: 'Uncategorized', name: 'General' },
  isReimbursement: false,
  recurrenceRule: 'NONE',
  recurringExpenseLink: null,
  createdAt: new Date(),
}

const aggregateExpense = {
  id: 'aggregate-expense',
  expenseDate: new Date('2026-01-02T00:00:00.000Z'),
  title: 'Groceries',
  amount: 3000,
  category: { id: 7, grouping: 'Food and Drink', name: 'Groceries' },
  paidBy: { id: 'alice' },
  paidFor: [
    { participant: { id: 'alice' }, shares: 100 },
    { participant: { id: 'bob' }, shares: 200 },
  ],
  splitMode: 'BY_SHARES',
  isReimbursement: false,
}

function setup() {
  const tools = new Map<string, Handler>()
  const update = jest.fn()
  const expensesGet = jest.fn().mockResolvedValue({ expense })
  const expensesCreate = jest.fn().mockResolvedValue({ expenseId: 'settled' })
  const balancesList = jest.fn().mockResolvedValue({
    balances: {},
    reimbursements: [{ from: 'alice', to: 'bob', amount: 1000 }],
  })
  const caller = {
    groups: {
      get: jest.fn().mockResolvedValue({ group }),
      update,
      expenses: { get: expensesGet, create: expensesCreate },
      balances: { list: balancesList },
    },
  }

  registerSpliitTools(
    {
      registerTool: (name: string, _config: unknown, handler: Handler) => {
        tools.set(name, handler)
        return undefined
      },
    } as never,
    caller as never,
    group.id,
  )

  return { tools, update, expensesGet, expensesCreate }
}

describe('groups_update', () => {
  it('rejects participant ids that do not belong to the group', async () => {
    const { tools, update } = setup()

    const result = await tools.get('groups_update')!({
      participants: [{ id: 'foreign', name: 'Foreign' }],
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown participant ID')
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects empty participant ids', async () => {
    const { tools, update } = setup()

    const result = await tools.get('groups_update')!({
      participants: [{ id: '', name: 'Ghost' }],
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown participant ID')
    expect(update).not.toHaveBeenCalled()
  })

  it('accepts current participant ids', async () => {
    const { tools, update } = setup()

    const result = await tools.get('groups_update')!({
      participants: [{ id: 'alice', name: 'Alice' }],
    })

    expect(result.isError).toBeUndefined()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: group.id,
        groupFormValues: expect.objectContaining({
          participants: [{ id: 'alice', name: 'Alice' }],
        }),
      }),
    )
  })
})

describe('balances_settle', () => {
  it('books the suggested reimbursement as a payment expense', async () => {
    const { tools, expensesCreate } = setup()

    const result = await tools.get('balances_settle')!({
      from: 'alice',
      to: 'bob',
      confirm: true,
    })

    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      expenseId: 'settled',
      amount: 1000,
      display: '$10.00',
    })
    expect(expensesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: group.id,
        expenseFormValues: expect.objectContaining({
          amount: 1000,
          category: 1,
          paidBy: 'alice',
          isReimbursement: true,
          paidFor: [{ participant: 'bob', shares: 100 }],
        }),
      }),
    )
  })
})

describe('expenses_aggregate', () => {
  it('rejects unknown participant filters', async () => {
    const { tools } = setup()

    const result = await tools.get('expenses_aggregate')!({
      participantId: 'ghost',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Participant not found')
  })

  it('returns filtered totals and grouped displays', async () => {
    const { tools } = setup()
    jest.mocked(getGroupExpenses).mockResolvedValue([aggregateExpense] as never)

    const result = await tools.get('expenses_aggregate')!({
      participantId: 'bob',
      role: 'share',
      groupBy: 'category',
    })

    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      total: 2000,
      count: 1,
      display: '$20.00',
      groups: [
        {
          categoryId: 7,
          total: 2000,
          display: '$20.00',
        },
      ],
    })
  })
})

describe('expenses_get', () => {
  it('returns an update-ready expense shape', async () => {
    const { tools } = setup()

    const result = await tools.get('expenses_get')!({ expenseId: 'expense' })

    expect(result.isError).toBeUndefined()
    const body = JSON.parse(result.content[0].text) as ExpenseResponse
    expect(body.expense.expenseDate).toBe('2026-01-02')
    expect(body.expense.conversionRate).toBe(1.23)
    expect(body.expense.paidFor).toEqual([
      { participantId: 'alice', shares: 1 },
      { participantId: 'bob', shares: 2 },
    ])
    expect(body.expense.documents).toEqual([
      {
        id: 'document',
        url: 'https://example.com/receipt.png',
        width: 10,
        height: 20,
      },
    ])
  })
})
