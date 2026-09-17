'use client'

import { analyticsProviders } from '@/lib/analytics/registry'
import { AnalyticsConfig } from '@/lib/analytics/types'
import { PropsWithChildren, ReactNode } from 'react'

/**
 * Mounts the configured analytics providers. Rendered by the root layout, which
 * resolves the configuration on the server with `getAnalyticsConfig`.
 *
 * Providers nest, the first configured outermost. Call sites read the innermost
 * one's context, and each provider forwards every event to the one above it
 * (see `createAnalyticsProvider`), so a single `sendEvent` reaches them all.
 *
 * This component calls no hooks of its own, so building the tree from a list is
 * safe: each provider calls its own hooks unconditionally, inside a component
 * whose identity never changes for the lifetime of the app.
 */
export function Analytics({
  config,
  children,
}: PropsWithChildren<{ config: AnalyticsConfig }>) {
  // Analytics is disabled unless a provider is selected: with none, this is
  // just `children`. No context is installed, so `useAnalytics()` returns a
  // no-op everywhere.
  return config.providers.reduceRight<ReactNode>((inner, { id, options }) => {
    const Provider = analyticsProviders[id]
    return (
      <Provider key={id} options={options}>
        {inner}
      </Provider>
    )
  }, children)
}
