import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return process.env.VERCEL_URL
    ? [
        {
          url: process.env.VERCEL_URL,
          lastModified: new Date(),
          changeFrequency: 'yearly',
          priority: 1,
        },
      ]
    : []
}
