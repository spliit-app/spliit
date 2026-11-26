/**
 * tRPC clients for the suite, plus the per-step recording of everything
 * deterministic.
 *
 * These are built with the real `@trpc/client` links and the same superjson +
 * Decimal serializer the app registers in src/trpc/client.tsx. Hand-rolling the
 * `/api/trpc` URL and input encoding would work today and drift tomorrow; going
 * through the actual client means the request on the wire is the request the
 * browser makes.
 *
 * `batched` mirrors the app, which uses `httpBatchLink`: several procedures
 * fired together arrive as one HTTP request. `single` is for steps that measure
 * one procedure on its own.
 */
import type { AppRouter } from '@/trpc/routers/_app'
import { createTRPCClient, httpBatchLink, httpLink } from '@trpc/client'
import superjson from 'superjson'
import { baseUrl } from './config'

/**
 * The server tags `Prisma.Decimal` values as `decimal.js` (src/trpc/init.ts),
 * and superjson throws on an unregistered custom type. The app's client rebuilds
 * a real Decimal; this one keeps the string, because the suite only ever counts
 * rows and bytes and never does arithmetic on a payload.
 *
 * A pass-through rather than an import of `@/generated/prisma/client`: the
 * generated Prisma 7 client is ESM-only and cannot be required from the
 * CommonJS context tsx gives these scripts.
 */
superjson.registerCustom<string, string>(
  {
    // The benchmark client never sends a Decimal, only receives one.
    isApplicable: (value): value is string => false,
    serialize: (value) => value,
    deserialize: (value) => value,
  },
  'decimal.js',
)

/** What one step's HTTP traffic cost, independent of how fast it was. */
export type Recording = {
  /** HTTP requests issued. Batching means this is usually 1 even for 3 procedures. */
  requests: number
  /** Total response bytes. Catches over-fetching to the client. */
  bytes: number
  /**
   * Prisma operations the server ran, summed from the `X-Perf-Db-Queries`
   * header. Null when the app is running without PERF_INSTRUMENTATION, which is
   * the normal case outside this suite -- the report renders it as "-" and the
   * budget is skipped rather than failed.
   */
  dbQueries: number | null
  /** Server-side database time in ms, from `Server-Timing: db`. Null as above. */
  dbMs: number | null
}

let current: Recording | null = null

const recordingFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input as RequestInfo, init as RequestInit)
  if (!current) return response

  // Read a clone so the body stays consumable by tRPC itself.
  const body = await response.clone().arrayBuffer()
  current.requests += 1
  current.bytes += body.byteLength

  const queries = response.headers.get('x-perf-db-queries')
  if (queries !== null && queries !== '') {
    current.dbQueries = (current.dbQueries ?? 0) + Number(queries)
  }

  // `Server-Timing: db;dur=12.3`
  const timing = response.headers.get('server-timing')
  const dur = timing?.match(/(?:^|,)\s*db;dur=([0-9.]+)/)?.[1]
  if (dur !== undefined) {
    current.dbMs = (current.dbMs ?? 0) + Number(dur)
  }

  return response
}

const url = `${baseUrl}/api/trpc`

/**
 * The whole /groups area is behind a login wall, so the benchmark signs in
 * before the first step. `headers` is a function because the cookie only exists
 * after `signIn()` has run, which happens once the app is ready -- the clients
 * are constructed at import time.
 */
let sessionCookie: string | null = null

const authHeaders = (): Record<string, string> =>
  sessionCookie ? { cookie: sessionCookie } : {}

const PERF_USER = {
  name: 'Perf Runner',
  email: 'perf@example.test',
  password: 'perf-password-1',
}

async function authRequest(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) return null
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  return cookie || null
}

/**
 * Signs in, creating the benchmark account on first run. Same address every
 * time so repeated runs (and the four-way e2e suite) do not litter the database.
 */
export async function signIn(): Promise<void> {
  if (sessionCookie) return

  sessionCookie =
    (await authRequest('sign-in/email', {
      email: PERF_USER.email,
      password: PERF_USER.password,
    })) ??
    (await authRequest('sign-up/email', {
      email: PERF_USER.email,
      password: PERF_USER.password,
      name: PERF_USER.name,
    }))

  if (!sessionCookie) {
    throw new Error('Could not sign in the perf user (rate limited?)')
  }
}

export const batched = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url,
      fetch: recordingFetch,
      headers: authHeaders,
    }),
  ],
})

export const single = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      transformer: superjson,
      url,
      fetch: recordingFetch,
      headers: authHeaders,
    }),
  ],
})

/** Runs `fn` while recording its HTTP traffic. Not re-entrant; steps run serially. */
export async function withRecording<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; recording: Recording }> {
  if (current) throw new Error('withRecording is not re-entrant')

  const recording: Recording = {
    requests: 0,
    bytes: 0,
    dbQueries: null,
    dbMs: null,
  }
  current = recording
  try {
    const result = await fn()
    return { result, recording }
  } finally {
    current = null
  }
}

/** Polls the app's readiness endpoint until it serves, or throws. */
export async function waitForApp(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError = 'no attempt made'

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/readiness`)
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`App at ${baseUrl} never became ready (${lastError})`)
}
