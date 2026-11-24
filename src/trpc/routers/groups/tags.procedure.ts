import { deleteGroupTag, getGroupTags } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupTagsProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1).max(64) }))
  .query(async ({ input: { groupId } }) => ({
    tags: await getGroupTags(groupId),
  }))

export const deleteGroupTagProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1).max(64),
      tagId: z.string().min(1).max(64),
    }),
  )
  .mutation(async ({ input: { groupId, tagId } }) => {
    await deleteGroupTag(groupId, tagId)
    return {}
  })
