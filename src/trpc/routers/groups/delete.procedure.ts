import { deleteGroupS3Documents } from '@/app/groups/delete-group-actions'
import { deleteGroupWithDocuments } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      deleteDocuments: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, deleteDocuments } }) => {
    // Delete S3 documents if requested (server action handles env safely)
    if (deleteDocuments) {
      await deleteGroupS3Documents(groupId)
    }

    // Delete the group from database
    await deleteGroupWithDocuments(groupId, deleteDocuments ?? false)
  })
