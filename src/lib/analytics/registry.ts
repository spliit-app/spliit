import { AnalyticsProviderId } from '@/lib/analytics/provider-ids'
import { ConsoleAnalyticsProvider } from '@/lib/analytics/providers/console'
import { PlausibleAnalyticsProvider } from '@/lib/analytics/providers/plausible'
import { AnalyticsProviderComponent } from '@/lib/analytics/types'

/**
 * Add your provider here. Because the map is typed by `AnalyticsProviderId`, an
 * id without an entry — or an entry without an id — fails to compile.
 *
 * Every provider listed here is bundled for every client, whether or not it is
 * selected. That is negligible for providers as small as these two; one that
 * needs a heavy SDK should load it with `next/dynamic(…, { ssr: false })` inside
 * its own file, so the cost stays with that provider.
 */
export const analyticsProviders: Record<
  AnalyticsProviderId,
  AnalyticsProviderComponent
> = {
  console: ConsoleAnalyticsProvider,
  plausible: PlausibleAnalyticsProvider,
}
