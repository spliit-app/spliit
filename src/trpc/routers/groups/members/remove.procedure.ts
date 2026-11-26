import { revokeMembership } from '@/lib/membership'
import { prisma } from '@/lib/prisma'
import { groupOwnerProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/**
 * Revokes an account's access to the group.
 *
 * This touches `GroupMembership` only: the participant row and every expense it
 * paid or shares stays exactly where it is, which is the whole reason access and
 * ledger identity are separate tables. The removed person still owes what they
 * owe; they simply can no longer open the group to see it.
 */
export const removeMemberProcedure = groupOwnerProcedure(
  z.object({
    groupId: z.string().min(1),
    userId: z.string().min(1),
  }),
).mutation(async ({ input: { groupId, userId } }) => {
  const target = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true, status: true },
  })
  if (!target || target.status !== 'ACTIVE') {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' })
  }

  if (target.role === 'OWNER') {
    // A group with no owner can never be renamed, deleted or re-populated, so
    // the last owner stepping down is refused rather than allowed to orphan it.
    const owners = await prisma.groupMembership.count({
      where: { groupId, role: 'OWNER', status: 'ACTIVE' },
    })
    if (owners <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'The last owner cannot be removed. Promote somebody else to owner first.',
      })
    }
  }

  await revokeMembership(groupId, userId)
  return {}
})
