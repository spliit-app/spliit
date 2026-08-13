import { getGroupExpenses } from '@/lib/api'
import { ShareInput, getParticipantShare } from '@/lib/shares'

export function getTotalGroupSpending(
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): number {
  return expenses.reduce(
    (total, expense) =>
      expense.isReimbursement ? total : total + expense.amount,
    0,
  )
}

export function getTotalActiveUserPaidFor(
  activeUserId: string | null,
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): number {
  return expenses.reduce(
    (total, expense) =>
      expense.paidBy.id === activeUserId && !expense.isReimbursement
        ? total + expense.amount
        : total,
    0,
  )
}

type Expense = NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>[number]

type SplittableExpense = Pick<
  Expense,
  'amount' | 'paidFor' | 'splitMode' | 'isReimbursement'
> & { id?: string | null }

/**
 * Maps an expense into the shape {@link getExpenseShares} takes. The id decides
 * who is offered the leftover minor unit of an uneven split; passing it keeps
 * the stats and the expense form in step with the balances tab.
 */
function toShareInput(expense: SplittableExpense): ShareInput {
  return {
    id: expense.id,
    amount: expense.amount,
    splitMode: expense.splitMode,
    paidFor: expense.paidFor.map(({ participant, shares }) => ({
      participantId: participant.id,
      shares: Number(shares),
    })),
  }
}

/**
 * A participant's share of a single expense, in whole minor units.
 *
 * Delegates to the shared apportionment so that the number shown on the totals,
 * in the CSV export and next to a participant in the expense form is the same
 * one the balances tab charges them. Reimbursements count as zero here: unlike
 * balances, the spending totals deliberately ignore settling up.
 */
export function calculateShare(
  participantId: string | null,
  expense: SplittableExpense,
): number {
  if (expense.isReimbursement) return 0

  return getParticipantShare(participantId, toShareInput(expense))
}

export function getTotalActiveUserShare(
  activeUserId: string | null,
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): number {
  // Every share is a whole number of minor units, so the sum needs no rounding
  // — rounding it here is what used to make the totals disagree with balances.
  return expenses.reduce(
    (sum, expense) => sum + calculateShare(activeUserId, expense),
    0,
  )
}
