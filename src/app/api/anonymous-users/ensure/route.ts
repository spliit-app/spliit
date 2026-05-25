import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
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
    id?: string
    username?: string
  } | null
  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Check if user already exists
  const existingUser = await prisma.anonymousUser.findUnique({
    where: { id: body.id },
    include: {
      groups: true,
    },
  })

  // Only create/update user if:
  // 1. User already exists (they have some data worth preserving)
  // 2. OR they will be created later when they associate with a group or set up auth
  if (existingUser) {
    // Update username if provided
    if (body.username) {
      await prisma.anonymousUser.update({
        where: { id: body.id },
        data: { username: body.username },
      })
    }
  }
  // For new users, don't create the record yet
  // They will be created when they associate with a group or set up auth

  return NextResponse.json({ id: body.id })
}
