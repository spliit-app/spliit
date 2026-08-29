import { effectiveBaseUrl } from '@/lib/env'
import { MetadataRoute } from 'next'

// Rendered per request, for the same reason as robots.ts.
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: effectiveBaseUrl,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
  ]
}
