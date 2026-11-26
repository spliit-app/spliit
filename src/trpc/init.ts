import { Prisma } from '@/generated/prisma/client'
import { auth } from '@/lib/auth'
import { getGroupAccess } from '@/lib/membership'
import { initTRPC, TRPCError } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'
import type { z } from 'zod'

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (v): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

/**
 * The session is resolved once per request, from the cookie headers, and handed
 * to every procedure as `ctx.user` (null when signed out).
 *
 * Resolving it here rather than per procedure means the answer cannot differ
 * between two procedures of the same batch, and the database is hit once.
 */
export const createTRPCContext = cache(
  async (opts: { headers: Headers } = { headers: new Headers() }) => {
    const session = await auth.api.getSession({ headers: opts.headers })
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    }
  },
)

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<TRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
})

// Base router and procedure helpers
export const createTRPCRouter = t.router

/**
 * Public: usable signed out.
 *
 * Deliberately kept for `categories.list` only, which returns reference data
 * (category names) and touches no group. Every group procedure goes through
 * `groupProcedure` instead.
 */
export const baseProcedure = t.procedure

/** Requires a signed-in user; `ctx.user` is non-null inside the resolver. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Log in required.' })
  }
  return next({ ctx: { user: ctx.user, session: ctx.session } })
})

type GroupIdInput = { groupId: string }

/**
 * Requires an ACTIVE membership of the group named by the procedure's own input.
 *
 * The parser is a parameter rather than an earlier `.input()` call on purpose:
 * tRPC runs middleware in registration order, and an input parser registered
 * *after* a `.use()` has not run yet when that middleware executes. Wrapping the
 * schema guarantees the check sees validated input.
 *
 * This is the authorization half of the login wall. Before it existed, every
 * group procedure was merely *authenticated*: any signed-in account that knew
 * (or guessed) a group id could read and mutate it, which made the group URL the
 * effective permission.
 *
 * A non-member is answered with NOT_FOUND rather than FORBIDDEN: FORBIDDEN would
 * confirm that the id names a real group, turning every endpoint into an
 * existence oracle for anyone with an account.
 */
export function groupProcedure<TSchema extends z.ZodType<GroupIdInput>>(
  schema: TSchema,
) {
  return protectedProcedure.input(schema).use(async ({ ctx, input, next }) => {
    const access = await getGroupAccess(input.groupId, ctx.user.id)
    if (!access) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
    }

    return next({
      ctx: { ...ctx, group: { groupId: input.groupId, ...access } },
    })
  })
}

/**
 * Requires the OWNER role. FORBIDDEN is safe here because the caller has already
 * proved they are a member, so nothing is leaked by saying no.
 */
export function groupOwnerProcedure<TSchema extends z.ZodType<GroupIdInput>>(
  schema: TSchema,
) {
  return groupProcedure(schema).use(({ ctx, next }) => {
    if (ctx.group.membership.role !== 'OWNER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the group owner can do that.',
      })
    }
    return next()
  })
}

/**
 * The participant to attribute an action to, resolved server-side.
 *
 * `Participant.userId` is the authority: a caller cannot act as somebody else by
 * passing their id, which is what the old client-supplied `participantId`
 * allowed. A member with no linked participant (an administrator) falls back to
 * no attribution rather than to a forged one.
 */
export function actingParticipantId(ctx: {
  group: { participantId: string | null }
}): string | undefined {
  return ctx.group.participantId ?? undefined
}
