import { prisma } from '@/lib/prisma'
import { groupOwnerProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/**
 * Promotes or demotes a member.
 *
 * Demoting the last owner is refused for the same reason removing them is: the
 * group would be left unmanageable.
 */
export const setMemberRoleProcedure = groupOwnerProcedure(
  z.object({
    groupId: z.string().min(1),
    userId: z.string().min(1),
    role: z.enum(['OWNER', 'MEMBER']),
  }),
).mutation(async ({ input: { groupId, userId, role } }) => {
  const target = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { role: true, status: true },
  })
  if (!target || target.status !== 'ACTIVE') {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' })
  }

  if (role === 'MEMBER' && target.role === 'OWNER') {
    const owners = await prisma.groupMembership.count({
      where: { groupId, role: 'OWNER', status: 'ACTIVE' },
    })
    if (owners <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'The last owner cannot be demoted. Promote somebody else to owner first.',
      })
    }
  }

  await prisma.groupMembership.update({
    where: { groupId_userId: { groupId, userId } },
    data: { role },
  })
  return {}
})
