import { createTRPCRouter } from '../../init'
import { listCategoriesProcedure } from './list.procedure'

export const categoriesRouter = createTRPCRouter({
  list: listCategoriesProcedure,
})
