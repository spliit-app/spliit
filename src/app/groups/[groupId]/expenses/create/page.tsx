import { cached } from '@/app/cached-functions'
import { ExpenseForm } from '@/components/expense-form'
import { createExpense, getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { expenseFormSchema } from '@/lib/schemas'
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Create expense',
}

export default async function ExpensePage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const categories = await getCategories()
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  async function createExpenseAction(values: unknown) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await createExpense(expenseFormValues, groupId)
    redirect(`/groups/${groupId}`)
  }

  async function getEnvOnServer() {
    'use server'
    return env;
  }

  return (
    <Suspense>
      <ExpenseForm
        group={group}
        categories={categories}
        onSubmit={createExpenseAction}
        env={await getEnvOnServer()}
      />
    </Suspense>
  )
}
