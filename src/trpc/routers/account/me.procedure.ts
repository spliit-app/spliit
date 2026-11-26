import { prisma } from '@/lib/prisma'
import { protectedProcedure } from '@/trpc/init'

export const meProcedure = protectedProcedure.query(async ({ ctx }) => {
  const participants = await prisma.participant.findMany({
    // Scoped to groups the account can still open: a participant row survives a
    // revocation (the ledger needs it), but a removed member should not keep
    // seeing that group in "my balances".
    where: {
      userId: ctx.user.id,
      removedAt: null,
      group: {
        memberships: { some: { userId: ctx.user.id, status: 'ACTIVE' } },
      },
    },
    select: {
      id: true,
      name: true,
      groupId: true,
      group: { select: { id: true, name: true } },
    },
  })
  return {
    user: {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
    },
    participants,
  }
})
