import { createAnalyticsProvider } from '@/lib/analytics/context'
import { AnalyticsOptions, AnalyticsTransport } from '@/lib/analytics/types'
import Script from 'next/script'

/**
 * The part of the tracker's payload this provider touches. Whatever else the
 * tracker fills in (`website`, `hostname`, `screen`, `language`, …) is passed
 * through untouched.
 */
type UmamiPayload = {
  url?: string
  title?: string
  referrer?: string
  name?: string
  data?: Record<string, string>
  [key: string]: unknown
}

declare global {
  interface Window {
    umami?: {
      track: (
        payload: (defaults: UmamiPayload) => UmamiPayload,
      ) => Promise<void>
    }
  }
}

const DEFAULT_SCRIPT_URL = 'https://cloud.umami.is/script.js'

/**
 * Events sent before the script has loaded. Umami has no queue of its own, and
 * a stub in the style of Plausible's snippet would not do: the script leaves
 * `window.umami` alone if something is already there. So the transport queues
 * until `Script` reports the tracker loaded, then replays.
 */
let pending: Array<() => void> = []

function flushPending() {
  const queued = pending
  pending = []
  queued.forEach((send) => send())
}

/**
 * Options, all set through environment variables:
 *
 * - `websiteId` (required): the site's ID in Umami.
 * - `scriptUrl`: the tracker script. Defaults to Umami Cloud's; point it at a
 *   self-hosted instance, or at your own origin through a rewrite so that ad
 *   blockers do not drop it.
 * - `hostUrl`: where events are posted, without the `/api/send` suffix the
 *   tracker appends. Umami's own default is fine unless the script is served
 *   from your origin, in which case the matching first-party rewrite goes here.
 *
 * Automatic tracking is turned off on purpose: it would send a pageview with
 * `location.href` on every navigation, which on a group page carries the group
 * ID. Pageviews are sent explicitly by `TrackPage` instead.
 */
function UmamiScript({ options }: { options: AnalyticsOptions }) {
  return (
    <Script
      defer
      src={options.scriptUrl ?? DEFAULT_SCRIPT_URL}
      data-website-id={options.websiteId}
      data-host-url={options.hostUrl}
      data-auto-track="false"
      onLoad={flushPending}
    />
  )
}

const umamiTransport: AnalyticsTransport = (event, props, url) => {
  const send = () =>
    window.umami?.track((defaults) => ({
      ...defaults,
      url,
      // The tracker fills `title` with `document.title`, which on group pages
      // contains the group name, and reduces a same-origin `referrer` to a path
      // instead of dropping it, which can contain a group ID. Neither is sent.
      title: undefined,
      referrer: defaults.referrer?.startsWith('/') ? '' : defaults.referrer,
      // Without a `name`, Umami records the payload as a pageview.
      ...(event !== 'pageview' && { name: event, data: props }),
    }))

  if (window.umami) send()
  else pending.push(send)
}

export const UmamiAnalyticsProvider = createAnalyticsProvider({
  Script: UmamiScript,
  useTransport: () => umamiTransport,
})
