import { createTRPCRouter } from '@/trpc/init'
import { getGroupInformationProcedure } from '@/trpc/routers/groups/information/get.procedure'

export const groupInformationRouter = createTRPCRouter({
  get: getGroupInformationProcedure,
})
