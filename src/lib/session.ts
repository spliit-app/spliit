import { randomBytes } from 'crypto'
import { prisma } from './prisma'

/**
 * Session data structure for anonymous users
 */
export interface AnonymousSession {
  /** The anonymous user's ID */
  userId: string
  /** Session creation timestamp */
  createdAt: Date
  /** Session expiration timestamp */
  expiresAt: Date
  /** Whether the user has been authenticated */
  verified: boolean
  /** WebAuthn challenge for pending registration/authentication */
  challenge?: string
  /** Challenge creation timestamp for TTL */
  challengeCreatedAt?: Date
}

/**
 * Database-backed session storage
 */
class SessionStore {
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Generate a cryptographically secure session token
   */
  generateToken(): string {
    return randomBytes(32).toString('base64url')
  }

  /**
   * Create a new session
   */
  async create(
    userId: string,
    expiresInMs: number = 7 * 24 * 60 * 60 * 1000, // 7 days default
  ): Promise<string> {
    const token = this.generateToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInMs)

    await prisma.anonymousSession.create({
      data: {
        token,
        anonymousUserId: userId,
        createdAt: now,
        expiresAt,
      },
    })

    return token
  }

  /**
   * Get a session by token
   */
  async get(token: string): Promise<AnonymousSession | null> {
    const session = await prisma.anonymousSession.findUnique({
      where: { token },
    })
    
    if (!session) {
      return null
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.anonymousSession.delete({
        where: { token },
      })
      return null
    }

    return {
      userId: session.anonymousUserId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      verified: true,
      challenge: session.challenge ?? undefined,
      challengeCreatedAt: session.challengeCreatedAt ?? undefined,
    }
  }

  /**
   * Update a session
   */
  async update(token: string, data: Partial<AnonymousSession>): Promise<boolean> {
    const session = await this.get(token)
    
    if (!session) {
      return false
    }

    await prisma.anonymousSession.update({
      where: { token },
      data: {
        challenge: data.challenge ?? undefined,
        challengeCreatedAt: data.challengeCreatedAt ?? undefined,
      },
    })

    return true
  }

  /**
   * Delete a session
   */
  async delete(token: string): Promise<void> {
    await prisma.anonymousSession.deleteMany({
      where: { token },
    })
  }

  /**
   * Store WebAuthn challenge in session
   */
  async storeChallenge(
    token: string,
    challenge: string,
    ttlMs: number = 5 * 60 * 1000, // 5 minutes
  ): Promise<boolean> {
    const session = await this.get(token)
    
    if (!session) {
      return false
    }

    return this.update(token, {
      challenge,
      challengeCreatedAt: new Date(),
    })
  }

  /**
   * Get and validate challenge from session
   * Automatically deletes the challenge after retrieval (one-time use)
   */
  async getChallenge(token: string): Promise<string | null> {
    const session = await this.get(token)
    
    if (!session?.challenge || !session.challengeCreatedAt) {
      return null
    }

    // Check challenge TTL (5 minutes)
    const challengeAge = Date.now() - session.challengeCreatedAt.getTime()
    if (challengeAge > 5 * 60 * 1000) {
      // Challenge expired
      await this.update(token, {
        challenge: undefined,
        challengeCreatedAt: undefined,
      })
      return null
    }

    // Delete challenge after retrieval (prevent replay)
    const challenge = session.challenge
    await this.update(token, {
      challenge: undefined,
      challengeCreatedAt: undefined,
    })

    return challenge
  }

  /**
   * Cleanup expired sessions and temporary users
   */
  private async cleanup(): Promise<void> {
    const now = new Date()

    try {
      const result = await prisma.anonymousSession.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      })

      if (result.count > 0) {
        console.log(`[SessionStore] Cleaned up ${result.count} expired sessions`)
      }

      // Also cleanup temporary users that were created for discoverable credentials
      // and no longer have any active sessions
      const tempUsers = await prisma.anonymousUser.findMany({
        where: {
          id: {
            startsWith: 'temp-auth-',
          },
        },
        select: {
          id: true,
          sessions: {
            select: {
              expiresAt: true,
            },
          },
        },
      })

      // Collect IDs of users to delete
      const userIdsToDelete: string[] = []
      for (const user of tempUsers) {
        // If user has no sessions or all sessions are expired, mark for deletion
        const hasActiveSessions = user.sessions.some(
          (session) => session.expiresAt > now,
        )
        if (!hasActiveSessions) {
          userIdsToDelete.push(user.id)
        }
      }

      // Delete all temporary users in a single operation
      if (userIdsToDelete.length > 0) {
        const deleteResult = await prisma.anonymousUser.deleteMany({
          where: { id: { in: userIdsToDelete } },
        })
        if (deleteResult.count > 0) {
          console.log(
            `[SessionStore] Cleaned up ${deleteResult.count} temporary users`,
          )
        }
      }
    } catch (error) {
      console.error('[SessionStore] Error cleaning up sessions:', error)
    }
  }

  /**
   * Stop the cleanup interval (for testing or shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get session count (for monitoring)
   */
  async getSessionCount(): Promise<number> {
    return prisma.anonymousSession.count()
  }
}

// Singleton instance
export const sessionStore = new SessionStore()

/**
 * Session cookie configuration
 */
export const SESSION_COOKIE_NAME = 'anon_session'
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Helper to create session cookie header
 */
export function createSessionCookie(token: string, maxAge: number = SESSION_MAX_AGE): string {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    isProduction ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

/**
 * Helper to delete session cookie
 */
export function deleteSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`
}

/**
 * Extract session token from request cookies
 */
export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie')
  
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))

  if (!sessionCookie) {
    return null
  }

  return sessionCookie.substring(SESSION_COOKIE_NAME.length + 1)
}

/**
 * Get validated session from request
 */
export async function getSession(request: Request): Promise<AnonymousSession | null> {
  const token = getSessionToken(request)
  
  if (!token) {
    return null
  }

  return sessionStore.get(token)
}

/**
 * Require a valid session or return 401 error response
 */
export async function requireSession(
  request: Request,
): Promise<{ session: AnonymousSession; token: string } | { error: Response }> {
  const token = getSessionToken(request)
  
  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  const session = await sessionStore.get(token)
  
  if (!session) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  return { session, token }
}

/**
 * Get session from Next.js headers (for tRPC procedures)
 */
export async function getSessionFromHeaders(): Promise<AnonymousSession | null> {
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')
  const host = headersList.get('host') || 'localhost'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const requestUrl = `${protocol}://${host}`
  const request = new Request(requestUrl, {
    headers: { cookie: cookieHeader || '' },
  })
  
  return getSession(request)
}
