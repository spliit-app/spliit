import { getBalances } from './balances'
import {
  calculateShare,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from './totals'

type Expense = Parameters<typeof getTotalGroupSpending>[0][number]
type SplitMode = Expense['splitMode']

const SPLIT_MODES: SplitMode[] = [
  'EVENLY',
  'BY_SHARES',
  'BY_PERCENTAGE',
  'BY_AMOUNT',
]

function makeExpense(partial: Partial<Expense>): Expense {
  return {
    id: 'expense',
    title: 'Expense',
    amount: 0,
    category: null,
    isReimbursement: false,
    splitMode: 'EVENLY',
    expenseDate: new Date('2024-01-01T00:00:00Z'),
    paidBy: { id: 'alice', name: 'Alice' },
    paidFor: [],
    ...partial,
  } as unknown as Expense
}

function splitExpense(
  id: string,
  amount: number,
  paidFor: [string, number][],
  splitMode: SplitMode = 'EVENLY',
): Expense {
  return makeExpense({
    id,
    amount,
    splitMode,
    paidBy: { id: paidFor[0][0], name: paidFor[0][0] },
    paidFor: paidFor.map(([participantId, shares]) => ({
      participant: { id: participantId, name: participantId },
      shares,
    })),
  } as Partial<Expense>)
}

/** A seeded LCG, so a failing case is reproducible from the seed alone. */
function makeRandom(seed: number) {
  let state = seed >>> 0
  return (bound: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state % bound
  }
}

describe('calculateShare', () => {
  it('does not hand three participants 31.67 each out of 95.00', () => {
    // The expense form used to show every participant 3166.66…, which
    // `formatCurrency` then rounded up individually: three people owing 31.67
    // of a 95.00 expense.
    const expense = splitExpense('e1', 9500, [
      ['alice', 1],
      ['bob', 1],
      ['carol', 1],
    ])

    const shares = ['alice', 'bob', 'carol'].map((id) =>
      calculateShare(id, expense),
    )

    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(9500)
    expect([...shares].sort((a, b) => a - b)).toEqual([3166, 3167, 3167])
  })

  it('ignores reimbursements, which balances deliberately count', () => {
    const settlement = makeExpense({
      amount: 500,
      isReimbursement: true,
      paidFor: [{ participant: { id: 'bob', name: 'Bob' }, shares: 1 }],
    } as Partial<Expense>)

    expect(calculateShare('bob', settlement)).toBe(0)
    expect(getBalances([settlement]).bob.paidFor).toBe(500)
  })

  it('returns zero for a participant the expense was not paid for', () => {
    expect(
      calculateShare('carol', splitExpense('e1', 100, [['alice', 1]])),
    ).toBe(0)
  })

  it.each(SPLIT_MODES)(
    'charges what the balances tab charges (%s)',
    (splitMode) => {
      // Deliberately broken invariants: percentages adding up to 90% and
      // by-amount shares adding up to 90 of a 100 expense are exactly the rows
      // `calculateShare` used to disagree with `getBalances` on.
      const shares: [string, number][] =
        splitMode === 'BY_PERCENTAGE'
          ? [
              ['alice', 6000],
              ['bob', 3000],
            ]
          : splitMode === 'BY_AMOUNT'
            ? [
                ['alice', 60],
                ['bob', 30],
              ]
            : [
                ['alice', 2],
                ['bob', 1],
              ]
      const expense = splitExpense('e1', 100, shares, splitMode)
      const balances = getBalances([expense])

      for (const id of ['alice', 'bob']) {
        expect(calculateShare(id, expense)).toBe(balances[id].paidFor)
      }
    },
  )

  it('agrees with the balances tab across randomised expenses', () => {
    const random = makeRandom(20260811)

    for (let run = 0; run < 500; run++) {
      const participants = Array.from(
        { length: 2 + random(6) },
        (_, index) => `participant-${index}`,
      )
      const paidFor = participants
        .filter(() => random(2) === 0)
        .map((id): [string, number] => [id, 1 + random(5000)])
      if (paidFor.length === 0)
        paidFor.push([participants[0], 1 + random(5000)])

      const expense = splitExpense(
        `run-${run}`,
        1 + random(100000),
        paidFor,
        SPLIT_MODES[random(SPLIT_MODES.length)],
      )
      const balances = getBalances([expense])

      for (const id of participants) {
        expect(calculateShare(id, expense)).toBe(balances[id]?.paidFor ?? 0)
      }
    }
  })
})

describe('getTotalActiveUserShare', () => {
  it('sums to the group total once every participant is counted', () => {
    const participants = ['alice', 'bob', 'carol']
    const expenses = [
      splitExpense('e1', 9500, [
        ['alice', 1],
        ['bob', 1],
        ['carol', 1],
      ]),
      splitExpense(
        'e2',
        10000,
        [
          ['alice', 1],
          ['bob', 2],
        ],
        'BY_SHARES',
      ),
    ]

    const total = participants.reduce(
      (sum, id) => sum + getTotalActiveUserShare(id, expenses),
      0,
    )

    expect(total).toBe(getTotalGroupSpending(expenses))
  })

  it('is zero for someone who is not part of any expense', () => {
    expect(
      getTotalActiveUserShare('dave', [
        splitExpense('e1', 100, [['alice', 1]]),
      ]),
    ).toBe(0)
  })
})
