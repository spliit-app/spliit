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

    // The transport is read through a ref so that `sendEvent` below can have an
    // empty dependency array. `TrackPage` passes `sendEvent` to a `useEffect`
    // dependency array, and group pages re-render on every tRPC refetch, so an
    // identity that changed between renders would re-send the pageview every
    // time. Keeping the indirection here means a provider cannot reintroduce
    // that by returning a new function on each render.
    const transportRef = useRef(transport)
    useEffect(() => {
      transportRef.current = transport
    }, [transport])

    const sendEvent = useCallback<SendEvent>(({ event, props }, path = '/') => {
      // Anonymized here, once, between the call sites and every provider: no
      // caller can leak an ID by passing a path built from `groupId`, and no
      // provider has to remember to scrub it.
      const url = `${window.location.origin}${anonymizePath(path)}`
      transportRef.current(event, props, url)
    }, [])

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
