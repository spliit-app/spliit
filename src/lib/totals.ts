import { getGroupExpenses } from '@/lib/api'
import Decimal from 'decimal.js'

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

type ExpenseForShares = Pick<
  Expense,
  'amount' | 'splitMode' | 'isReimbursement'
> & {
  paidBy?: { id: string } | null
  paidFor: Array<{ participant: { id: string }; shares: number }>
  expenseDate?: Expense['expenseDate']
}

function calculateExactShare(
  expense: ExpenseForShares,
  totalShares: Decimal,
  shares: Decimal,
) {
  const amount = new Decimal(expense.amount)

  switch (expense.splitMode) {
    case 'EVENLY':
      return expense.paidFor.length > 0
        ? amount.div(expense.paidFor.length)
        : new Decimal(0)
    case 'BY_AMOUNT':
      return shares
    case 'BY_PERCENTAGE':
      return amount.mul(shares).div(10000)
    case 'BY_SHARES':
      return totalShares.gt(0)
        ? amount.mul(shares).div(totalShares)
        : new Decimal(0)
    default:
      return new Decimal(0)
  }
}

export function calculateShares(
  expense: ExpenseForShares,
): Record<string, number> {
  const result: Record<string, number> = {}
  const amount = new Decimal(expense.amount)

  const totalShares = expense.paidFor.reduce(
    (sum, paidFor) => sum.add(new Decimal(paidFor.shares ?? 0)),
    new Decimal(0),
  )

  let roundedSum = new Decimal(0)
  const participantOrder: string[] = []
  const fractions: Array<{ id: string; fraction: Decimal }> = []

  for (const paidFor of expense.paidFor) {
    const participantId = paidFor.participant.id
    const exactShare = calculateExactShare(
      expense,
      totalShares,
      new Decimal(paidFor.shares ?? 0),
    )
    const roundedShare = exactShare.gte(0)
      ? exactShare.floor()
      : exactShare.ceil()

    result[participantId] = roundedShare.toNumber()
    roundedSum = roundedSum.add(roundedShare)
    participantOrder.push(participantId)
    fractions.push({
      id: participantId,
      fraction: exactShare.minus(roundedShare).abs(),
    })
  }

  const diff = amount.minus(roundedSum)
  if (diff.isZero()) return result

  const payerId = expense.paidBy?.id ?? expense.paidFor[0]?.participant.id

  if (expense.splitMode === 'BY_AMOUNT') {
    if (payerId) result[payerId] = (result[payerId] ?? 0) + diff.toNumber()
    return result
  }

  if (participantOrder.length === 0) {
    if (payerId) result[payerId] = (result[payerId] ?? 0) + diff.toNumber()
    return result
  }

  const direction = diff.gt(0) ? 1 : -1
  const orderIndex = new Map(
    participantOrder.map((participantId, index) => [participantId, index]),
  )
  fractions.sort((a, b) => {
    const fractionComparison = b.fraction.comparedTo(a.fraction)
    if (fractionComparison !== 0) return fractionComparison
    return (orderIndex.get(b.id) ?? 0) - (orderIndex.get(a.id) ?? 0)
  })

  for (let i = 0; i < diff.abs().toNumber(); i += 1) {
    const participantId = fractions[i % fractions.length]?.id
    if (!participantId) break
    result[participantId] = (result[participantId] ?? 0) + direction
  }

  return result
}

export function calculateShare(
  participantId: string | null,
  expense: ExpenseForShares,
): number {
  if (!participantId) return 0
  return calculateShares(expense)[participantId] ?? 0
}

export function getTotalActiveUserShare(
  activeUserId: string | null,
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): number {
  return expenses.reduce(
    (sum, expense) => sum + calculateShare(activeUserId, expense),
    0,
  )
}
