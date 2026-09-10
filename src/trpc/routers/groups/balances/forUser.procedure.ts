import { getGroup, getGroupExpenses } from '@/lib/api'
import { getBalances } from '@/lib/balances'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Aggregates a user's net balance across several groups at once.
 *
 * The active user is tracked client-side (per group, in local storage), so the
 * client passes the list of `{ groupId, participantId }` pairs it knows about
 * and receives the participant's net balance in each group, together with the
 * group's currency so the client can group amounts by currency.
 */
export const forUserBalancesProcedure = baseProcedure
  .input(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string().min(1),
          participantId: z.string().min(1),
        }),
      ),
    }),
  )
  .query(async ({ input: { groups } }) => {
    const balances = await Promise.all(
      groups.map(async ({ groupId, participantId }) => {
        const group = await getGroup(groupId)
        if (!group) return null

        const participant = group.participants.find(
          (p) => p.id === participantId,
        )
        if (!participant) return null

        const expenses = await getGroupExpenses(groupId)
        const amount = getBalances(expenses)[participantId]?.total ?? 0

        return {
          groupId,
          groupName: group.name,
          currency: group.currency,
          currencyCode: group.currencyCode,
          participantId,
          participantName: participant.name,
          amount,
        }
      }),
    )

    return { balances: balances.filter((balance) => balance !== null) }
  })
