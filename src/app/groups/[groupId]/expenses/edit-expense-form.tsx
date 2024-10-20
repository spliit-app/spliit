'use client'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { useCurrentGroup } from '../current-group-context'
import { ExpenseForm } from './expense-form'

export function EditExpenseForm({
  expenseId,
  runtimeFeatureFlags,
}: {
  expenseId: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const { groupId, group } = useCurrentGroup()

  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const { data: expenseData } = trpc.groups.expenses.get.useQuery({
    groupId,
    expenseId,
  })
  const expense = expenseData?.expense

  const { mutateAsync: updateExpenseMutateAsync } =
    trpc.groups.expenses.update.useMutation()
  const { mutateAsync: deleteExpenseMutateAsync } =
    trpc.groups.expenses.delete.useMutation()

  const utils = trpc.useUtils()
  const router = useRouter()

  if (!group || !categories || !expense) return null

  return (
    <ExpenseForm
      group={group}
      expense={expense}
      categories={categories}
      onSubmit={async (expenseFormValues, participantId) => {
        await updateExpenseMutateAsync({
          expenseId,
          groupId,
          expenseFormValues,
          participantId,
        })
        utils.groups.expenses.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      onDelete={async (participantId) => {
        await deleteExpenseMutateAsync({
          expenseId,
          groupId,
          participantId,
        })
        utils.groups.expenses.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      runtimeFeatureFlags={runtimeFeatureFlags}
    />
  )
}
