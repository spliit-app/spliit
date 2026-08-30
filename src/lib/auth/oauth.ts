import { UserTier } from '@/lib/enums'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export type OAuthProfile = {
  provider: string
  providerAccountId: string
  name: string | null
  email: string | null
  image: string | null
}

function cleanEnv(val?: string | null): string {
  if (!val) return ''
  return val
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
}

export function getOAuthAuthorizationUrl(
  provider: string,
  state: string,
  origin: string,
): string | null {
  const redirectUri = `${origin}/api/auth/callback/${provider}`

  if (provider === 'google') {
    const clientId = cleanEnv(env.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID)
    if (!clientId) return null
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  if (provider === 'github') {
    const clientId = cleanEnv(env.AUTH_GITHUB_ID || process.env.AUTH_GITHUB_ID)
    if (!clientId) return null
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    })
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  return null
}

export async function exchangeOAuthCode(
  provider: string,
  code: string,
  origin: string,
): Promise<OAuthProfile | null> {
  const redirectUri = `${origin}/api/auth/callback/${provider}`

  if (provider === 'google') {
    const clientId = cleanEnv(env.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID)
    const clientSecret = cleanEnv(
      env.AUTH_GOOGLE_SECRET || process.env.AUTH_GOOGLE_SECRET,
    )
    if (!clientId || !clientSecret) return null

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) return null
    const tokens = (await tokenRes.json()) as { access_token?: string }
    if (!tokens.access_token) return null

    const userRes = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    )

    if (!userRes.ok) return null
    const profile = (await userRes.json()) as {
      sub: string
      name?: string
      email?: string
      picture?: string
    }

    return {
      provider: 'google',
      providerAccountId: profile.sub,
      name: profile.name ?? null,
      email: profile.email ?? null,
      image: profile.picture ?? null,
    }
  }

  if (provider === 'github') {
    const clientId = cleanEnv(env.AUTH_GITHUB_ID || process.env.AUTH_GITHUB_ID)
    const clientSecret = cleanEnv(
      env.AUTH_GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET,
    )
    if (!clientId || !clientSecret) return null

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      },
    )

    if (!tokenRes.ok) return null
    const tokens = (await tokenRes.json()) as { access_token?: string }
    if (!tokens.access_token) return null

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'User-Agent': 'Spliit-App',
      },
    })

    if (!userRes.ok) return null
    const profile = (await userRes.json()) as {
      id: number
      name?: string
      login: string
      email?: string
      avatar_url?: string
    }

    let email = profile.email ?? null
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'User-Agent': 'Spliit-App',
        },
      })
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as {
          email: string
          primary: boolean
        }[]
        const primary = emails.find((e) => e.primary) ?? emails[0]
        if (primary) email = primary.email
      }
    }

    return {
      provider: 'github',
      providerAccountId: String(profile.id),
      name: profile.name ?? profile.login,
      email,
      image: profile.avatar_url ?? null,
    }
  }

  return null
}

export async function upsertOAuthUser(profile: OAuthProfile) {
  // First check if an account already exists with this provider and account ID
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  })

  if (existingAccount) {
    // Update user name/image if changed
    const updatedUser = await prisma.user.update({
      where: { id: existingAccount.userId },
      data: {
        name: profile.name ?? existingAccount.user.name,
        image: profile.image ?? existingAccount.user.image,
      },
    })
    return updatedUser
  }

  // If user with same email exists, link account
  if (profile.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    })

    if (existingUser) {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          type: 'oauth',
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      })

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: profile.name ?? existingUser.name,
          image: profile.image ?? existingUser.image,
        },
      })

      return updatedUser
    }
  }

  // New user registration - assign default tier "sync_users"
  const newUser = await prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
      image: profile.image,
      tier: UserTier.SYNC_USERS,
      accounts: {
        create: {
          type: 'oauth',
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    },
  })

  return newUser
}
