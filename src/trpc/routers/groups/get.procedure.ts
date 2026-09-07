import { getGroup } from '@/lib/api'
import { isGroupUnlocked } from '@/lib/group-access'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getGroupProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId } }) => {
    const group = await getGroup(groupId)
    if (!group) return { group: null, locked: false as const }
    if (group.hasPin && !(await isGroupUnlocked(groupId))) {
      return {
        locked: true as const,
        group: {
          ...group,
          information: null,
          participants: [],
        },
      }
    }
    return { group, locked: false as const }
  })
