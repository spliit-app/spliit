import { ExpenseForm } from '@/components/expense-form'
import { createExpense, getCategories, getGroup } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Create expense',
}

export default async function ExpensePage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const categories = await getCategories()
  const group = await getGroup(groupId)
  if (!group) notFound()

  async function createExpenseAction(values: unknown) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await createExpense(expenseFormValues, groupId)
    redirect(`/groups/${groupId}`)
  }

  return (
    <ExpenseForm
      group={group}
      categories={categories}
      onSubmit={createExpenseAction}
    />
  )
}
