'use client'

import { markSavedOffline } from '@/components/offline-sync'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import {
  enqueueExpense,
  isNetworkError,
  isOfflineQueueSupported,
} from '@/lib/offline-queue'
import { randomId } from '@/lib/random'
import { ExpenseFormValues } from '@/lib/schemas'
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
  // with. Per mount, so a fresh visit to the page gets a fresh id. It also
  // makes the offline queue idempotent: a replay of an expense the server
  // already has is refused as "Expense id already exists".
  const [expenseId, setExpenseId] = useState(() => randomId())

  const utils = trpc.useUtils()
  const router = useRouter()

  if (!group || !categories) return null

  /**
   * Keeps the expense in IndexedDB under its id; `OfflineSync` sends it once
   * the browser is back online. Returns false when it could not be stored.
   */
  const queueOffline = async (
    expenseFormValues: ExpenseFormValues,
    participantId?: string,
  ) => {
    try {
      await enqueueExpense({
        groupId,
        expenseId,
        expenseFormValues,
        participantId,
      })
    } catch {
      return false
    }
    // The client router waits for the network before navigating, so this is
    // a full load served from the service worker's cache; the "saved offline"
    // toast is shown after it.
    markSavedOffline()
    window.location.assign(`/groups/${groupId}/expenses`)
    return true
  }

  return (
    <ExpenseForm
      group={group}
      categories={categories}
      expenseId={expenseId}
      onSubmit={async (expenseFormValues, participantId) => {
        if (
          isOfflineQueueSupported() &&
          !navigator.onLine &&
          (await queueOffline(expenseFormValues, participantId))
        )
          return

        try {
          await createExpenseMutateAsync({
            groupId,
            expenseFormValues,
            participantId,
            expenseId,
          })
        } catch (error) {
          // No answer from the server (a flaky connection that still claims
          // to be online): queue it under the same id. If the server did save
          // it and only the response was lost, the replay is refused as a
          // duplicate and simply dropped from the queue.
          if (
            isOfflineQueueSupported() &&
            isNetworkError(error) &&
            (await queueOffline(expenseFormValues, participantId))
          )
            return
          // The server may have created the expense and only the response
          // been lost; retrying with the same id would then collide with it
          // rather than create anything.
          setExpenseId(randomId())
          throw error
        }
        utils.groups.expenses.invalidate()
        utils.groups.stats.invalidate()
        router.push(`/groups/${group.id}`)
      }}
      runtimeFeatureFlags={runtimeFeatureFlags}
    />
  )
}
