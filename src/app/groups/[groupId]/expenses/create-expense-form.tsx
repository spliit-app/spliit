'use client'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { randomId } from '@/lib/random'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ExpenseForm } from './expense-form'

export function CreateExpenseForm({
  groupId,
  runtimeFeatureFlags,
}: {
  groupId: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const group = groupData?.group

  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const { mutateAsync: createExpenseMutateAsync } =
    trpc.groups.expenses.create.useMutation()

  // Minted here rather than on save: the id seeds which participant takes the
  // leftover minor unit of an uneven split (see `getExpenseShares`), so the
  // form needs it to preview the split the expense will actually be saved
  // with. Per mount, so a fresh visit to the page gets a fresh id.
  const [expenseId] = useState(() => randomId())

  const utils = trpc.useUtils()
  const router = useRouter()

  if (!group || !categories) return null

  return (
    <ExpenseForm
      group={group}
      categories={categories}
      expenseId={expenseId}
      onSubmit={async (expenseFormValues, participantId) => {
        await createExpenseMutateAsync({
          groupId,
          expenseFormValues,
          participantId,
          expenseId,
        })
        utils.groups.expenses.invalidate()
        utils.groups.stats.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      runtimeFeatureFlags={runtimeFeatureFlags}
    />
  )
}
