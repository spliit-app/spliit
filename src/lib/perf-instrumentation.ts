import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Per-request counting of database work, for the benchmark suite in `perf/`.
 *
 * Everything here is inert unless `PERF_INSTRUMENTATION=1`, which only
 * `compose.perf.yaml` sets. In every other deployment `enabled` is false, the
 * Prisma client is returned unwrapped, and `/api/trpc` sets no extra headers.
 *
 * It exists because the costliest things the suite needs to watch are invisible
 * from outside: `groups.balances.forUser` runs two queries per group, and
 * `getGroupExpenses` runs an unscoped `createRecurringExpenses()` pass before
 * its own query. Neither changes the response by a single byte, so response
 * size alone cannot catch them regressing.
 */
export const PERF_INSTRUMENTATION_ENABLED =
  process.env['PERF_INSTRUMENTATION'] === '1'

export type PerfCounters = {
  /** Prisma operations run. Not raw SQL statements: one `findMany` with an
   * `include` may issue several but counts once. */
  queries: number
  /** Milliseconds spent inside those operations. */
  dbMs: number
}

const store = new AsyncLocalStorage<PerfCounters>()

/** Runs `fn` with a counter in scope. Anything it awaits counts into `counters`. */
export function withPerfCounters<T>(
  counters: PerfCounters,
  fn: () => Promise<T>,
): Promise<T> {
  return store.run(counters, fn)
}

/** Called by the Prisma extension for each operation. A no-op outside a scope. */
export function recordQuery(durationMs: number): void {
  const counters = store.getStore()
  if (!counters) return
  counters.queries += 1
  counters.dbMs += durationMs
}
