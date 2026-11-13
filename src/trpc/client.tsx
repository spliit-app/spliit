'use client'

// <-- to make sure we can mount the Provider from a server component
import { Prisma } from '@/generated/prisma/browser'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useEffect, useState } from 'react'
import superjson from 'superjson'
import {
  isPersistedQuery,
  makeQueryClient,
  PERSIST_BUSTER,
  PERSIST_KEY,
  PERSIST_MAX_AGE,
} from './query-client'
import type { AppRouter } from './routers/_app'

// The browser-safe namespace exports `Decimal` as a value only, so derive the
// instance type from it.
type Decimal = InstanceType<typeof Prisma.Decimal>

superjson.registerCustom<Decimal, string>(
  {
    isApplicable: (v): v is Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

export const trpc = createTRPCReact<AppRouter>()

let clientQueryClientSingleton: QueryClient

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= makeQueryClient())
}

export const trpcClient = getQueryClient()

function getUrl() {
  const base = (() => {
    if (typeof window !== 'undefined') return ''
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return 'http://localhost:3000'
  })()
  return `${base}/api/trpc`
}

// Only groups.get, groups.getDetails and categories.list are saved, so the
// group and the expense form can render offline. On the server, storage is
// undefined and the persister does nothing.
const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: PERSIST_KEY,
  // Dehydrated query data is already superjson-encoded by the query client's
  // dehydrate defaults; superjson here keeps the envelope round-trip exact too.
  serialize: (client) => superjson.stringify(client),
  deserialize: (cached) => superjson.parse(cached),
})

const persistOptions = {
  persister,
  maxAge: PERSIST_MAX_AGE,
  buster: PERSIST_BUSTER,
  dehydrateOptions: { shouldDehydrateQuery: isPersistedQuery },
}

export function TRPCProvider(
  props: Readonly<{
    children: React.ReactNode
  }>,
) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient()
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: getUrl(),
        }),
      ],
    }),
  )
  // Restore the saved queries in the background rather than with
  // PersistQueryClientProvider. That provider pauses every query while it
  // restores, so `isLoading` reads false with no data, and a form such as
  // group settings briefly renders (and could submit) empty defaults.
  useEffect(() => {
    const [unsubscribe] = persistQueryClient({ queryClient, ...persistOptions })
    return unsubscribe
  }, [queryClient])
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
