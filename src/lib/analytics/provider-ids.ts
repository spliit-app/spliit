/**
 * The providers a deployment can select with the `ANALYTICS_PROVIDER` variable.
 * Add yours here, then add the matching entry in `./registry` and the matching
 * branch in `./config` — both are compiler-enforced, so `npm run check-types`
 * will point at whatever is missing.
 *
 * This module is deliberately dependency-free: `src/lib/env.ts` imports it, and
 * `env.ts` is pulled in by server-side scripts that must not load React.
 */
export const ANALYTICS_PROVIDER_IDS = ['console', 'plausible'] as const

export type AnalyticsProviderId = (typeof ANALYTICS_PROVIDER_IDS)[number]
