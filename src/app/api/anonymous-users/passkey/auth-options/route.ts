import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { sessionStore, createSessionCookie } from '@/lib/session'

function getRpId(request: NextRequest) {
  try {
    return new URL(request.url).hostname
  } catch {
    return 'localhost'
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      userId?: string
      username?: string
    }
    const { userId, username } = body

    let resolvedUserId = userId
    if (!resolvedUserId && username) {
      const user = await prisma.anonymousUser.findUnique({
        where: { username },
        select: { id: true },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Please check your username.' },
          { status: 404 }
        )
      }

      resolvedUserId = user.id
    }

    // Support both credential-specific and discoverable authentication
    let allowCredentials: { id: string }[] | undefined

    if (resolvedUserId) {
      // Get the user's passkey credential IDs from the database
      const passkeys = await prisma.passkey.findMany({
        where: { anonymousUserId: resolvedUserId },
        select: {
          credentialId: true,
        },
      })

      if (passkeys.length > 0) {
        allowCredentials = passkeys.map(p => ({
          id: p.credentialId,
        }))
      } else {
        return NextResponse.json(
          { error: 'No passkeys found for this account.' },
          { status: 404 }
        )
      }
    }

    // If no userId or user not found, use discoverable credentials
    const options = await generateAuthenticationOptions({
      rpID: getRpId(request),
      allowCredentials,
      userVerification: 'preferred',
    })

    // Create temporary session to store challenge for server-side verification
    let sessionToken: string
    if (resolvedUserId) {
      // Check if user exists; do not create an incomplete user here
      const existingUser = await prisma.anonymousUser.findUnique({
        where: { id: resolvedUserId },
      })
      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found. Please log in again.' },
          { status: 404 }
        )
      }
      sessionToken = await sessionStore.create(resolvedUserId, 10 * 60 * 1000) // 10 min
    } else {
      // For discoverable credentials without userId, create a temporary user
      // This user will be cleaned up by SessionStore when the session expires
      const tempUserId = 'temp-auth-' + crypto.randomUUID()
      await prisma.anonymousUser.create({
        data: { id: tempUserId },
      })
      sessionToken = await sessionStore.create(tempUserId, 10 * 60 * 1000) // 10 min
    }
    await sessionStore.storeChallenge(sessionToken, options.challenge)

    // Send options including challenge to client (required by WebAuthn)
    const response = NextResponse.json(options)

    response.headers.set('Set-Cookie', createSessionCookie(sessionToken, 600)) // 10 min cookie

    return response
  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
