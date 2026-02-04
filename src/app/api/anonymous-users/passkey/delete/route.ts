import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { requireSession } from '@/lib/session'

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
    passkeyId?: string
    userId?: string
  } | null

  if (!body?.passkeyId || !body?.userId) {
    return NextResponse.json({ error: 'Missing passkeyId or userId' }, { status: 400 })
  }

  // Require valid session and verify user owns the account
  const authResult = await requireSession(request)
  if ('error' in authResult) {
    return authResult.error
  }

  if (authResult.session.userId !== body.userId) {
    return NextResponse.json(
      { error: 'Not authorized to delete passkey for this account' },
      { status: 403 }
    )
  }

  try {
    // Verify the passkey belongs to this user
    const passkey = await prisma.passkey.findUnique({
      where: { id: body.passkeyId },
      select: { anonymousUserId: true },
    })

    if (!passkey || passkey.anonymousUserId !== body.userId) {
      return NextResponse.json(
        { error: 'Passkey not found or does not belong to this user' },
        { status: 404 }
      )
    }

    // Delete the passkey and update passkeysEnabled atomically
    await prisma.$transaction(async (tx) => {
      // Delete the passkey
      await tx.passkey.delete({
        where: { id: body.passkeyId },
      })

      // Check if user has any remaining passkeys
      const remainingPasskeys = await tx.passkey.count({
        where: { anonymousUserId: body.userId },
      })

      // If no passkeys remain, disable passkeys on user
      if (remainingPasskeys === 0) {
        await tx.anonymousUser.update({
          where: { id: body.userId },
          data: { passkeysEnabled: false },
        })
      }
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
