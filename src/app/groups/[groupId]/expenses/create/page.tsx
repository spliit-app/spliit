import { ExpenseForm } from '@/components/expense-form'
import { Button } from '@/components/ui/button'
import { createExpense, getGroup } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function ExpensePage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const group = await getGroup(groupId)
  if (!group) notFound()

  async function createExpenseAction(values: unknown) {
    'use server'
    const expenseFormValues = expenseFormSchema.parse(values)
    await createExpense(expenseFormValues, groupId)
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

      <ExpenseForm group={group} onSubmit={createExpenseAction} />
    </main>
  )
}
