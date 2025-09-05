import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { SplitMode } from '@prisma/client'

export const updateDefaultSplittingOptionsProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      defaultSplittingOptions: z.object({
        splitMode: z.enum(Object.values(SplitMode) as [SplitMode, ...SplitMode[]]),
        paidFor: z
          .array(
            z.object({
              participant: z.string(),
              shares: z.number(),
            }),
          )
          .nullable(),
      }),
    }),
  )
  .mutation(async ({ input: { groupId, defaultSplittingOptions } }) => {
    await prisma.group.update({
      where: { id: groupId },
      data: { defaultSplittingOptions },
    })
  })