'use client'

import { analyticsProviders } from '@/lib/analytics/registry'
import { AnalyticsConfig } from '@/lib/analytics/types'
import { PropsWithChildren } from 'react'

/**
 * Mounts the configured analytics provider. Rendered by the root layout, which
 * resolves the configuration on the server with `getAnalyticsConfig`.
 *
 * This component calls no hooks of its own, so the early return below is safe:
 * each provider calls its own hooks unconditionally, inside a component whose
 * identity never changes for the lifetime of the app.
 */
export function Analytics({
  config,
  children,
}: PropsWithChildren<{ config: AnalyticsConfig }>) {
  // Analytics is disabled unless a provider is selected. No context is
  // installed, so `useAnalytics()` returns a no-op everywhere.
  if (!config.provider) return <>{children}</>

  const Provider = analyticsProviders[config.provider]
  return <Provider options={config.options}>{children}</Provider>
}
