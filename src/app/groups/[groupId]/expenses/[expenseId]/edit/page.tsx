import { cached } from '@/app/cached-functions'
import { ExpenseForm } from '@/components/expense-form'
import {
  deleteExpense,
  getCategories,
  getExpense,
  updateExpense,
} from '@/lib/api'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { expenseFormSchema } from '@/lib/schemas'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Edit expense',
}

export default async function EditExpensePage({
  params: { groupId, expenseId },
}: {
  params: { groupId: string; expenseId: string }
}) {
  const categories = await getCategories()
  const group = await cached.getGroup(groupId)
  if (!group) notFound()
  const expense = await getExpense(groupId, expenseId)
  if (!expense) notFound()

  async function updateExpenseAction(values: unknown) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await updateExpense(groupId, expenseId, expenseFormValues)
    redirect(`/groups/${groupId}`)
  }

  async function deleteExpenseAction() {
    'use server'
    await deleteExpense(groupId, expenseId)
    redirect(`/groups/${groupId}`)
  }


  return (
    <Suspense>
      <ExpenseForm
        group={group}
        expense={expense}
        categories={categories}
        onSubmit={updateExpenseAction}
        onDelete={deleteExpenseAction}
        runtimeFeatureFlags={await getRuntimeFeatureFlags()}
      />
    </Suspense>
  )
}
