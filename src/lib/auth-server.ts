import 'server-only'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

/**
 * The session for the current request, or null.
 *
 * Server components read headers through `next/headers`; route handlers already
 * hold a `Request` and should use `getSessionFromRequest` instead, so a handler
 * never depends on framework context it happens to be rendered in.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getSessionFromRequest(request: Request) {
  return auth.api.getSession({ headers: request.headers })
}

/** Name of the cookie better-auth uses, given `advanced.cookiePrefix` in auth.ts. */
export const SESSION_COOKIE_NAME = 'spliit.session_token'

/** Where to send a signed-out visitor, remembering where they were going. */
export function loginPathFor(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`
}
