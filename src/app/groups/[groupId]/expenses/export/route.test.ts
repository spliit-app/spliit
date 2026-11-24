/** @jest-environment node */

import { prisma } from '@/lib/prisma'
import { GET as exportCsv } from './csv/route'
import { GET as exportJson } from './json/route'

jest.mock('@/lib/prisma', () => ({
  prisma: { group: { findUnique: jest.fn() } },
}))
jest.mock('content-disposition', () => ({
  create: (filename: string) => `attachment; filename="${filename}"`,
}))

function parseRow(line: string) {
  const cells: string[] = []
  let value = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"'
        i++
      } else quoted = !quoted
    } else if (line[i] === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else value += line[i]
  }
  cells.push(value)
  return cells
}

describe('expense exports with tags', () => {
  const names = ['Work, "friends"', '=SUM(A1:A2)', 'Café 🏖']
  const expense = {
    id: 'dinner',
    expenseDate: new Date('2026-07-01T00:00:00Z'),
    title: '=Dinner',
    category: { name: 'Food' },
    amount: 6000,
    originalAmount: null,
    originalCurrency: null,
    conversionRate: null,
    paidById: 'alice',
    paidFor: [
      { participantId: 'alice', shares: 1 },
      { participantId: 'bob', shares: 1 },
    ],
    isReimbursement: false,
    splitMode: 'EVENLY',
    tags: names.map((name) => ({ name })),
  }
  const group = {
    id: 'group-1',
    name: 'Test group',
    currency: '€',
    currencyCode: 'EUR',
    participants: [
      { id: 'alice', name: 'tags' },
      { id: 'bob', name: 'amount' },
    ],
    expenses: [
      expense,
      { ...expense, id: 'reimbursement', isReimbursement: true, tags: [] },
    ],
  }
  const params = { params: Promise.resolve({ groupId: 'group-1' }) }

  beforeEach(() => {
    jest.mocked(prisma.group.findUnique).mockResolvedValue(group as never)
  })

  it('appends an escaped array column without overwriting participant shares or financial fields', async () => {
    const response = await exportCsv(new Request('http://localhost/'), params)
    const lines = (await response.text()).replace(/^\uFEFF/, '').split(/\r?\n/)
    expect(lines).toHaveLength(3)
    const headers = parseRow(lines[0])
    const row = Object.fromEntries(
      headers.map((header, index) => [header, parseRow(lines[1])[index]]),
    )
    expect(headers.at(-1)).toBe('Tags')
    expect(JSON.parse(row.Tags)).toEqual([...names].sort())
    expect(Number(row.Cost)).toBe(60)
    expect(Number(row.tags)).toBe(30)
    expect(Number(row.amount)).toBe(-30)
    expect(row.Description).toBe("'=Dinner")
    expect(JSON.parse(parseRow(lines[2]).at(-1)!)).toEqual([])
  })

  it('keeps participant amounts and tags distinct when their CSV labels collide', async () => {
    jest.mocked(prisma.group.findUnique).mockResolvedValueOnce({
      ...group,
      participants: [
        { id: 'alice', name: 'Tags' },
        { id: 'bob', name: 'Tags (2)' },
      ],
    } as never)
    const response = await exportCsv(new Request('http://localhost/'), params)
    const lines = (await response.text()).replace(/^\uFEFF/, '').split(/\r?\n/)
    const headers = parseRow(lines[0])
    expect(new Set(headers).size).toBe(headers.length)
    expect(headers.at(-1)).toBe('Tags (3)')
    const cells = parseRow(lines[1])
    expect(Number(cells[headers.indexOf('Tags')])).toBe(30)
    expect(Number(cells[headers.indexOf('Tags (2)')])).toBe(-30)
    expect(JSON.parse(cells.at(-1)!)).toEqual([...names].sort())
  })

  it('exports arrays of names in JSON and retains untagged reimbursement records', async () => {
    const response = await exportJson(new Request('http://localhost/'), params)
    const data = (await response.json()) as {
      expenses: (Omit<typeof expense, 'tags'> & { tags: string[] })[]
    }
    expect(data.expenses).toHaveLength(2)
    expect(data.expenses[0].tags).toEqual([...names].sort())
    expect(data.expenses[0].amount).toBe(6000)
    expect(data.expenses[0].paidFor).toEqual(expense.paidFor)
    expect(data.expenses[1].tags).toEqual([])
    expect(data.expenses[1].isReimbursement).toBe(true)
  })
})
