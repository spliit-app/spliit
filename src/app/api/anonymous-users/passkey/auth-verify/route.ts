import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
import {
  createSessionCookie,
  getSessionToken,
  sessionStore,
} from '@/lib/session'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
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
    const { response, challenge: clientChallenge } = (await request.json()) as {
      response: any
      challenge: string
    }

    if (!response) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Get challenge from server-side session for verification
    const sessionToken = getSessionToken(request)
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session. Please restart authentication.' },
        { status: 401 },
      )
    }

    const serverChallenge = await sessionStore.getChallenge(sessionToken)
    if (!serverChallenge) {
      return NextResponse.json(
        {
          error: 'Challenge expired or invalid. Please restart authentication.',
        },
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

    // Extract credential ID from the response
    const credentialId = response.id

    // Find the passkey by credential ID
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId: credentialId },
      select: {
        id: true,
        credentialId: true,
        publicKey: true,
        counter: true,
        anonymousUser: {
          select: {
            id: true,
            username: true,
            groups: {
              select: {
                groupId: true,
                groupName: true,
              },
            },
          },
        },
      },
    })

    if (!passkey) {
      return NextResponse.json(
        { error: 'No passkey registered for this credential' },
        { status: 404 },
      )
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: serverChallenge,
      expectedOrigin: getExpectedOrigin(request),
      expectedRPID: getRpId(request),
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
      },
    })

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 },
      )
    }

    // Update the counter and lastUsedAt with optimistic locking to prevent race conditions
    const currentCounter = passkey.counter
    const updateResult = await prisma.passkey.updateMany({
      where: {
        id: passkey.id,
        counter: currentCounter, // Ensure counter hasn't changed
      },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    })

    // If no rows were updated, the counter was modified concurrently
    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Counter mismatch - possible replay attack detected' },
        { status: 409 },
      )
    }

    // Create authenticated session
    const newSessionToken = await sessionStore.create(passkey.anonymousUser.id)

    const jsonResponse = NextResponse.json({
      verified: true,
      id: passkey.anonymousUser.id,
      username: passkey.anonymousUser.username,
      groups: passkey.anonymousUser.groups,
    })

    jsonResponse.headers.set('Set-Cookie', createSessionCookie(newSessionToken))

    return jsonResponse
  } catch (error) {
    console.error('Error verifying authentication:', error)
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 },
    )
  }
}
