import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

/**
 * Email + password accounts.
 *
 * Sessions live in Postgres (`Session`), not in a signed cookie, so signing out
 * or revoking access is an ordinary delete rather than a key rotation. That
 * matters here because the reason this feature exists is being able to *stop*
 * someone seeing a group, which a stateless JWT cannot do.
 */
const credentialMax = env.AUTH_RATE_LIMIT_MAX ?? 10

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // Spliit has no mail infrastructure yet, and requiring a verified address
    // before the first group can be created would make sign-up a dead end.
    // Turning this on needs SMTP; password reset needs it either way.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    // This is the ceiling for *auth* paths in general, and the header asks
    // `/api/auth/get-session` on every page load. At 100/min a handful of open
    // tabs (plus prefetches) exhaust it, the query 429s, and the header renders
    // as signed out while the session is perfectly valid. Session reads are
    // cheap; the endpoints worth throttling have explicit rules below.
    max: credentialMax * 10,
    // Ten a minute per IP on the credential endpoints by default; see the
    // comment on AUTH_RATE_LIMIT_MAX for why a rig raises it.
    // better-auth's built-in rule for the credential endpoints is 3 requests
    // per 10 seconds *per IP*, which is too tight for a household (or an office,
    // or a school) signing up from one address, and it makes a shared NAT a
    // denial of service on registration. Ten a minute still throttles password
    // guessing from a single address without locking out a group of friends.
    customRules: {
      '/sign-in/email': { window: 60, max: credentialMax },
      '/sign-up/email': { window: 60, max: credentialMax },
      '/request-password-reset': {
        window: 60,
        max: Math.max(1, Math.floor(credentialMax / 2)),
      },
    },
  },
  session: {
    // Rolling seven-day sessions: long enough to feel like an app, short enough
    // that a forgotten shared laptop eventually locks itself.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: 'spliit',
  },
})

export type Session = typeof auth.$Infer.Session
