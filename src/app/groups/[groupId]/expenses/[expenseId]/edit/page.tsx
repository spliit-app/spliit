import { ExpenseForm } from '@/components/expense-form'
import { Button } from '@/components/ui/button'
import { getExpense, getGroup, updateExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function EditExpensePage({
  params: { groupId, expenseId },
}: {
  params: { groupId: string; expenseId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()
  const expense = await getExpense(groupId, expenseId)
  if (!expense) notFound()

  async function updateExpenseAction(values: unknown) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await updateExpense(groupId, expenseId, expenseFormValues)
    redirect(`/groups/${groupId}`)
  }

  return (
    <main>
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href={`/groups/${groupId}`}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to group
          </Link>
        </Button>
      </div>
      <ExpenseForm
        group={group}
        expense={expense}
        onSubmit={updateExpenseAction}
      />
    </main>
  )
}
