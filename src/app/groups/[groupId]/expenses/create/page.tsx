import { CreateExpenseForm } from '@/app/groups/[groupId]/expenses/create-expense-form'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('ExpenseForm')

  return {
    title: t('Expense.create'),
  }
}

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return (
    <CreateExpenseForm
      groupId={groupId}
      runtimeFeatureFlags={await getRuntimeFeatureFlags()}
    />
  )
}
