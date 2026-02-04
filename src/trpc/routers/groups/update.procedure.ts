import { updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/session'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const updateGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupFormValues: groupFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, groupFormValues, participantId } }) => {
    // Get session from request headers
    const session = await getSessionFromHeaders()
    
    if (!session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update a group',
      })
    }

    // Check if user has this group in their associated groups
    const userGroup = await prisma.anonymousUserGroup.findUnique({
      where: {
        anonymousUserId_groupId: {
          anonymousUserId: session.userId,
          groupId: groupId,
        },
      },
    })

    if (!userGroup) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not authorized to update this group',
      })
    }

    await updateGroup(groupId, groupFormValues, participantId)
  })
