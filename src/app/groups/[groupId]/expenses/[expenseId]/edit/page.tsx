import { EditExpenseForm } from '@/app/groups/[groupId]/expenses/edit-expense-form'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Expense',
}

export default async function EditExpensePage({
  params: { expenseId },
}: {
  params: { expenseId: string }
}) {
  return (
    <EditExpenseForm
      expenseId={expenseId}
      runtimeFeatureFlags={await getRuntimeFeatureFlags()}
    />
  )
}
