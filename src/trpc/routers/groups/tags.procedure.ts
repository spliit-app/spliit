import { deleteGroupTag, getGroupTags } from '@/lib/api'
import { tagNameSchema } from '@/lib/tags'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupTagsProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1).max(64) }))
  .query(async ({ input: { groupId } }) => ({
    tags: await getGroupTags(groupId),
  }))

export const deleteGroupTagProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1).max(64), name: tagNameSchema }))
  .mutation(async ({ input: { groupId, name } }) => {
    await deleteGroupTag(groupId, name)
    return {}
  })
