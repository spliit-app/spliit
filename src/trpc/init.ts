import { Prisma } from '@/generated/prisma/client'
import { getCurrentSession } from '@/lib/auth/session'
import { AuthUser } from '@/lib/auth/types'
import { UserTier } from '@/lib/enums'
import { initTRPC, TRPCError } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (v): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

export type TRPCContext = {
  user: AuthUser | null
}

export const createTRPCContext = cache(async (): Promise<TRPCContext> => {
  const user = await getCurrentSession()
  return { user }
})

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const baseProcedure = t.procedure

export const authenticatedProcedure = baseProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be signed in to perform this action.',
      })
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    })
  },
)

export const groupCreatorProcedure = baseProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be signed in to create a group.',
      })
    }

    if (
      ctx.user.tier !== UserTier.GROUP_CREATORS &&
      ctx.user.tier !== UserTier.ADMIN
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          'Group creation requires administrator approval. Your account is currently in the sync users tier.',
      })
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    })
  },
)

export const adminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in as an administrator.',
    })
  }

  if (ctx.user.tier !== UserTier.ADMIN) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action is restricted to administrators.',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})
