import { UserTier } from '@/lib/enums'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { AuthUser } from './types'

export const SESSION_COOKIE_NAME = 'spliit_session'

export function getSessionMaxAgeSeconds(): number {
  const days = Number(
    process.env.AUTH_SESSION_MAX_AGE_DAYS ||
      env.AUTH_SESSION_MAX_AGE_DAYS ||
      365,
  )
  return (days > 0 ? days : 365) * 24 * 60 * 60
}

export function getSessionMaxAgeMs(): number {
  return getSessionMaxAgeSeconds() * 1000
}

function getAuthSecret(): string {
  return (
    env.AUTH_SECRET ||
    'default_dev_secret_key_that_is_at_least_32_characters_long'
  )
}

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

function base64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8')
}

export async function createSessionToken(user: {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  tier: string
}): Promise<string> {
  const secret = getAuthSecret()
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64urlEncode(
    JSON.stringify({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      tier: user.tier,
      exp: Date.now() + getSessionMaxAgeMs(),
      iat: Date.now(),
    }),
  )

  const data = `${header}.${payload}`
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('base64url')

  return `${data}.${signature}`
}

export async function verifySessionToken(
  token: string,
): Promise<AuthUser | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, payloadStr, signature] = parts
    const secret = getAuthSecret()
    const data = `${header}.${payloadStr}`
    const expectedSignature = createHmac('sha256', secret)
      .update(data)
      .digest('base64url')

    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)

    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null

    const payload = JSON.parse(base64urlDecode(payloadStr)) as Record<
      string,
      any
    >
    if (!payload.id || typeof payload.id !== 'string') return null

    if (
      payload.exp &&
      typeof payload.exp === 'number' &&
      Date.now() > payload.exp
    ) {
      return null
    }

    const tier = (
      typeof payload.tier === 'string' &&
      [UserTier.SYNC_USERS, UserTier.GROUP_CREATORS, UserTier.ADMIN].includes(
        payload.tier as UserTier,
      )
        ? payload.tier
        : UserTier.SYNC_USERS
    ) as UserTier

    return {
      id: payload.id,
      name: payload.name ?? null,
      email: payload.email ?? null,
      image: payload.image ?? null,
      tier,
    }
  } catch {
    return null
  }
}

export async function getCurrentSession(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) {
      return null
    }

    const verifiedUser = await verifySessionToken(sessionCookie.value)
    if (!verifiedUser) {
      return null
    }

    // Refresh tier & user data from DB to reflect any admin promotions immediately
    const dbUser = await prisma.user.findUnique({
      where: { id: verifiedUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        tier: true,
      },
    })

    if (!dbUser) {
      return null
    }

    const tier = (
      [UserTier.SYNC_USERS, UserTier.GROUP_CREATORS, UserTier.ADMIN].includes(
        dbUser.tier as UserTier,
      )
        ? dbUser.tier
        : UserTier.SYNC_USERS
    ) as UserTier

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      image: dbUser.image,
      tier,
    }
  } catch {
    return null
  }
}
