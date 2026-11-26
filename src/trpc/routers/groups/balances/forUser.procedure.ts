import { getGroup, getGroupExpenses } from '@/lib/api'
import { getBalances } from '@/lib/balances'
import { MAX_GROUPS_PER_QUERY } from '@/lib/group-query-limits'
import { prisma } from '@/lib/prisma'
import { protectedProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Aggregates a member's net balance across several groups at once.
 *
 * The client passes `{ groupId, participantId }` pairs, but neither part is
 * trusted: the query is scoped to groups the caller is a member of, and the
 * participant is re-resolved from `Participant.userId` inside each one. A pair
 * naming somebody else's participant is answered with `null` (filtered out)
 * rather than that person's balance.
 */
export const forUserBalancesProcedure = protectedProcedure
  .input(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().min(1).max(64),
            // Retained for client compatibility; ignored, see above.
            participantId: z.string().max(64).optional(),
          }),
        )
        .max(MAX_GROUPS_PER_QUERY),
    }),
  )
  .query(async ({ ctx, input: { groups } }) => {
    const groupIds = [...new Set(groups.map(({ groupId }) => groupId))]
    if (groupIds.length === 0) return { balances: [] }

    const memberships = await prisma.groupMembership.findMany({
      where: {
        groupId: { in: groupIds },
        userId: ctx.user.id,
        status: 'ACTIVE',
      },
      select: { groupId: true },
    })
    const allowedGroupIds = new Set(memberships.map(({ groupId }) => groupId))

    const balances = await Promise.all(
      groupIds
        .filter((groupId) => allowedGroupIds.has(groupId))
        .map(async (groupId) => {
          const [group, participant] = await Promise.all([
            getGroup(groupId),
            prisma.participant.findUnique({
              where: {
                groupId_userId: { groupId, userId: ctx.user.id },
              },
              select: { id: true, name: true, removedAt: true },
            }),
          ])
          if (!group || !participant || participant.removedAt) return null

          const expenses = await getGroupExpenses(groupId)
          const amount = getBalances(expenses)[participant.id]?.total ?? 0

          return {
            groupId,
            groupName: group.name,
            currency: group.currency,
            currencyCode: group.currencyCode,
            participantId: participant.id,
            participantName: participant.name,
            amount,
          }
        }),
    )

    return { balances: balances.filter((balance) => balance !== null) }
  })
