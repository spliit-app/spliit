import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { prisma } from '@/lib/prisma'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

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
      { status: 429 }
    )
  }

  try {
    const { response, challenge } = await request.json() as {
      response: AuthenticationResponseJSON
      challenge: string
    }

    if (!response || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Extract credential ID from the response
    const credentialId = response.id

    // Find the user by credential ID
    const user = await prisma.anonymousUser.findFirst({
      where: { passkeyCredentialId: credentialId },
      select: {
        id: true,
        username: true,
        passkeyCredentialId: true,
        passkeyPublicKey: true,
        passkeyCounter: true,
        passkeyTransports: true,
        groups: {
          select: {
            groupId: true,
            groupName: true,
          },
        },
      },
    })

    if (!user?.passkeyCredentialId || !user.passkeyPublicKey) {
      return NextResponse.json(
        { error: 'No passkey registered for this credential' },
        { status: 404 }
      )
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigin(request),
      expectedRPID: getRpId(request),
      authenticator: {
        credentialID: user.passkeyCredentialId,
        credentialPublicKey: user.passkeyPublicKey,
        counter: user.passkeyCounter || 0,
      },
    })

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      )
    }

    // Update the counter with optimistic locking to prevent race conditions
    // Only update if the counter hasn't changed since we read it
    const currentCounter = user.passkeyCounter || 0
    const updateResult = await prisma.anonymousUser.updateMany({
      where: { 
        id: user.id,
        passkeyCounter: currentCounter, // Ensure counter hasn't changed
      },
      data: {
        passkeyCounter: verification.authenticationInfo.newCounter,
      },
    })

    // If no rows were updated, the counter was modified concurrently
    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Counter mismatch - possible replay attack detected' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      verified: true,
      id: user.id,
      username: user.username,
      groups: user.groups,
    })
  } catch (error) {
    console.error('Error verifying authentication:', error)
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}
