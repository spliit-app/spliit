import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { groupProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/**
 * Binds a ledger identity to the signed-in account ("this one is me").
 *
 * Membership-gated: `groupProcedure` runs first, so only somebody who can
 * already open the group may answer the question. Without that, any signed-in
 * account could mutate participant rows in a group it cannot read.
 *
 * Two rules, both from the unique `(groupId, userId)` constraint:
 *
 * - Only an unlinked participant can be claimed; silently taking one that
 *   belongs to somebody else would rewrite who owes what to whom.
 * - Claiming a second participant in the same group *moves* the link. Answering
 *   "who are you?" wrongly is a normal mistake and must be correctable, so the
 *   old identity is released in the same transaction rather than leaving the
 *   user stuck with their first answer forever.
 */
export const claimParticipantProcedure = groupProcedure(
  z.object({
    groupId: z.string().min(1),
    participantId: z.string().min(1),
  }),
).mutation(async ({ ctx, input }) => {
  const participant = await prisma.participant.findFirst({
    where: { id: input.participantId, groupId: input.groupId },
    select: { id: true, userId: true, removedAt: true },
  })
  if (!participant || participant.removedAt) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Participant not found.',
    })
  }
  if (participant.userId && participant.userId !== ctx.user.id) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This participant is already linked to another account.',
    })
  }

  try {
    await prisma.$transaction([
      // Release any other identity this user held in this group.
      prisma.participant.updateMany({
        where: {
          groupId: input.groupId,
          userId: ctx.user.id,
          id: { not: participant.id },
        },
        data: { userId: null },
      }),
      prisma.participant.update({
        where: { id: participant.id },
        data: { userId: ctx.user.id },
      }),
    ])
  } catch (error) {
    // Two accounts claiming the same person at once: the constraint wins, but
    // the caller deserves a 409 rather than a Prisma stack trace.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This participant is already linked to another account.',
      })
    }
    throw error
  }

  return { participantId: participant.id }
})
