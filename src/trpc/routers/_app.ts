import { inferRouterOutputs } from '@trpc/server'
import { createTRPCRouter } from '../init'
import { categoriesRouter } from './categories'
import { groupsRouter } from './groups'

export const appRouter = createTRPCRouter({
  groups: groupsRouter,
  categories: categoriesRouter,
})

export type AppRouter = typeof appRouter
export type AppRouterOutput = inferRouterOutputs<AppRouter>
