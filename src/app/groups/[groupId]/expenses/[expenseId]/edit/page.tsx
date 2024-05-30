import { cached } from '@/app/cached-functions'
import { ExpenseForm } from '@/components/expense-form'
import {
  deleteExpense,
  getCategories,
  getExpense,
  getExpenseActivity,
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

  async function updateExpenseAction(values: unknown, participantId?: string) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await updateExpense(groupId, expenseId, expenseFormValues, participantId)
    redirect(`/groups/${groupId}`)
  }

  async function deleteExpenseAction(participantId?: string) {
    'use server'
    await deleteExpense(groupId, expenseId, participantId)
    redirect(`/groups/${groupId}`)
  }

  const activities = await getExpenseActivity(expenseId)

  return (
    <Suspense>
      <ExpenseForm
        group={group}
        expense={expense}
        categories={categories}
        activities={activities}
        onSubmit={updateExpenseAction}
        onDelete={deleteExpenseAction}
        runtimeFeatureFlags={await getRuntimeFeatureFlags()}
      />
    </Suspense>
  )
}
