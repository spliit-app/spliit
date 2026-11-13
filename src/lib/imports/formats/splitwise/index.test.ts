import fs from 'fs'
import path from 'path'
import { splitwiseCsvFormat } from './index'

const readFixture = (filename: string) => {
  const filePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'imports',
    'fixtures',
    filename,
  )
  return fs.readFileSync(filePath, 'utf8')
}

describe('SplitwiseCsvFormat', () => {
  const csv = readFixture('splitwise-test.csv')
  let result: Awaited<ReturnType<typeof splitwiseCsvFormat.parseToInternal>>

  beforeAll(async () => {
    result = await splitwiseCsvFormat.parseToInternal(csv)
  })

  it('parses the splitwise-test fixture and respects basic invariants', () => {
    expect(result.expenses.length).toBe(11)

    // No expense should have zero or negative amount.
    for (const expense of result.expenses) {
      expect(expense.amount).toBeGreaterThan(0)
    }

    // Rows with zero totals or invalid combinations should be reported as errors.
    const errors = result.errors ?? []
    expect(errors.length).toBeGreaterThan(0)
    expect(
      errors.some((e) =>
        e.message.includes('Missing or invalid date, amount or description'),
      ),
    ).toBe(true)
    // We know our fixture has three invalid zero-total rows.
    expect(errors).toHaveLength(3)
    const errorRows = errors.map((e) => e.row)
    expect(errorRows).toEqual(expect.arrayContaining([6, 10, 11]))

    const row6 = errors.find((e) => e.row === 6)
    const row10 = errors.find((e) => e.row === 10)
    const row11 = errors.find((e) => e.row === 11)
    expect(row6?.message).toContain('No-op row')
    expect(row10?.message).toContain('Zero total with deltas (invalid)')
    expect(row11?.message).toContain('Payment no-op')
  })

  it('handles simple equal single payer correctly', () => {
    const expense = result.expenses.find((e) =>
      e.title.startsWith('Simple equal single payer'),
    )
    expect(expense).toBeDefined()
    expect(expense!.amount).toBe(3000)
    expect(expense!.paidBy).toBe('p0')
    expect(expense!.paidFor).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participant: 'p0', shares: 1000 }),
        expect.objectContaining({ participant: 'p1', shares: 1000 }),
        expect.objectContaining({ participant: 'p2', shares: 1000 }),
      ]),
    )
  })

  it('handles uneven single payer correctly', () => {
    const expense = result.expenses.find((e) =>
      e.title.startsWith('Uneven single payer'),
    )
    expect(expense).toBeDefined()
    expect(expense!.amount).toBe(4000)
    expect(expense!.paidBy).toBe('p0')
    expect(expense!.paidFor).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participant: 'p0', shares: 2000 }),
        expect.objectContaining({ participant: 'p1', shares: 1000 }),
        expect.objectContaining({ participant: 'p2', shares: 1000 }),
      ]),
    )
  })

  it('splits multi-payer equal split into two payer rows', () => {
    const expenses = result.expenses.filter(
      (e) => e.title === 'Multi-payer equal split',
    )
    expect(expenses).toHaveLength(2)

    const alice = expenses.find((e) => e.paidBy === 'p0')
    const bob = expenses.find((e) => e.paidBy === 'p1')

    expect(alice).toBeDefined()
    expect(bob).toBeDefined()

    expect(alice!.amount).toBe(1500)
    expect(alice!.paidFor).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participant: 'p0', shares: 1000 }),
        expect.objectContaining({ participant: 'p1', shares: 500 }),
      ]),
    )

    expect(bob!.amount).toBe(1500)
    expect(bob!.paidFor).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participant: 'p1', shares: 500 }),
        expect.objectContaining({ participant: 'p2', shares: 1000 }),
      ]),
    )
  })

  it('treats self-payment equal shares as three independent self-paid expenses', () => {
    const expenses = result.expenses.filter((e) =>
      e.title.startsWith('Self-payment equal shares'),
    )
    expect(expenses).toHaveLength(3)

    for (const expense of expenses) {
      expect(expense.amount).toBe(3000)
      expect(expense.paidFor).toHaveLength(1)
      expect(expense.paidFor[0]).toEqual(
        expect.objectContaining({
          participant: expense.paidBy,
          shares: 3000,
        }),
      )
    }
  })

  it('converts Bob→Charlie payment into a reimbursement', () => {
    const expense = result.expenses.find((e) => e.title === 'Bob pays Charlie')
    expect(expense).toBeDefined()
    expect(expense!.isReimbursement).toBe(true)
    expect(expense!.amount).toBe(2500)
    expect(expense!.paidBy).toBe('p1')
    expect(expense!.paidFor).toEqual([
      expect.objectContaining({ participant: 'p2', shares: 2500 }),
    ])
  })

  it('converts Alice→Bob+Charlie payment into two reimbursements', () => {
    const expenses = result.expenses.filter((e) =>
      e.title.startsWith('Alice pays '),
    )
    expect(expenses).toHaveLength(2)

    const toBob = expenses.find((e) =>
      e.paidFor.some((p) => p.participant === 'p1'),
    )
    const toCharlie = expenses.find((e) =>
      e.paidFor.some((p) => p.participant === 'p2'),
    )

    expect(toBob).toBeDefined()
    expect(toCharlie).toBeDefined()

    expect(toBob!.isReimbursement).toBe(true)
    expect(toBob!.amount).toBe(1000)
    expect(toBob!.paidBy).toBe('p0')
    expect(toBob!.paidFor).toEqual([
      expect.objectContaining({ participant: 'p1', shares: 1000 }),
    ])

    expect(toCharlie!.isReimbursement).toBe(true)
    expect(toCharlie!.amount).toBe(500)
    expect(toCharlie!.paidBy).toBe('p0')
    expect(toCharlie!.paidFor).toEqual([
      expect.objectContaining({ participant: 'p2', shares: 500 }),
    ])
  })

  it('handles zero-delta participant by excluding them from shares', () => {
    const expense = result.expenses.find((e) =>
      e.title.startsWith('Zero-delta participant'),
    )
    expect(expense).toBeDefined()
    expect(expense!.amount).toBe(5000)
    expect(expense!.paidBy).toBe('p0')
    expect(expense!.paidFor).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participant: 'p0', shares: 4000 }),
        expect.objectContaining({ participant: 'p1', shares: 1000 }),
      ]),
    )
    // Charlie should not appear in the shares.
    expect(expense!.paidFor.some((p) => p.participant === 'p2')).toBe(false)
  })

  it('does not create expenses for rows with zero totals', () => {
    const titles = result.expenses.map((e) => e.title)

    // These rows in the CSV have zero totals and should not become expenses.
    expect(titles.some((t) => t.startsWith('No-op row'))).toBe(false)
    expect(
      titles.some((t) => t.startsWith('Zero total with deltas (invalid)')),
    ).toBe(false)
    expect(titles.some((t) => t.startsWith('Payment no-op'))).toBe(false)
  })

  it('parses German CSV correctly', async () => {
    const deCsv = readFixture('splitwise-test-de.csv')
    const deResult = await splitwiseCsvFormat.parseToInternal(deCsv)

    // Should produce same amount of valid expenses
    expect(deResult.expenses.length).toBe(11)

    // Check one expense to verify correct mapping
    const expense = deResult.expenses.find((e) =>
      e.title.startsWith('Simple equal single payer'),
    )
    expect(expense).toBeDefined()
    expect(expense!.amount).toBe(3000)
    expect(expense!.paidBy).toBe('p0')
  })
})

describe('Splitwise balance safety', () => {
  const header = 'Date,Description,Category,Cost,Currency,Alice,Bob,Charlie\n'
  const singleRow = (
    cost: string,
    currency: string,
    alice: string,
    bob: string,
    charlie = '0',
  ) =>
    `${header}2026-01-01,Dinner,General,${cost},${currency},${alice},${bob},${charlie}\n`

  it.each([
    ['EUR', '1.01', '0.67', '-0.67', 101, 67],
    ['JPY', '101', '67', '-67', 101, 67],
    ['KWD', '1.001', '0.667', '-0.667', 1001, 667],
  ])(
    'preserves %s minor units for multiple generated IDs',
    async (currency, cost, alice, bob, amount, owed) => {
      const { getExpenseShares } = await import('@/lib/shares')
      const { expenseFormSchema } = await import('@/lib/schemas')
      const parsed = await splitwiseCsvFormat.parseToInternal(
        singleRow(cost, currency, alice, bob),
      )
      expect(parsed.errors).toEqual([])
      for (const expense of parsed.expenses) {
        expect(expenseFormSchema.safeParse(expense).success).toBe(true)
        expect(expense.amount).toBe(amount)
        for (let i = 0; i < 25; i++) {
          const shares = getExpenseShares({
            id: `generated-${i}`,
            amount: expense.amount,
            splitMode: expense.splitMode,
            paidFor: expense.paidFor.map(({ participant, shares }) => ({
              participantId: participant,
              shares: Number(shares),
            })),
          })
          expect(shares.get('p1')).toBe(owed)
        }
      }
    },
  )

  it('rejects inconsistent cent balances instead of changing them', async () => {
    const parsed = await splitwiseCsvFormat.parseToInternal(
      singleRow('1.01', 'EUR', '0.68', '-0.67'),
    )
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('sum(deltas) != 0'),
        }),
      ]),
    )
  })

  it('rejects balanced deltas that exceed the expense amount', async () => {
    const parsed = await splitwiseCsvFormat.parseToInternal(
      singleRow('1.00', 'EUR', '2.00', '-2.00'),
    )
    expect(parsed.expenses).toEqual([])
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Expense balances exceed its total amount',
        }),
      ]),
    )
  })

  it('rejects impossible calendar dates instead of normalizing them', async () => {
    const csv = singleRow('1.00', 'EUR', '0.50', '-0.50').replace(
      '2026-01-01',
      '2026-02-30',
    )
    const parsed = await splitwiseCsvFormat.parseToInternal(csv)
    expect(parsed.expenses).toEqual([])
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Invalid expense date: 2026-02-30',
        }),
      ]),
    )
  })

  it('rejects malformed numbers, unsupported precision, and mixed currencies', async () => {
    const invalid = await splitwiseCsvFormat.parseToInternal(
      singleRow('1.00', 'EUR', 'abc', '-1.00'),
    )
    expect(invalid.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Invalid numeric value' }),
      ]),
    )
    const precision = await splitwiseCsvFormat.parseToInternal(
      singleRow('1.01', 'JPY', '1', '-1'),
    )
    expect(precision.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('too many decimal places'),
        }),
      ]),
    )
    const mixed = await splitwiseCsvFormat.parseToInternal(
      singleRow('1.00', 'EUR', '1', '-1') +
        '2026-01-02,Meal,General,1.00,USD,1,-1,0\n',
    )
    expect(mixed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('Multiple currencies'),
        }),
      ]),
    )
  })

  it('rejects payments whose ledger does not match their stated amount', async () => {
    const csv = `${header}2026-01-01,Payment,Payment,5.00,EUR,3.00,-3.00,0\n`
    const parsed = await splitwiseCsvFormat.parseToInternal(csv)
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Payment amount does not match balances',
        }),
      ]),
    )
  })

  it('rejects duplicate participant names that cannot be mapped safely', async () => {
    const parsed = await splitwiseCsvFormat.parseToInternal(
      'Date,Description,Category,Cost,Currency,Alice,Alice\n2026-01-01,Dinner,General,1.00,EUR,1,-1\n',
    )
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('unique') }),
      ]),
    )
  })
})

it.each(['splitwise-test.csv', 'splitwise-test-de.csv'])(
  'preserves every valid source ledger row in %s',
  async (file) => {
    const { getExpenseShares } = await import('@/lib/shares')
    const { parseSplitwiseExportCsv } = await import('./csv-parser')
    const csv = readFixture(file)
    const input = parseSplitwiseExportCsv(csv)
    const output = await splitwiseCsvFormat.parseToInternal(csv)
    const expected = input.rows.reduce(
      (balance, row) => {
        row.balances.forEach(
          (value, i) => (balance[i] += Math.round(value * 100)),
        )
        return balance
      },
      [0, 0, 0],
    )
    for (let run = 0; run < 20; run++) {
      // New participant IDs vary their sort order and expense IDs vary the allocation seed.
      const ids = run % 2 ? ['z', 'm', 'a'] : ['b', 'a', 'c']
      const actual = [0, 0, 0]
      for (const [idx, expense] of output.expenses.entries()) {
        const payer = Number(expense.paidBy.slice(1))
        actual[payer] += expense.amount
        const shares = getExpenseShares({
          id: `${run}-${idx}`,
          amount: expense.amount,
          splitMode: expense.splitMode,
          paidFor: expense.paidFor.map(({ participant, shares }) => ({
            participantId: ids[Number(participant.slice(1))],
            shares: Number(shares),
          })),
        })
        ids.forEach((id, i) => (actual[i] -= shares.get(id) ?? 0))
      }
      expect(actual).toEqual(expected)
    }
  },
)
