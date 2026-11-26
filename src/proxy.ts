import { SESSION_COOKIE_NAME } from '@/lib/auth-server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * First line of the login wall.
 *
 * This only checks that a session cookie is *present*: the proxy cannot reach
 * the database, and a forged or expired cookie must not be trusted anyway. The
 * authoritative check is in `src/app/groups/layout.tsx`, which resolves the
 * session server-side. Keeping both means an anonymous visitor never even
 * renders a group page, and a stale cookie still gets caught.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const target = `${pathname}${search}`

  // Server components cannot read the URL; they get the attempted path from
  // this header so the login redirect can bring the visitor back here.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', target)

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', target)
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  // Only the authenticated area, plus its export route handlers (which are not
  // covered by the app-router layout).
  matcher: ['/groups', '/groups/:path*'],
}
