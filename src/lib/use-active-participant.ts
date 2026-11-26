'use client'

import { authClient } from '@/lib/auth-client'
import { useActiveUser } from '@/lib/hooks'

type ParticipantLike = { id: string; userId?: string | null }

/**
 * Which participant is "you" in this group, for wording like "You owe Alice".
 *
 * The browser keeps the answer (`<groupId>-activeUser`) because it also encodes
 * a deliberate "none of these is me". When there is no answer yet, fall back to
 * the participant linked to the signed-in account: the server already knows it,
 * so a new device should not render "Bob owed Alice" to Bob himself.
 */
export function useActiveParticipant(
  groupId: string | undefined,
  participants: ParticipantLike[] | undefined,
): string | null {
  const stored = useActiveUser(groupId)
  const { data: session } = authClient.useSession()

  if (stored) return stored === 'None' ? null : stored

  const linked = session
    ? participants?.find(
        (participant) => participant.userId === session.user.id,
      )
    : undefined
  return linked?.id ?? null
}
