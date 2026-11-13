import { Participant } from '@/generated/prisma/browser'
import { getGroupExpenses } from '@/lib/api'
import {
  addFractions,
  Fraction,
  fraction,
  FRACTION_ZERO,
  roundPreservingSum,
  subtractFractions,
} from '@/lib/fraction'
import { getExactExpenseShares } from '@/lib/shares'

export type Balances = Record<
  Participant['id'],
  { paid: number; paidFor: number; total: number }
>

export type Reimbursement = {
  from: Participant['id']
  to: Participant['id']
  amount: number
}

/**
 * What each participant paid, what they owe, and their balance (`paid -
 * paidFor`), in minor units.
 *
 * Shares are added up exactly (see `getExactExpenseShares`) and every balance
 * is rounded once, at the end. Rounding expense by expense instead lets each
 * participant's balance drift by up to one minor unit per uneven expense, a
 * few cents over the life of a group; rounding once keeps every balance
 * within one minor unit of the exact amount. The rounding preserves the sum,
 * so the balances still add up to exactly zero.
 */
export function getBalances(
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): Balances {
  const paid = new Map<string, number>()
  const owed = new Map<string, Fraction>()
  const touch = (participantId: string) => {
    if (!paid.has(participantId)) paid.set(participantId, 0)
    if (!owed.has(participantId)) owed.set(participantId, FRACTION_ZERO)
  }

  for (const expense of expenses) {
    const paidBy = expense.paidBy.id
    touch(paidBy)
    paid.set(paidBy, paid.get(paidBy)! + expense.amount)

    const shares = getExactExpenseShares({
      amount: expense.amount,
      splitMode: expense.splitMode,
      paidFor: expense.paidFor.map(({ participant, shares }) => ({
        participantId: participant.id,
        shares: Number(shares),
      })),
    })
    shares.forEach((share, participantId) => {
      touch(participantId)
      owed.set(participantId, addFractions(owed.get(participantId)!, share))
    })
  }

  const exactTotals = new Map(
    Array.from(paid.entries()).map(([participantId, amount]) => [
      participantId,
      subtractFractions(fraction(amount), owed.get(participantId)!),
    ]),
  )
  const totals = roundPreservingSum(exactTotals, 'towardZero')

  const balances: Balances = {}
  for (const [participantId, amount] of paid) {
    // add +0 to avoid negative zeros
    const total = totals.get(participantId)! + 0
    balances[participantId] = {
      paid: amount + 0,
      paidFor: amount - total + 0,
      total,
    }
  }
  return balances
}

export function getPublicBalances(reimbursements: Reimbursement[]): Balances {
  const balances: Balances = {}
  reimbursements.forEach((reimbursement) => {
    if (!balances[reimbursement.from])
      balances[reimbursement.from] = { paid: 0, paidFor: 0, total: 0 }

    if (!balances[reimbursement.to])
      balances[reimbursement.to] = { paid: 0, paidFor: 0, total: 0 }

    balances[reimbursement.from].paidFor += reimbursement.amount
    balances[reimbursement.from].total -= reimbursement.amount

    balances[reimbursement.to].paid += reimbursement.amount
    balances[reimbursement.to].total += reimbursement.amount
  })
  return balances
}

/**
 * A comparator that is stable across reimbursements.
 * This ensures that a participant executing a suggested reimbursement
 * does not result in completely new repayment suggestions.
 */
function compareBalancesForReimbursements(b1: any, b2: any): number {
  // positive balances come before negative balances
  if (b1.total > 0 && 0 > b2.total) {
    return -1
  } else if (b2.total > 0 && 0 > b1.total) {
    return 1
  }
  // if signs match, sort based on userid
  return b1.participantId < b2.participantId ? -1 : 1
}

export function getSuggestedReimbursements(
  balances: Balances,
): Reimbursement[] {
  const balancesArray = Object.entries(balances)
    .map(([participantId, { total }]) => ({ participantId, total }))
    .filter((b) => b.total !== 0)
  balancesArray.sort(compareBalancesForReimbursements)
  const reimbursements: Reimbursement[] = []
  while (balancesArray.length > 1) {
    const first = balancesArray[0]
    const last = balancesArray[balancesArray.length - 1]
    const amount = first.total + last.total
    if (first.total > -last.total) {
      reimbursements.push({
        from: last.participantId,
        to: first.participantId,
        amount: -last.total,
      })
      first.total = amount
      balancesArray.pop()
    } else {
      reimbursements.push({
        from: last.participantId,
        to: first.participantId,
        amount: first.total,
      })
      last.total = amount
      balancesArray.shift()
    }
  }
  return reimbursements.filter(({ amount }) => Math.round(amount) + 0 !== 0)
}
