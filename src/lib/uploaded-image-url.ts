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
