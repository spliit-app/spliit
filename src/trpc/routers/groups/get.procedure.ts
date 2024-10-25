import { z } from 'zod'
import { getGroup } from '../../../lib/api'
import { baseProcedure } from '../../init'

export const getGroupProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId } }) => {
    const group = await getGroup(groupId)
    return { group }
  })
