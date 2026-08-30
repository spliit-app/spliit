import { adminRouter } from '@/trpc/routers/admin'
import { authRouter } from '@/trpc/routers/auth'
import { categoriesRouter } from '@/trpc/routers/categories'
import { groupsRouter } from '@/trpc/routers/groups'
import { inferRouterOutputs } from '@trpc/server'
import { createTRPCRouter } from '../init'

export const appRouter = createTRPCRouter({
  groups: groupsRouter,
  categories: categoriesRouter,
  auth: authRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
export type AppRouterOutput = inferRouterOutputs<AppRouter>
