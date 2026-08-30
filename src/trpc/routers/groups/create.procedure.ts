import { createGroup } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { groupFormSchema } from '@/lib/schemas'
import { groupCreatorProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupProcedure = groupCreatorProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ ctx, input: { groupFormValues } }) => {
    const group = await createGroup(groupFormValues)

    if (ctx.user) {
      await prisma.userGroup.upsert({
        where: {
          userId_groupId: {
            userId: ctx.user.id,
            groupId: group.id,
          },
        },
        create: {
          userId: ctx.user.id,
          groupId: group.id,
        },
        update: {},
      })
    }

    return { groupId: group.id }
  })
