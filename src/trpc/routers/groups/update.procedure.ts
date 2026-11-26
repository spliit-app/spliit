import { updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { asGroupFormError } from '@/lib/trpc-errors'
import { groupOwnerProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Owner-only: renaming the group, changing its currency and editing the roster
 * are structural decisions. A plain member can add expenses and settle up, which
 * is what the group is for; they cannot rewrite who is in it.
 */
export const updateGroupProcedure = groupOwnerProcedure(
  z.object({
    groupId: z.string().min(1),
    groupFormValues: groupFormSchema,
  }),
).mutation(async ({ ctx, input: { groupId, groupFormValues } }) => {
  try {
    await updateGroup(
      groupId,
      groupFormValues,
      ctx.group.participantId ?? undefined,
    )
  } catch (error) {
    throw asGroupFormError(error)
  }
})
