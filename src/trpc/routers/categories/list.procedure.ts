import { getCategories } from '../../../lib/api'
import { baseProcedure } from '../../init'

export const listCategoriesProcedure = baseProcedure.query(async () => {
  return { categories: await getCategories() }
})
