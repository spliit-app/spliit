'use server'

import { AnalyticsConfig } from '@/lib/analytics/types'
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
  return match(env.ANALYTICS_PROVIDER)
    .with(undefined, () => ({ provider: null, options: {} }))
    .with('console', (provider) => ({ provider, options: {} }))
    .with('plausible', (provider) => ({
      provider,
      options: {
        domain: env.PLAUSIBLE_DOMAIN,
        host: env.PLAUSIBLE_HOST,
        scriptUrl: env.PLAUSIBLE_SCRIPT_URL,
        apiUrl: env.PLAUSIBLE_API_URL,
      },
    }))
    .exhaustive()
}
