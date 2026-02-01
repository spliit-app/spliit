import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'
import { prisma } from '@/lib/prisma'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

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
    }
    const { userId } = body

    // Support both credential-specific and discoverable authentication
    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined

    if (userId) {
      // Get the user's credential ID and transports from the database
      const user = await prisma.anonymousUser.findUnique({
        where: { id: userId },
        select: { 
          passkeyCredentialId: true,
          passkeyTransports: true,
        },
      })

      if (user?.passkeyCredentialId) {
        allowCredentials = [{
          id: user.passkeyCredentialId,
          transports: user.passkeyTransports 
            ? (JSON.parse(user.passkeyTransports) as AuthenticatorTransportFuture[])
            : undefined,
        }]
      }
    }

    // If no userId or user not found, use discoverable credentials
    const options = await generateAuthenticationOptions({
      rpID: getRpId(request),
      allowCredentials,
      userVerification: 'preferred',
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
