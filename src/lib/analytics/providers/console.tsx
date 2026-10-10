import { createAnalyticsProvider } from '@/lib/analytics/context'
import { AnalyticsTransport } from '@/lib/analytics/types'

/**
 * Example provider: logs every event to the browser console and sends nothing
 * anywhere. Select it with `ANALYTICS_PROVIDER=console` to check what the app
 * would report — the logged URL is the anonymized one providers receive.
 *
 * It is also the shortest possible template for a real provider: implement a
 * transport, and add a `Script` component if yours needs to load an SDK.
 */
const consoleTransport: AnalyticsTransport = (event, props, url) => {
  console.info('[analytics]', event, props, url)
}

export const ConsoleAnalyticsProvider = createAnalyticsProvider({
  // Nothing to load: this provider talks to the console only.
  useTransport: () => consoleTransport,
})
