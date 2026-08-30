import { SplitMode } from '@/lib/enums'
import { match } from 'ts-pattern'

/**
 * The minimum an expense has to expose for its shares to be computed. Callers
 * hold differently shaped `paidFor` rows (nested `participant` from
 * `getGroupExpenses`, a flat `participantId` from the CSV export's own query),
 * so they map into this shape rather than the helper guessing.
 */
export type ShareInput = {
  /**
   * Seeds the rotation that decides who is offered the leftover minor unit of
   * an uneven split. Absent on expenses that have not been saved yet — ids are
   * minted server-side — in which case the rotation starts at the first
   * participant.
   */
  id?: string | null
  /** In minor units. */
  amount: number
  splitMode: SplitMode | string
  paidFor: { participantId: string; shares: number }[]
}

/**
 * A small deterministic string hash (FNV-1a, 32 bit).
 *
 * Used to pick which participant is offered the remaining minor unit of an
 * uneven split. Seeding it with the expense id keeps the split a pure function
 * of the expense — no persisted cursor, no randomness — while still moving the
 * extra unit to a different participant from one expense to the next.
 */
function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Splits `amount` (in minor units) over the given participants so that the
 * shares always add up to exactly `amount`.
 *
 * Every participant first gets the floor of their exact share; the units left
 * over are handed out by largest remainder (Hamilton apportionment). Even
 * splits produce identical remainders, so ties are broken by rotating the
 * starting position with `offset` — otherwise the same participants would
 * absorb the extra unit every single time.
 *
 * Returns the shares in the order the participants were passed in.
 */
function apportion(
  amount: number,
  shares: number[],
  totalShares: number,
  offset: number,
): number[] {
  const count = shares.length
  if (count === 0) return []
  // Shares are validated as positive on write, but legacy or directly written
  // rows are not guaranteed to be.
  if (totalShares === 0) return shares.map(() => 0)

  const amounts: number[] = []
  const remainders: { index: number; remainder: number }[] = []
  let distributed = 0

  shares.forEach((share, index) => {
    const exact = amount * share
    // Math.floor keeps the leftover non-negative for negative amounts (income)
    // just as it does for positive ones, so `remaining` below stays in [0, count).
    const base = Math.floor(exact / totalShares)
    amounts.push(base)
    distributed += base
    remainders.push({ index, remainder: exact - base * totalShares })
  })

  const remaining = amount - distributed
  if (remaining === 0) return amounts

  remainders.sort((a, b) => {
    if (a.remainder !== b.remainder) return b.remainder - a.remainder
    // Rotate the starting position so an even split does not always favour the
    // same participants.
    const rotate = (index: number) => (index - offset + count) % count
    return rotate(a.index) - rotate(b.index)
  })
  for (let i = 0; i < remaining; i++) {
    amounts[remainders[i].index] += 1
  }
  return amounts
}

/**
 * The one definition of "what is each participant's share of this expense".
 *
 * Every share is a whole number of minor units and the shares add up to exactly
 * `expense.amount`, whatever the split mode: `BY_PERCENTAGE` and `BY_AMOUNT`
 * shares are treated as a ratio rather than taken literally, so rows whose
 * stored shares do not satisfy the schema invariants (`Σ shares === 10000`
 * / `Σ shares === amount`, enforced on write in `schemas.ts`) still split the
 * full amount and nothing leaks. Reimbursements are not special-cased here —
 * whether they count is up to the caller.
 *
 * @returns the share per participant id; participants not paid for are absent.
 */
export function getExpenseShares(expense: ShareInput): Map<string, number> {
  // `paidFor` is fetched without an `orderBy`, so the database is free to
  // return the rows in any order. Sort a copy by participant id so the split
  // does not depend on it.
  const paidFors = [...expense.paidFor].sort((a, b) =>
    a.participantId < b.participantId ? -1 : 1,
  )

  const shares = match(expense.splitMode as SplitMode)
    .with('EVENLY', () => paidFors.map(() => 1))
    .with('BY_SHARES', 'BY_PERCENTAGE', 'BY_AMOUNT', () =>
      paidFors.map(({ shares }) => shares),
    )
    .otherwise(() => paidFors.map(() => 1))
  const totalShares = shares.reduce((sum, share) => sum + share, 0)

  const offset =
    expense.id && paidFors.length > 0
      ? hashString(expense.id) % paidFors.length
      : 0
  const amounts = apportion(expense.amount, shares, totalShares, offset)

  return new Map(
    paidFors.map(({ participantId }, index) => [participantId, amounts[index]]),
  )
}

/**
 * A single participant's share of an expense, in whole minor units. Returns 0
 * for a participant the expense was not paid for.
 */
export function getParticipantShare(
  participantId: string | null,
  expense: ShareInput,
): number {
  if (participantId === null) return 0
  return getExpenseShares(expense).get(participantId) ?? 0
}

/**
 * Splits `amount` (in minor units) into `count` shares as evenly as possible,
 * adding up to exactly `amount`. The leftover units go to the first
 * participants, so the caller decides the order that matters.
 */
export function distributeAmount(amount: number, count: number): number[] {
  return apportion(
    amount,
    Array.from({ length: count }, () => 1),
    count,
    0,
  )
}
