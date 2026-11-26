import { GroupFormError } from '@/lib/api'
import { TRPCError } from '@trpc/server'

/**
 * Turns the three expected refusals from `createGroup`/`updateGroup` into 4xx
 * answers.
 *
 * A linking problem, an attempt to remove somebody who owns ledger rows, and a
 * stale participant payload are all the caller's mistake; letting them surface as
 * 500s would look like the save silently broke.
 */
export function asGroupFormError(error: unknown): unknown {
  if (error instanceof GroupFormError) {
    return new TRPCError({ code: 'BAD_REQUEST', message: error.message })
  }
  return error
}
