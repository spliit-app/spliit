import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/groups/',
    },
    sitemap: process.env.VERCEL_URL
      ? `${process.env.VERCEL_URL}/sitemap.xml`
      : undefined,
  }
}
