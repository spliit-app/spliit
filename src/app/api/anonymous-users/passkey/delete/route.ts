import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }
  const body = (await request.json().catch(() => null)) as {
    userId?: string
  } | null

  if (!body?.userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  try {
    await prisma.anonymousUser.update({
      where: { id: body.userId },
      data: {
        passkeysEnabled: false,
        passkeyCredentialId: null,
        passkeyPublicKey: null,
        passkeyCounter: null,
        passkeyTransports: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting passkey:', error)
    return NextResponse.json(
      { error: 'Failed to delete passkey' },
      { status: 500 },
    )
  }
}
