import { deleteGroupS3Documents } from '@/app/groups/delete-group-actions'
import { deleteGroupWithDocuments } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/session'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const deleteGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      deleteDocuments: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, deleteDocuments } }) => {
    // Get session from request headers
    const session = await getSessionFromHeaders()
    
    if (!session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to delete a group',
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
        message: 'You are not authorized to delete this group',
      })
    }

    // Delete S3 documents if requested (server action handles env safely)
    if (deleteDocuments) {
      await deleteGroupS3Documents(groupId)
    }

    // Delete the group from database
    await deleteGroupWithDocuments(groupId, deleteDocuments ?? false)
  })
