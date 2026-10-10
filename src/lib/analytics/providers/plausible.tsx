import { createAnalyticsProvider } from '@/lib/analytics/context'
import { AnalyticsOptions, AnalyticsTransport } from '@/lib/analytics/types'
import Script from 'next/script'

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string>; u?: string },
    ) => void
  }
}

const DEFAULT_HOST = 'https://plausible.io'

/**
 * Queues events fired before the script has loaded; Plausible replays whatever
 * it finds on `plausible.q` on startup. This is Plausible's own snippet.
 */
const QUEUE_STUB =
  'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }'

/**
 * Options, all set through environment variables:
 *
 * - `domain` (required): the site as registered in Plausible.
 * - `host`: base URL of a self-hosted Plausible. Defaults to plausible.io.
 * - `scriptUrl`: overrides the script URL entirely, to serve it from your own
 *   origin through a rewrite so that ad blockers do not drop it.
 * - `apiUrl`: the matching first-party endpoint events are posted to.
 *
 * The `manual` variant of the script is used on purpose: the standard one sends
 * a pageview with `location.href` on every navigation, which on a group page
 * carries the group ID. Pageviews are sent explicitly by `TrackPage` instead.
 */
function PlausibleScript({ options }: { options: AnalyticsOptions }) {
  const scriptUrl =
    options.scriptUrl ?? `${options.host ?? DEFAULT_HOST}/js/script.manual.js`

  return (
    <>
      <Script
        async
        defer
        data-api={options.apiUrl}
        data-domain={options.domain}
        src={scriptUrl}
      />
      <Script
        id="analytics-plausible-init"
        dangerouslySetInnerHTML={{ __html: QUEUE_STUB }}
      />
    </>
  )
}

const plausibleTransport: AnalyticsTransport = (event, props, url) => {
  // `u` overrides the URL Plausible would otherwise read from `location.href`.
  window.plausible?.(event, { props, u: url })
}

export const PlausibleAnalyticsProvider = createAnalyticsProvider({
  Script: PlausibleScript,
  useTransport: () => plausibleTransport,
})
