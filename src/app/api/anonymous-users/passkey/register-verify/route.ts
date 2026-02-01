import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
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
    const { userId, response, challenge } = await request.json() as {
      userId: string
      response: RegistrationResponseJSON
      challenge: string
    }

    if (!userId || !response || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigin(request),
      expectedRPID: getRpId(request),
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      )
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    // Store the credential in the database
    await prisma.anonymousUser.update({
      where: { id: userId },
      data: {
        passkeysEnabled: true,
        passkeyCredentialId: credentialID,
        passkeyPublicKey: Buffer.from(credentialPublicKey),
        passkeyCounter: counter,
        passkeyTransports: null,
      },
    })

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('Error verifying registration:', error)
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { error: 'User account not found. Please ensure you have an active account.' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'This passkey is already registered to another account.' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to verify registration. Please try again.' },
      { status: 500 }
    )
  }
}
