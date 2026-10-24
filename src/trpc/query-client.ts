import {
  defaultShouldDehydrateQuery,
  Query,
  QueryClient,
} from '@tanstack/react-query'
import superjson from 'superjson'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  })
}

/** tRPC queries kept in localStorage so the group and expense form open offline. */
const PERSISTED_QUERY_PATHS = new Set([
  'groups.get',
  'groups.getDetails',
  'categories.list',
])

export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000
/** Bump when a persisted query's data shape changes. */
export const PERSIST_BUSTER = 'spliit-offline-v1'
export const PERSIST_KEY = 'spliit-query-cache'

/**
 * tRPC (v11, react-query integration) keys are `[path[], { input, type }]`,
 * e.g. `[['groups', 'get'], { input: { groupId }, type: 'query' }]`.
 */
export function isPersistedQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false
  const [path] = query.queryKey
  return Array.isArray(path) && PERSISTED_QUERY_PATHS.has(path.join('.'))
}
