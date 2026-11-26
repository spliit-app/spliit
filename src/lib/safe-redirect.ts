/**
 * An origin nothing can legitimately redirect to, used only to resolve `next`
 * the way a browser would.
 */
const SENTINEL_ORIGIN = 'http://spliit.invalid'

/**
 * Turns an untrusted `?next=` value into a path we are willing to navigate to.
 *
 * String-prefix checks are not enough: `//evil.example` is protocol-relative,
 * and WHATWG URL parsing treats a backslash as a slash, so `/\evil.example` and
 * `\\evil.example` resolve to another origin too. The only reliable test is to
 * resolve the value against a sentinel origin and require the origin to survive,
 * which is what a browser (and `NextResponse.redirect`) will do anyway.
 *
 * Returns a same-origin path, or the fallback.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = '/groups',
) {
  if (!value) return fallback

  let url: URL
  try {
    url = new URL(value, SENTINEL_ORIGIN)
  } catch {
    return fallback
  }

  // Another origin, another scheme (javascript:, data:), or credentials.
  if (url.origin !== SENTINEL_ORIGIN) return fallback
  if (url.username || url.password) return fallback

  return `${url.pathname}${url.search}${url.hash}`
}
