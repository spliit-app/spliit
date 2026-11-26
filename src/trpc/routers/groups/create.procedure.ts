import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { asGroupFormError } from '@/lib/trpc-errors'
import { protectedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupProcedure = protectedProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ ctx, input: { groupFormValues } }) => {
    try {
      const group = await createGroup(groupFormValues, ctx.user.id)
      return { groupId: group.id }
    } catch (error) {
      throw asGroupFormError(error)
    }
  })
