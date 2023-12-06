import { getGroupExpenses } from '@/lib/api'
import { Participant } from '@prisma/client'

export type Balances = Record<
  Participant['id'],
  { paid: number; paidFor: number; total: number }
>

export function getBalances(
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): Balances {
  const balances: Balances = {}

  for (const expense of expenses) {
    const paidBy = expense.paidById
    const paidFors = expense.paidFor.map((p) => p.participantId)

    if (!balances[paidBy]) balances[paidBy] = { paid: 0, paidFor: 0, total: 0 }
    balances[paidBy].paid += expense.amount
    balances[paidBy].total += expense.amount
    paidFors.forEach((paidFor, index) => {
      if (!balances[paidFor])
        balances[paidFor] = { paid: 0, paidFor: 0, total: 0 }

      const dividedAmount = divide(
        expense.amount,
        paidFors.length,
        index === paidFors.length - 1,
      )
      balances[paidFor].paidFor += dividedAmount
      balances[paidFor].total -= dividedAmount
    })
  }

  return balances
}

function divide(total: number, count: number, isLast: boolean): number {
  if (!isLast) return Math.floor((total * 100) / count) / 100

  return total - divide(total, count, false) * (count - 1)
}
