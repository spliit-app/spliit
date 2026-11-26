'use client'

import { authClient } from '@/lib/auth-client'
import { trpc } from '@/trpc/client'
import { useCallback } from 'react'

/**
 * Binds "who are you?" answers to the signed-in account.
 *
 * The active participant is chosen in the browser and kept in localStorage, and
 * it stays that way: it is a UI preference. But when the visitor is signed in,
 * the same answer is *also* recorded server-side, which is what lets a settle-up
 * reminder reach them in the header from any device.
 *
 * Failures are swallowed on purpose: claiming is a convenience, and a conflict
 * (someone else already claimed that participant) must never block the expense
 * flow the user was in the middle of.
 */
export function useClaimParticipant(groupId: string) {
  const { data: session } = authClient.useSession()
  const utils = trpc.useUtils()
  const { mutate } = trpc.account.claimParticipant.useMutation({
    onSuccess: () => {
      utils.account.notifications.invalidate()
      utils.account.me.invalidate()
    },
    onError: () => {},
  })

  return useCallback(
    (participantId: string | null | undefined) => {
      if (!session || !participantId || participantId === 'None') return
      mutate({ groupId, participantId })
    },
    [session, groupId, mutate],
  )
}
