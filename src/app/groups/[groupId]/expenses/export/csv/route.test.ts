/** @jest-environment node */
import { getBalances } from '@/lib/balances'
import { prisma } from '@/lib/prisma'
import { GET } from './route'

jest.mock('content-disposition', () => ({ create: () => 'attachment' }))
jest.mock('@/lib/prisma', () => ({
  prisma: { group: { findUnique: jest.fn() } },
}))

const expense = {
  id: 'expense-1',
  expenseDate: new Date('2026-01-01T00:00:00Z'),
  title: 'Lunch',
  category: { name: 'Food' },
  amount: 100,
  originalAmount: null,
  originalCurrency: null,
  conversionRate: null,
  paidById: 'a',
  paidFor: [
    { participantId: 'a', shares: 1 },
    { participantId: 'b', shares: 1 },
  ],
  isReimbursement: false,
  splitMode: 'EVENLY',
}

async function exportGroup(overrides: Record<string, unknown> = {}) {
  jest.mocked(prisma.group.findUnique).mockResolvedValue({
    id: 'g',
    name: 'Überblick',
    currency: '€',
    currencyCode: 'EUR',
    participants: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    expenses: [expense],
    ...overrides,
  } as never)
  const response = await GET({} as Request, {
    params: Promise.resolve({ groupId: 'g' }),
  })
  const csv = await response.text()
  // json2csv quotes text, including headers, and escapes embedded quotes.
  const rows = csv.replace(/^\uFEFF/, '').split(/\r?\n/)
  const parse = (row: string) =>
    Array.from(row.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g), (m) =>
      (m[1] ?? m[2]).replace(/""/g, '"'),
    )
  const headers = parse(rows[0])
  return {
    response,
    headers,
    cells: rows.slice(1).map(parse),
    rows: rows
      .slice(1)
      .map((r) => Object.fromEntries(parse(r).map((v, i) => [headers[i], v]))),
  }
}

test('exports deterministic, balanced saldos in expense date order', async () => {
  const { rows } = await exportGroup({
    expenses: [{ ...expense, amount: 101 }],
  })
  expect(
    jest.mocked(prisma.group.findUnique).mock.calls.at(-1)?.[0]?.select
      ?.expenses,
  ).toMatchObject({
    orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
  })
  expect(rows[0]).toMatchObject({
    'Paid By': 'Alice',
    Cost: '1.01',
    'Is Reimbursement': 'No',
  })
  // expense-1 rotates the extra cent to Bob, not the first participant.
  expect(rows[0]).toMatchObject({ Alice: '0.51', Bob: '-0.51' })
})

test.each([
  [
    'unequal split',
    {
      amount: 100,
      splitMode: 'BY_AMOUNT',
      paidFor: [
        { participantId: 'a', shares: 10 },
        { participantId: 'b', shares: 90 },
      ],
    },
    '1.00',
    '0.9',
    '-0.9',
  ],
  ['income', { amount: -100 }, '-1.00', '-0.5', '0.5'],
  [
    'reimbursement',
    {
      amount: 80,
      isReimbursement: true,
      paidById: 'b',
      paidFor: [{ participantId: 'a', shares: 1 }],
    },
    '0.00',
    '-0.8',
    '0.8',
  ],
])(
  '%s has correct per-person net effects',
  async (_name, patch, cost, alice, bob) => {
    const { rows } = await exportGroup({ expenses: [{ ...expense, ...patch }] })
    expect(rows[0]).toMatchObject({ Cost: cost, Alice: alice, Bob: bob })
  },
)

test('preserves original currency, conversion rate and reimbursement flag', async () => {
  const { rows } = await exportGroup({
    expenses: [
      {
        ...expense,
        originalAmount: 120,
        originalCurrency: 'JPY',
        conversionRate: { toString: () => '1.25' },
      },
    ],
  })
  expect(rows[0]).toMatchObject({
    'Original cost': '120',
    'Original currency': 'JPY',
    'Conversion rate': '1.25',
    'Is Reimbursement': 'No',
  })
})

test('escapes spreadsheet formulas and keeps participant names separate from fixed fields', async () => {
  const { rows } = await exportGroup({
    currencyCode: null,
    currency: '=CUSTOM',
    participants: [
      { id: 'a', name: 'amount' },
      { id: 'b', name: '=Bob' },
    ],
    expenses: [{ ...expense, title: '=1+1', category: { name: '@Food' } }],
  })
  expect(rows[0]).toMatchObject({
    Description: "'=1+1",
    Category: "'@Food",
    Currency: "'=CUSTOM",
    Cost: '1.00',
    'Paid By': 'amount',
    amount: '0.5',
    "'=Bob": '-0.5',
  })
})

test('CSV participant totals match group balances across several expenses', async () => {
  const expenses = [
    { ...expense, id: 'expense-1', amount: 101 },
    { ...expense, id: 'expense-2', amount: 101 },
    {
      ...expense,
      id: 'expense-3',
      amount: 37,
      paidById: 'b',
      paidFor: [{ participantId: 'a', shares: 1 }],
      isReimbursement: true,
    },
    { ...expense, id: 'expense-4', amount: -103 },
  ]
  const { rows } = await exportGroup({ expenses })
  const balances = getBalances(
    expenses.map((e) => ({
      ...e,
      paidBy: { id: e.paidById },
      paidFor: e.paidFor.map((p) => ({
        participant: { id: p.participantId },
        shares: p.shares,
      })),
    })) as never,
  )
  expect(rows[0]).toMatchObject({ Alice: '0.51', Bob: '-0.51' })
  expect(rows[1]).toMatchObject({ Alice: '0.5', Bob: '-0.5' })
  for (const [name, id] of [
    ['Alice', 'a'],
    ['Bob', 'b'],
  ]) {
    const exportedMinorUnits = rows.reduce(
      (sum, row) => sum + Math.round(Number(row[name]) * 100),
      0,
    )
    expect(exportedMinorUnits).toBe(balances[id].total)
  }
})

test.each([
  ['JPY', '¥', 101, '101', '51', '-51'],
  ['KWD', 'KD', 101, '0.101', '0.051', '-0.051'],
])(
  'exports %s amounts using the group currency minor units',
  async (currencyCode, currency, amount, cost, alice, bob) => {
    const { rows } = await exportGroup({
      currencyCode,
      currency,
      expenses: [{ ...expense, amount }],
    })
    expect(rows[0]).toMatchObject({ Cost: cost, Alice: alice, Bob: bob })
  },
)

test('retains separate columns for duplicate and fixed-column participant names', async () => {
  const { headers, cells } = await exportGroup({
    participants: [
      { id: 'a', name: 'Cost' },
      { id: 'b', name: 'Same' },
      { id: 'c', name: 'Same' },
    ],
    expenses: [
      {
        ...expense,
        amount: 300,
        paidFor: [
          { participantId: 'b', shares: 1 },
          { participantId: 'c', shares: 1 },
        ],
      },
    ],
  })
  expect(headers.slice(-3)).toEqual(['Cost', 'Same', 'Same'])
  expect(cells[0][headers.indexOf('Cost')]).toBe('3.00')
  expect(cells[0].slice(-3)).toEqual(['3', '-1.5', '-1.5'])
  expect(cells[0][headers.indexOf('Paid By')]).toBe('Cost')
})
