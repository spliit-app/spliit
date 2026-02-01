import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { sessionStore, createSessionCookie, getSession } from '@/lib/session'

const rpName = 'Spliit'

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

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'Missing userId or username' },
        { status: 400 }
      )
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpId(request),
      userName: username,
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    // Create or get session to store challenge
    let session = await getSession(request)
    let sessionToken: string
    
    if (!session) {
      // Create temporary session for registration
      sessionToken = await sessionStore.create(userId, 10 * 60 * 1000) // 10 min for registration
    } else {
      sessionToken = request.headers.get('cookie')?.split(';')
        .find(c => c.trim().startsWith('anon_session='))
        ?.split('=')[1] || await sessionStore.create(userId)
    }
    
    // Store challenge server-side for verification
    await sessionStore.storeChallenge(sessionToken, options.challenge)
    
    // Send options including challenge to client (required by WebAuthn)
    const response = NextResponse.json(options)
    
    response.headers.set('Set-Cookie', createSessionCookie(sessionToken, 600)) // 10 min cookie
    
    return response
  } catch (error) {
    console.error('Error generating registration options:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
