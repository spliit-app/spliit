import { EditExpenseForm } from '@/app/groups/[groupId]/expenses/edit-expense-form'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Expense',
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>
}) {
  const { groupId, expenseId } = await params
  return (
    <EditExpenseForm
      groupId={groupId}
      expenseId={expenseId}
      runtimeFeatureFlags={await getRuntimeFeatureFlags()}
    />
  )
}
