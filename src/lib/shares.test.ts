import { SplitMode } from '@/lib/enums'
import {
  ShareInput,
  distributeAmount,
  getExpenseShares,
  getParticipantShare,
} from './shares'

const SPLIT_MODES: SplitMode[] = [
  'EVENLY',
  'BY_SHARES',
  'BY_PERCENTAGE',
  'BY_AMOUNT',
]

function expense(
  id: string,
  amount: number,
  paidFor: [string, number][],
  splitMode: SplitMode = 'EVENLY',
): ShareInput {
  return {
    id,
    amount,
    splitMode,
    paidFor: paidFor.map(([participantId, shares]) => ({
      participantId,
      shares,
    })),
  }
}

function sum(shares: Map<string, number>) {
  return Array.from(shares.values()).reduce((total, share) => total + share, 0)
}

/** The shares themselves, smallest first — who gets which is a separate test. */
function sorted(shares: Map<string, number>) {
  return Array.from(shares.values()).sort((a, b) => a - b)
}

describe('getExpenseShares', () => {
  it.each(SPLIT_MODES)(
    'splits the whole amount and nothing more (%s)',
    (splitMode) => {
      const shares = getExpenseShares(
        expense(
          'e1',
          9500,
          [
            ['alice', 1],
            ['bob', 1],
            ['carol', 1],
          ],
          splitMode,
        ),
      )

      expect(sum(shares)).toBe(9500)
      expect(Array.from(shares.values()).every(Number.isInteger)).toBe(true)
    },
  )

  it('does not leave a stranded minor unit on an even split', () => {
    const shares = getExpenseShares(
      expense('e1', 9500, [
        ['alice', 1],
        ['bob', 1],
        ['carol', 1],
      ]),
    )

    expect(sorted(shares)).toEqual([3166, 3167, 3167])
  })

  it('ignores the stored shares in EVENLY mode', () => {
    const shares = getExpenseShares(
      expense('e1', 100, [
        ['alice', 7],
        ['bob', 1],
      ]),
    )

    expect(shares.get('alice')).toBe(50)
    expect(shares.get('bob')).toBe(50)
  })

  it('splits BY_SHARES proportionally', () => {
    const shares = getExpenseShares(
      expense(
        'e1',
        100,
        [
          ['alice', 1],
          ['bob', 2],
        ],
        'BY_SHARES',
      ),
    )

    expect(shares.get('alice')).toBe(33)
    expect(shares.get('bob')).toBe(67)
  })

  it('leaves exact BY_AMOUNT shares untouched', () => {
    const shares = getExpenseShares(
      expense(
        'e1',
        1000,
        [
          ['alice', 333],
          ['bob', 333],
          ['carol', 334],
        ],
        'BY_AMOUNT',
      ),
    )

    expect(shares.get('alice')).toBe(333)
    expect(shares.get('bob')).toBe(333)
    expect(shares.get('carol')).toBe(334)
  })

  it('normalises BY_PERCENTAGE shares that do not add up to 100%', () => {
    // A row that predates the schema refinement, or came in through the import
    // script: 60/20 of a 100 expense. Taken literally that splits 80 and leaks
    // the rest; as a ratio it splits the whole amount 75/25.
    const shares = getExpenseShares(
      expense(
        'e1',
        100,
        [
          ['alice', 6000],
          ['bob', 2000],
        ],
        'BY_PERCENTAGE',
      ),
    )

    expect(shares.get('alice')).toBe(75)
    expect(shares.get('bob')).toBe(25)
    expect(sum(shares)).toBe(100)
  })

  it('normalises BY_AMOUNT shares that do not add up to the amount', () => {
    const shares = getExpenseShares(
      expense(
        'e1',
        100,
        [
          ['alice', 30],
          ['bob', 30],
        ],
        'BY_AMOUNT',
      ),
    )

    expect(sum(shares)).toBe(100)
  })

  it('splits an income (negative amount) without losing a minor unit', () => {
    const shares = getExpenseShares(
      expense('e1', -9500, [
        ['alice', 1],
        ['bob', 1],
        ['carol', 1],
      ]),
    )

    expect(sum(shares)).toBe(-9500)
    expect(sorted(shares)).toEqual([-3167, -3167, -3166])
  })

  it('gives everyone nothing when the shares add up to zero', () => {
    const shares = getExpenseShares(
      expense(
        'e1',
        100,
        [
          ['alice', 0],
          ['bob', 0],
        ],
        'BY_SHARES',
      ),
    )

    expect(shares.get('alice')).toBe(0)
    expect(shares.get('bob')).toBe(0)
  })

  it('handles an expense nobody was paid for', () => {
    expect(getExpenseShares(expense('e1', 100, [])).size).toBe(0)
  })

  it('does not depend on the order the participants come back from the database', () => {
    const paidFor: [string, number][] = [
      ['alice', 1],
      ['bob', 1],
      ['carol', 1],
    ]

    expect(
      getExpenseShares(expense('e1', 100, [...paidFor].reverse())),
    ).toEqual(getExpenseShares(expense('e1', 100, paidFor)))
  })

  it('gives the same expense the same split every time', () => {
    const split = () =>
      getExpenseShares(
        expense('e1', 100, [
          ['alice', 1],
          ['bob', 1],
          ['carol', 1],
        ]),
      )

    expect(split()).toEqual(split())
  })

  it('does not always offer the leftover minor unit to the same participant', () => {
    const participants = ['alice', 'bob', 'carol']
    const receivers = new Set<string>()

    for (let index = 0; index < 50; index++) {
      const shares = getExpenseShares(
        expense(
          `expense-${index}`,
          100,
          participants.map((id): [string, number] => [id, 1]),
        ),
      )
      for (const id of participants) {
        if (shares.get(id) === 34) receivers.add(id)
      }
    }

    expect(receivers).toEqual(new Set(participants))
  })

  it('starts at the first participant for an expense without an id', () => {
    const shares = getExpenseShares({
      amount: 100,
      splitMode: 'EVENLY',
      paidFor: [
        { participantId: 'bob', shares: 1 },
        { participantId: 'alice', shares: 1 },
        { participantId: 'carol', shares: 1 },
      ],
    })

    expect(shares.get('alice')).toBe(34)
    expect(sum(shares)).toBe(100)
  })
})

describe('getParticipantShare', () => {
  const evenly = expense('e1', 100, [
    ['alice', 1],
    ['bob', 1],
  ])

  it('returns the participant’s share', () => {
    expect(getParticipantShare('alice', evenly)).toBe(50)
  })

  it('returns zero for someone the expense was not paid for', () => {
    expect(getParticipantShare('carol', evenly)).toBe(0)
  })

  it('returns zero when there is no active participant', () => {
    expect(getParticipantShare(null, evenly)).toBe(0)
  })
})

describe('distributeAmount', () => {
  it('adds up to the amount when it does not divide evenly', () => {
    expect(distributeAmount(9500, 3)).toEqual([3167, 3167, 3166])
  })

  it('divides an even amount evenly', () => {
    expect(distributeAmount(900, 3)).toEqual([300, 300, 300])
  })

  it('adds up for a negative amount', () => {
    expect(distributeAmount(-9500, 3)).toEqual([-3166, -3167, -3167])
  })

  it('has nothing to distribute over nobody', () => {
    expect(distributeAmount(100, 0)).toEqual([])
  })
})
