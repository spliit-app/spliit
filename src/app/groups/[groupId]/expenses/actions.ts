'use server'
import { createExpense, deleteExpense, updateExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { redirect } from 'next/navigation'

export async function createExpenseAction(groupId: string, values: unknown) {
  'use server'
  const expenseFormValues = expenseFormSchema.parse(values)
  await createExpense(expenseFormValues, groupId)
  redirect(`/groups/${groupId}`)
}

export async function updateExpenseAction(
  groupId: string,
  expenseId: string,
  values: unknown,
) {
  'use server'
  const expenseFormValues = expenseFormSchema.parse(values)
  await updateExpense(groupId, expenseId, expenseFormValues)
  redirect(`/groups/${groupId}`)
}

export async function deleteExpenseAction(groupId: string, expenseId: string) {
  'use server'
  await deleteExpense(expenseId)
  redirect(`/groups/${groupId}`)
}
