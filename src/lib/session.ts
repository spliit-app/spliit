import { randomBytes } from 'crypto'

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
 * In-memory session storage
 * In production, this should be replaced with Redis or a database-backed solution
 */
class SessionStore {
  private sessions: Map<string, AnonymousSession> = new Map()
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

    this.sessions.set(token, {
      userId,
      createdAt: now,
      expiresAt,
      verified: true,
    })

    return token
  }

  /**
   * Get a session by token
   */
  async get(token: string): Promise<AnonymousSession | null> {
    const session = this.sessions.get(token)
    
    if (!session) {
      return null
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token)
      return null
    }

    return session
  }

  /**
   * Update a session
   */
  async update(token: string, data: Partial<AnonymousSession>): Promise<boolean> {
    const session = await this.get(token)
    
    if (!session) {
      return false
    }

    this.sessions.set(token, {
      ...session,
      ...data,
    })

    return true
  }

  /**
   * Delete a session
   */
  async delete(token: string): Promise<void> {
    this.sessions.delete(token)
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
   * Cleanup expired sessions
   */
  private cleanup(): void {
    const now = new Date()
    let cleaned = 0

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[SessionStore] Cleaned up ${cleaned} expired sessions`)
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
  getSessionCount(): number {
    return this.sessions.size
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
