function assertIntegerMinorUnits(amount: number, label: string) {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be an integer number of minor units`)
  }
}

export function assertExpenseFormIntegerMinorUnits(expenseFormValues: {
  amount: number
  originalAmount?: number | null
  paidFor: Array<{ shares: number | string }>
}) {
  assertIntegerMinorUnits(expenseFormValues.amount, 'amount')
  if (expenseFormValues.originalAmount != null) {
    assertIntegerMinorUnits(expenseFormValues.originalAmount, 'originalAmount')
  }
  for (const paidFor of expenseFormValues.paidFor) {
    assertIntegerMinorUnits(Number(paidFor.shares), 'paidFor.shares')
  }
}
