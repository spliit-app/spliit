import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
import {
  createSessionCookie,
  getSessionToken,
  SESSION_MAX_AGE,
  sessionStore,
} from '@/lib/session'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { NextRequest, NextResponse } from 'next/server'

function getRpId(request: NextRequest) {
  try {
    return new URL(request.url).hostname
  } catch {
    return 'localhost'
  }
}

function getExpectedOrigin(request: NextRequest) {
  return (
    request.headers.get('origin') ??
    new URL(request.url).origin ??
    process.env.NEXT_PUBLIC_URL ??
    'http://localhost:3000'
  )
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  try {
    const {
      userId,
      response: credentialResponse,
      challenge: clientChallenge,
      name,
    } = (await request.json()) as {
      userId: string
      response: any
      challenge: string
      name?: string
    }

    if (!userId || !credentialResponse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Get challenge from server-side session for verification
    const sessionToken = getSessionToken(request)
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session. Please restart registration.' },
        { status: 401 },
      )
    }

    const serverChallenge = await sessionStore.getChallenge(sessionToken)
    if (!serverChallenge) {
      return NextResponse.json(
        { error: 'Challenge expired or invalid. Please restart registration.' },
        { status: 401 },
      )
    }

    // Verify that client challenge matches server challenge (prevents client manipulation)
    if (clientChallenge !== serverChallenge) {
      return NextResponse.json(
        { error: 'Challenge mismatch. Possible tampering detected.' },
        { status: 401 },
      )
    }

    const verification = await verifyRegistrationResponse({
      response: credentialResponse,
      expectedChallenge: serverChallenge,
      expectedOrigin: getExpectedOrigin(request),
      expectedRPID: getRpId(request),
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 },
      )
    }

    const { credential } = verification.registrationInfo

    // Create a new Passkey record
    await prisma.passkey.create({
      data: {
        anonymousUserId: userId,
        name: name || `Passkey ${new Date().toLocaleDateString()}`,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: null,
      },
    })

    // Update user to mark passkeys as enabled
    await prisma.anonymousUser.update({
      where: { id: userId },
      data: {
        passkeysEnabled: true,
      },
    })

    // Update session to verified state with full expiration
    const newSessionToken = await sessionStore.create(userId)

    const response = NextResponse.json({ verified: true })
    response.headers.set(
      'Set-Cookie',
      createSessionCookie(newSessionToken, SESSION_MAX_AGE),
    )

    return response
  } catch (error) {
    console.error('Error verifying registration:', error)

    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          {
            error:
              'User account not found. Please ensure you have an active account.',
          },
          { status: 404 },
        )
      }

      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'This passkey is already registered to another account.' },
          { status: 409 },
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to verify registration. Please try again.' },
      { status: 500 },
    )
  }
}
