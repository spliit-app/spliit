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

export function getTotalActiveUserShare(
  activeUserId: string | null,
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>,
): number {
  let total = 0

  expenses.forEach((expense) => {
    if (expense.isReimbursement) return

    const paidFors = expense.paidFor
    const userPaidFor = paidFors.find(
      (paidFor) => paidFor.participant.id === activeUserId,
    )

    if (!userPaidFor) {
      // If the active user is not involved in the expense, skip it
      return
    }

    switch (expense.splitMode) {
      case 'EVENLY':
        // Divide the total expense evenly among all participants
        total += expense.amount / paidFors.length
        break
      case 'BY_AMOUNT':
        // Directly add the user's share if the split mode is BY_AMOUNT
        total += userPaidFor.shares
        break
      case 'BY_PERCENTAGE':
        // Calculate the user's share based on their percentage of the total expense
        total += (expense.amount * userPaidFor.shares) / 10000 // Assuming shares are out of 10000 for percentage
        break
      case 'BY_SHARES':
        // Calculate the user's share based on their shares relative to the total shares
        const totalShares = paidFors.reduce(
          (sum, paidFor) => sum + paidFor.shares,
          0,
        )
        total += (expense.amount * userPaidFor.shares) / totalShares
        break
    }
  })

  return parseFloat(total.toFixed(2))
}
