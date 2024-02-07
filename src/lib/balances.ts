import { getGroupExpenses } from '@/lib/api'
import { Participant } from '@prisma/client'
import { match } from 'ts-pattern'

export type Balances = Record<
  Participant['id'],
  { paid: number; paidFor: number; total: number }
>

export type Reimbursement = {
  from: Participant['id']
  to: Participant['id']
  amount: number
}

export function getBalances(
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): Balances {
  const balances: Balances = {}

  for (const expense of expenses) {
    const paidBy = expense.paidById
    const paidFors = expense.paidFor

    if (!balances[paidBy]) balances[paidBy] = { paid: 0, paidFor: 0, total: 0 }
    balances[paidBy].paid += expense.amount
    balances[paidBy].total += expense.amount

    const totalPaidForShares = paidFors.reduce(
      (sum, paidFor) => sum + paidFor.shares,
      0,
    )
    let remaining = expense.amount
    paidFors.forEach((paidFor, index) => {
      if (!balances[paidFor.participantId])
        balances[paidFor.participantId] = { paid: 0, paidFor: 0, total: 0 }

      const isLast = index === paidFors.length - 1

      const [shares, totalShares] = match(expense.splitMode)
        .with('EVENLY', () => [1, paidFors.length])
        .with('BY_SHARES', () => [paidFor.shares, totalPaidForShares])
        .with('BY_PERCENTAGE', () => [paidFor.shares, totalPaidForShares])
        .with('BY_AMOUNT', () => [paidFor.shares, totalPaidForShares])
        .exhaustive()

      const dividedAmount = isLast
        ? remaining
        : (expense.amount * shares) / totalShares
      remaining -= dividedAmount
      balances[paidFor.participantId].paidFor += dividedAmount
      balances[paidFor.participantId].total -= dividedAmount
    })
  }

  for (const participantId in balances) {
    balances[participantId].total =
      Math.floor(Math.round(balances[participantId].total)) + 0 // added +0 to avoid negative zero
    balances[participantId].paidFor =
      Math.round(balances[participantId].paidFor) + 0
  }
  return balances
}

export function getSuggestedReimbursements(
  balances: Balances,
): Reimbursement[] {
  const balancesArray = Object.entries(balances)
    .map(([participantId, { total }]) => ({ participantId, total }))
    .filter((b) => b.total !== 0)
  balancesArray.sort((b1, b2) => b2.total - b1.total)
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
