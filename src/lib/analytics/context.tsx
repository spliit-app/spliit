import { anonymizePath } from '@/lib/analytics/anonymize-path'
import {
  AnalyticsProviderComponent,
  AnalyticsProviderDefinition,
  SendEvent,
} from '@/lib/analytics/types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'

const AnalyticsContext = createContext<SendEvent | null>(null)

/**
 * Module-level constant, so that the disabled case is referentially stable too:
 * see the comment about dependency arrays in `createAnalyticsProvider`.
 */
const noSendEvent: SendEvent = () => {}

/**
 * Unlike `useCurrentGroup`, this deliberately does not throw when there is no
 * provider above it. Analytics is disabled by default, and call sites are
 * expected to send events unconditionally; without a provider they no-op.
 */
export const useAnalytics = (): SendEvent =>
  useContext(AnalyticsContext) ?? noSendEvent

/**
 * Builds the React component for a provider: injects its script, anonymizes and
 * forwards events, and exposes `sendEvent` through the context.
 */
export function createAnalyticsProvider({
  Script,
  useTransport,
}: AnalyticsProviderDefinition): AnalyticsProviderComponent {
  return function AnalyticsProvider({ options, children }) {
    const transport = useTransport(options)

    // When several providers are configured they nest (see `Analytics`), and
    // each forwards every event to the one above it. The outermost has none.
    const parentSendEvent = useContext(AnalyticsContext)

    // The transport is read through a ref so that `sendEvent` below can have a
    // stable identity. `TrackPage` passes `sendEvent` to a `useEffect`
    // dependency array, and group pages re-render on every tRPC refetch, so an
    // identity that changed between renders would re-send the pageview every
    // time. Keeping the indirection here means a provider cannot reintroduce
    // that by returning a new function on each render.
    const transportRef = useRef(transport)
    useEffect(() => {
      transportRef.current = transport
    }, [transport])

    const sendEvent = useCallback<SendEvent>(
      (analyticsEvent, path = '/') => {
        // Anonymized here, once per provider, between the call sites and the
        // transport: no caller can leak an ID by passing a path built from
        // `groupId`, and no provider has to remember to scrub it.
        const url = `${window.location.origin}${anonymizePath(path)}`
        transportRef.current(analyticsEvent.event, analyticsEvent.props, url)
        parentSendEvent?.(analyticsEvent, path)
      },
      // The parent's `sendEvent` is memoized exactly like this one, so this
      // dependency never changes and the identity stays stable.
      [parentSendEvent],
    )

    return (
      <>
        {Script && <Script options={options} />}
        <AnalyticsContext.Provider value={sendEvent}>
          {children}
        </AnalyticsContext.Provider>
      </>
    )
  }
}
