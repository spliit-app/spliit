'use server'

import { AnalyticsConfig, AnalyticsOptions } from '@/lib/analytics/types'
import { env } from '@/lib/env'
import { match } from 'ts-pattern'

/**
 * Resolves the analytics configuration from the environment, on the server, and
 * returns it as a plain object for the root layout to hand to `Analytics`.
 *
 * The layout is always rendered dynamically (next-intl reads cookies to pick a
 * locale), so this runs per request: a single image can be configured when the
 * container starts, rather than when it was built.
 *
 * Everything returned here is public — it is serialized into the HTML.
 */
export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
  return {
    providers: env.ANALYTICS_PROVIDER.map((id) => ({
      id,
      options: match<typeof id, AnalyticsOptions>(id)
        .with('console', () => ({}))
        .with('plausible', () => ({
          domain: env.PLAUSIBLE_DOMAIN,
          host: env.PLAUSIBLE_HOST,
          scriptUrl: env.PLAUSIBLE_SCRIPT_URL,
          apiUrl: env.PLAUSIBLE_API_URL,
        }))
        .with('umami', () => ({
          websiteId: env.UMAMI_WEBSITE_ID,
          scriptUrl: env.UMAMI_SCRIPT_URL,
          hostUrl: env.UMAMI_HOST_URL,
        }))
        .exhaustive(),
    })),
  }
}
