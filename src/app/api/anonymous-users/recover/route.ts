import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
import { createSessionCookie, sessionStore } from '@/lib/session'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Apply rate limiting
  const identifier = getRateLimitIdentifier(request)
  const rateLimitResult = rateLimit(identifier)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    )
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string
    passphraseHash?: string
  } | null

  if (!body?.passphraseHash || !body?.username) {
    return NextResponse.json(
      { error: 'Missing username or passphraseHash' },
      { status: 400 },
    )
  }

  const user = await prisma.anonymousUser.findFirst({
    where: {
      username: body.username,
      passphraseHash: body.passphraseHash,
    },
    include: { groups: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Create session for recovered user
  const sessionToken = await sessionStore.create(user.id)

  const response = NextResponse.json({
    id: user.id,
    username: user.username,
    groups: user.groups.map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
    })),
  })

  response.headers.set('Set-Cookie', createSessionCookie(sessionToken))

  return response
}
