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
    id?: string
  } | null

  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    await prisma.anonymousUser.delete({
      where: { id: body.id },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
