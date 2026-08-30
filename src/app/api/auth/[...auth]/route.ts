import {
  exchangeOAuthCode,
  getOAuthAuthorizationUrl,
  upsertOAuthUser,
} from '@/lib/auth/oauth'
import {
  createSessionToken,
  getCurrentSession,
  getSessionMaxAgeSeconds,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session'
import { UserTier } from '@/lib/enums'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{
    auth: string[]
  }>
}

const isProduction = (process.env.NODE_ENV as string) === 'production'

function getRequestOrigin(request: NextRequest): string {
  const baseUrl = process.env.BASE_URL || env.BASE_URL
  if (baseUrl) {
    return baseUrl.trim().replace(/\/$/, '')
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = forwardedProto || 'https'
    return `${proto}://${forwardedHost}`
  }

  const url = new URL(request.url)
  return url.origin
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { auth } = await context.params
  const action = auth[0]
  const provider = auth[1]
  const origin = getRequestOrigin(request)

  if (action === 'session') {
    const session = await getCurrentSession()
    return NextResponse.json({ user: session })
  }

  if (action === 'signin' && provider) {
    const state = Math.random().toString(36).substring(2, 15)
    const authUrl = getOAuthAuthorizationUrl(provider, state, origin)

    if (!authUrl) {
      return NextResponse.redirect(
        new URL('/groups?error=OAuthNotConfigured', origin),
      )
    }

    const response = NextResponse.redirect(authUrl)
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: isProduction && origin.startsWith('https:'),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    })
    return response
  }

  if (action === 'callback' && provider) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedState = request.cookies.get('oauth_state')?.value

    if (!code || !state || (storedState && state !== storedState)) {
      return NextResponse.redirect(
        new URL('/groups?error=InvalidOAuthState', origin),
      )
    }

    const profile = await exchangeOAuthCode(provider, code, origin)
    if (!profile) {
      return NextResponse.redirect(
        new URL('/groups?error=OAuthExchangeFailed', origin),
      )
    }

    const user = await upsertOAuthUser(profile)
    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      tier: user.tier,
    })

    const response = NextResponse.redirect(new URL('/groups', origin))
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction && origin.startsWith('https:'),
      sameSite: 'lax',
      path: '/',
      maxAge: getSessionMaxAgeSeconds(),
    })
    response.cookies.delete('oauth_state')
    return response
  }

  if (action === 'signout') {
    const response = NextResponse.redirect(new URL('/', origin))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { auth } = await context.params
  const action = auth[0]
  const origin = getRequestOrigin(request)

  if (action === 'signout') {
    const response = NextResponse.json({ success: true })
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // Mock / Dev login endpoint (only available in non-production development / test environments)
  if (action === 'mock-login') {
    if (isProduction) {
      return NextResponse.json(
        { error: 'Mock login is disabled in production.' },
        { status: 403 },
      )
    }

    try {
      const body = (await request.json()) as {
        email?: string
        name?: string
        tier?: UserTier
      }
      const email = body.email || `test-${Date.now()}@example.com`
      const name = body.name || 'Test User'
      const tier = body.tier || UserTier.SYNC_USERS

      let user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            tier,
          },
        })
      } else if (body.tier && user.tier !== body.tier) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { tier: body.tier },
        })
      }

      const token = await createSessionToken({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        tier: user.tier,
      })

      const response = NextResponse.json({ success: true, user })
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction && origin.startsWith('https:'),
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      return response
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || 'Login failed' },
        { status: 400 },
      )
    }
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
