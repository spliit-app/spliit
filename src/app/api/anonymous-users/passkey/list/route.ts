import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { requireSession } from '@/lib/session'

export async function GET(request: Request) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // Require valid session and verify user owns the account
  const authResult = await requireSession(request)
  if ('error' in authResult) {
    return authResult.error
  }

  if (authResult.session.userId !== userId) {
    return NextResponse.json(
      { error: 'Not authorized to view passkeys for this account' },
      { status: 403 }
    )
  }

  try {
    const passkeys = await prisma.passkey.findMany({
      where: { anonymousUserId: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      passkeys: passkeys.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
        lastUsedAt: p.lastUsedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching passkeys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch passkeys' },
      { status: 500 },
    )
  }
}
