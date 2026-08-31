import {
  PERF_INSTRUMENTATION_ENABLED,
  type PerfCounters,
  withPerfCounters,
} from '@/lib/perf-instrumentation'
import { createTRPCContext } from '@/trpc/init'
import { appRouter } from '@/trpc/routers/_app'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

const handleRequest = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  })

/**
 * Reports how much database work the request did, for the `perf/` suite.
 * Off unless PERF_INSTRUMENTATION=1, which only compose.perf.yaml sets.
 */
const handler = async (req: Request) => {
  if (!PERF_INSTRUMENTATION_ENABLED) return handleRequest(req)

  const counters: PerfCounters = { queries: 0, dbMs: 0 }
  const response = await withPerfCounters(counters, () => handleRequest(req))

  // tRPC builds this Response itself, so its headers are mutable -- but a
  // response constructed from a fetch would not be, and this must never be the
  // reason a request fails.
  try {
    response.headers.set('x-perf-db-queries', String(counters.queries))
    response.headers.set('server-timing', `db;dur=${counters.dbMs.toFixed(1)}`)
    return response
  } catch {
    const headers = new Headers(response.headers)
    headers.set('x-perf-db-queries', String(counters.queries))
    headers.set('server-timing', `db;dur=${counters.dbMs.toFixed(1)}`)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

export { handler as GET, handler as POST }
