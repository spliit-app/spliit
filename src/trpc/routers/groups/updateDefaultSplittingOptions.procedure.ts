import {
  defaultSplittingOptionsSchema,
  hasOnlyGroupParticipants,
} from '@/lib/default-splitting-options'
import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const updateDefaultSplittingOptionsProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      defaultSplittingOptions: defaultSplittingOptionsSchema,
    }),
  )
  .mutation(async ({ input: { groupId, defaultSplittingOptions } }) => {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { participants: { select: { id: true } } },
    })
    if (!group) throw new TRPCError({ code: 'NOT_FOUND' })
    if (
      !hasOnlyGroupParticipants(
        defaultSplittingOptions.paidFor,
        group.participants.map(({ id }) => id),
      )
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid group participants',
      })
    }
    await prisma.group.update({
      where: { id: groupId },
      data: { defaultSplittingOptions },
    })
  })
