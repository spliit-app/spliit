import { env } from '@/lib/env'
import { S3Client } from '@aws-sdk/client-s3'

/**
 * Return an S3 client when expense documents are enabled and S3 settings are present.
 * Otherwise returns null.
 */
export function getS3Client(): S3Client | null {
  if (!env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS) return null
  if (
    !env.S3_UPLOAD_BUCKET ||
    !env.S3_UPLOAD_KEY ||
    !env.S3_UPLOAD_REGION ||
    !env.S3_UPLOAD_SECRET
  )
    return null

  return new S3Client({
    region: env.S3_UPLOAD_REGION,
    credentials: {
      accessKeyId: env.S3_UPLOAD_KEY || '',
      secretAccessKey: env.S3_UPLOAD_SECRET || '',
    },
    endpoint: env.S3_UPLOAD_ENDPOINT || undefined,
    forcePathStyle: !!env.S3_UPLOAD_ENDPOINT,
  })
}

/**
 * Build an object URL for a given key. If a custom endpoint is configured we
 * assume the provider expects: `${endpoint}/${bucket}/${key}`. Otherwise we
 * build the standard AWS URL.
 */
export function buildObjectUrl(key: string) {
  const bucket = env.S3_UPLOAD_BUCKET
  const endpoint = env.S3_UPLOAD_ENDPOINT
  const region = env.S3_UPLOAD_REGION
  if (endpoint) {
    const e = endpoint.replace(/\/\/+$/g, '')
    return `${e}/${bucket}/${key}`
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/**
 * Parse the object key from a stored URL. When a custom endpoint is used the
 * URL generally contains the bucket name as the first path segment (e.g.
 * `https://endpoint.example.com/bucket/uploads/<id>`). For standard AWS URLs
 * the bucket is encoded in the hostname (e.g. `https://<bucket>.s3.<region>.amazonaws.com/uploads/<id>`) and
 * the pathname already references the key.
 *
 * This function will remove the leading bucket segment if it matches the
 * configured bucket name. Otherwise it returns the pathname as-is (without a leading slash).
 */
export function parseObjectKeyFromUrl(url: string): string {
  if (!url) return ''
  try {
    const { pathname } = new URL(url)
    const parts = pathname.split('/').filter(Boolean)
    if (!parts.length) return ''
    if (parts[0] === env.S3_UPLOAD_BUCKET) return parts.slice(1).join('/')
    return parts.join('/')
  } catch (err) {
    // If the url is not a valid absolute URL, try to treat it as a path and apply same logic
    const parts = url.split('/').filter(Boolean)
    if (!parts.length) return ''
    if (parts[0] === env.S3_UPLOAD_BUCKET) return parts.slice(1).join('/')
    return parts.join('/')
  }
}
