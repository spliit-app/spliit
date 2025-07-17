import { createTRPCRouter } from '@/trpc/init'
import { listCategoriesProcedure } from '@/trpc/routers/categories/list.procedure'

export const categoriesRouter = createTRPCRouter({
  list: listCategoriesProcedure,
})
