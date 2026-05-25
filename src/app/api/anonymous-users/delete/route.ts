import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
import { deleteSessionCookie, requireSession } from '@/lib/session'
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
  } | null

  if (!body?.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Require valid session and verify user owns the account
  const authResult = await requireSession(request)
  if ('error' in authResult) {
    return authResult.error
  }

  if (authResult.session.userId !== body.id) {
    return NextResponse.json(
      { error: 'Not authorized to delete this account' },
      { status: 403 },
    )
  }

  try {
    await prisma.anonymousUser.delete({
      where: { id: body.id },
    })

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', deleteSessionCookie())

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
