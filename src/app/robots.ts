import { effectiveBaseUrl } from '@/lib/env'
import { MetadataRoute } from 'next'

// Rendered per request: a statically prerendered robots.txt would bake in the
// build-time base URL, which is exactly what BASE_URL exists to override.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/groups/',
    },
    sitemap: `${effectiveBaseUrl}/sitemap.xml`,
  }
}
