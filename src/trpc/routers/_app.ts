import { accountRouter } from '@/trpc/routers/account'
import { categoriesRouter } from '@/trpc/routers/categories'
import { groupsRouter } from '@/trpc/routers/groups'
import { invitesRouter } from '@/trpc/routers/invites'
import { inferRouterOutputs } from '@trpc/server'
import { createTRPCRouter } from '../init'

export const appRouter = createTRPCRouter({
  account: accountRouter,
  groups: groupsRouter,
  invites: invitesRouter,
  categories: categoriesRouter,
})

export type AppRouter = typeof appRouter
export type AppRouterOutput = inferRouterOutputs<AppRouter>
