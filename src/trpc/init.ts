import { initTRPC } from '@trpc/server'
import { cache } from 'react'
import superjson from 'superjson'
import { supabase } from '~/lib/supabase'

export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    user,
    supabase,
  }
})

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
})

// Base router and procedure helpers
export const createTRPCRouter = t.router
export const baseProcedure = t.procedure
