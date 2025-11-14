import Decimal from 'decimal.js'

import { getGroupExpenses } from '@/lib/api'

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
  'amount' | 'paidFor' | 'splitMode' | 'isReimbursement' | 'paidBy'
> & {
  expenseDate?: Expense['expenseDate']
}

export function calculateShares(
  expense: ExpenseForShares,
): Record<string, number> {
  // Algorithm outline:
  // 1. Compute every participant's exact share in minor units (`part`).
  // 2. Truncate toward zero so that the sum never exceeds the available amount.
  // 3. Track how many cents remain (`diff`) after truncation.
  // 4. Distribute the remaining cents one by one to participants based on tie-break rules.
  const result: Record<string, number> = {}
  const amount = new Decimal(expense.amount)

  const totalShares = expense.paidFor.reduce(
    (sum, pf) => sum.add(new Decimal(pf.shares ?? 0)),
    new Decimal(0),
  )

  let sumRounded = new Decimal(0)
  const participantOrder: string[] = []

  expense.paidFor.forEach((pf) => {
    const shares = new Decimal(pf.shares ?? 0)
    let part = new Decimal(0)
    switch (expense.splitMode) {
      case 'EVENLY':
        if (expense.paidFor.length > 0) {
          part = amount.div(expense.paidFor.length)
        }
        break
      case 'BY_AMOUNT':
        part = shares
        break
      case 'BY_PERCENTAGE':
        part = amount.mul(shares).div(10000)
        break
      case 'BY_SHARES':
        if (totalShares.gt(0)) {
          part = amount.mul(shares).div(totalShares)
        }
        break
      default:
        part = new Decimal(0)
    }
    const rounded = part.gte(0) ? part.floor() : part.ceil()
    result[pf.participant.id] = rounded.toNumber()
    sumRounded = sumRounded.add(rounded)
    participantOrder.push(pf.participant.id)
  })

  let diff = amount.minus(sumRounded)
  if (diff.isZero()) {
    return result
  }

  if (expense.splitMode === 'BY_AMOUNT') {
    const payerId =
      expense.paidBy?.id ?? expense.paidFor[0]?.participant.id
    if (payerId) {
      result[payerId] = (result[payerId] ?? 0) + diff.toNumber()
    }
    return result
  }

  if (participantOrder.length === 0) {
    const payerId =
      expense.paidBy?.id ?? expense.paidFor[0]?.participant.id
    if (payerId) {
      result[payerId] = (result[payerId] ?? 0) + diff.toNumber()
    }
    return result
  }

  // Distribute leftover cents by descending fractional parts
  // Compute fractional remainders for each participant based on the exact part
  const fractions: Array<{ id: string; frac: Decimal }> = []
  expense.paidFor.forEach((pf) => {
    const shares = new Decimal(pf.shares ?? 0)
    let part = new Decimal(0)
    switch (expense.splitMode) {
      case 'EVENLY':
        if (expense.paidFor.length > 0) part = amount.div(expense.paidFor.length)
        break
      case 'BY_AMOUNT':
        part = shares
        break
      case 'BY_PERCENTAGE':
        part = amount.mul(shares).div(10000)
        break
      case 'BY_SHARES':
        if (totalShares.gt(0)) part = amount.mul(shares).div(totalShares)
        break
      default:
        part = new Decimal(0)
    }
    const rounded = part.gte(0) ? part.floor() : part.ceil()
    const frac = part.minus(rounded).abs() // magnitude of the truncated fractional part
    fractions.push({ id: pf.participant.id, frac })
  })

  if (!diff.isZero() && participantOrder.length > 0) {
    const direction = diff.gt(0) ? 1 : -1
    let remaining = diff.abs().toNumber()

    // Sort by fractional magnitude desc; tie-breaker by stable participant order
    const orderIndex = new Map<string, number>(
      participantOrder.map((id, idx) => [id, idx]),
    )
    fractions.sort((a, b) => {
      const cmp = b.frac.comparedTo(a.frac)
      if (cmp !== 0) return cmp
      // tie-break by original order: prefer later participants first ("last" gets remainder)
      return (orderIndex.get(b.id) ?? 0) - (orderIndex.get(a.id) ?? 0)
    })

    for (let i = 0; i < remaining; i++) {
      const target = fractions[i % fractions.length]?.id
      if (!target) break
      result[target] = (result[target] ?? 0) + direction
    }
    diff = new Decimal(0)
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
