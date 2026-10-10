import { env } from './env'

/**
 * Hosts that uploaded receipt/document images can legitimately live on, derived
 * from the configured S3 storage. Mirrors the image `remotePatterns` logic in
 * next.config.mjs so that the set of trusted hosts stays consistent.
 */
function getAllowedUploadHosts(): string[] {
  const hosts: string[] = []
  if (env.S3_UPLOAD_ENDPOINT) {
    // custom endpoint for providers other than AWS
    try {
      hosts.push(new URL(env.S3_UPLOAD_ENDPOINT).hostname)
    } catch {
      // ignore an unparseable endpoint; it simply contributes no allowed host
    }
  } else if (env.S3_UPLOAD_BUCKET && env.S3_UPLOAD_REGION) {
    // default AWS provider
    hosts.push(
      `${env.S3_UPLOAD_BUCKET}.s3.${env.S3_UPLOAD_REGION}.amazonaws.com`,
    )
  }
  return hosts
}

/**
 * Returns true only for http(s) URLs whose host is one of the app's own
 * configured upload hosts. Used to ensure AI extraction is performed against
 * images the app itself produced, rather than an arbitrary attacker-supplied
 * URL (which would otherwise enable SSRF-via-OpenAI and unbounded API spend).
 */
export function isAllowedUploadUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  return getAllowedUploadHosts().includes(url.hostname)
}

/**
 * Returns the S3 object key of a document the app uploaded, or null when the
 * URL does not point into the configured bucket. next-s3-upload builds URLs as
 * `https://<bucket>.s3.<region>.amazonaws.com/<key>` on AWS, and path-style as
 * `<endpoint>/<bucket>/<key>` with a custom endpoint.
 */
export function getUploadKeyFromUrl(rawUrl: string): string | null {
  if (!env.S3_UPLOAD_BUCKET || !isAllowedUploadUrl(rawUrl)) return null
  let path: string
  try {
    path = decodeURIComponent(new URL(rawUrl).pathname)
  } catch {
    return null
  }
  let prefix = '/'
  if (env.S3_UPLOAD_ENDPOINT) {
    const endpointPath = new URL(env.S3_UPLOAD_ENDPOINT).pathname.replace(
      /\/+$/,
      '',
    )
    prefix = `${endpointPath}/${env.S3_UPLOAD_BUCKET}/`
  }
  if (!path.startsWith(prefix)) return null
  return path.slice(prefix.length) || null
}
