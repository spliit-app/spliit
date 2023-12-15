'use server'
import { createExpense, deleteExpense, updateExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { revalidatePath } from 'next/cache'

export async function createExpenseAction(groupId: string, values: unknown) {
  'use server'
  const expenseFormValues = expenseFormSchema.parse(values)
  await createExpense(expenseFormValues, groupId)
  revalidatePath(`/groups/${groupId}`, 'layout')
}

export async function updateExpenseAction(
  groupId: string,
  expenseId: string,
  values: unknown,
) {
  'use server'
  const expenseFormValues = expenseFormSchema.parse(values)
  await updateExpense(groupId, expenseId, expenseFormValues)
  revalidatePath(`/groups/${groupId}`, 'layout')
}

export async function deleteExpenseAction(groupId: string, expenseId: string) {
  'use server'
  await deleteExpense(expenseId)
  revalidatePath(`/groups/${groupId}`, 'layout')
}
