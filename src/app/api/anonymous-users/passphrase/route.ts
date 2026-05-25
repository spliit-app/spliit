import { prisma } from '@/lib/prisma'
import { getRateLimitIdentifier, rateLimit } from '@/lib/rate-limit'
import { createSessionCookie, getSession, sessionStore } from '@/lib/session'
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
    passphraseHash?: string
    currentPassphraseHash?: string
    resetWithPasskey?: boolean
  } | null

  if (!body?.id || !body?.passphraseHash || !body?.username) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Always require a valid session
  const session = await getSession(request)
  if (!session || session.userId !== body.id) {
    return NextResponse.json(
      { error: 'Not authorized to update this account' },
      { status: 403 },
    )
  }

  // If resetWithPasskey is true, verify user has passkeys
  if (body.resetWithPasskey) {
    const passkeyCount = await prisma.passkey.count({
      where: { anonymousUserId: body.id },
    })

    if (passkeyCount === 0) {
      return NextResponse.json(
        {
          error:
            'No passkeys found. Cannot reset passphrase without current passphrase.',
        },
        { status: 403 },
      )
    }
    // Passkey verification already done during session creation
    // Allow passphrase reset without current passphrase
  } else {
    // For regular updates, current passphrase is required
    if (!body.currentPassphraseHash) {
      return NextResponse.json(
        {
          error:
            'Current passphrase is required. Use passkey reset if you forgot your passphrase.',
        },
        { status: 400 },
      )
    }

    // Verify current passphrase matches
    const user = await prisma.anonymousUser.findUnique({
      where: { id: body.id },
      select: { passphraseHash: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.passphraseHash) {
      return NextResponse.json(
        {
          error:
            'No passphrase set. Use passkey reset to set initial passphrase.',
        },
        { status: 400 },
      )
    }

    if (user.passphraseHash !== body.currentPassphraseHash) {
      return NextResponse.json(
        { error: 'Current passphrase is incorrect' },
        { status: 401 },
      )
    }
  }

  try {
    await prisma.anonymousUser.upsert({
      where: { id: body.id },
      create: {
        id: body.id,
        username: body.username,
        passphraseHash: body.passphraseHash,
      },
      update: {
        username: body.username,
        passphraseHash: body.passphraseHash,
      },
    })

    // Create session for authenticated user
    const sessionToken = await sessionStore.create(body.id)

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', createSessionCookie(sessionToken))

    return response
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Passphrase already in use' },
        { status: 409 },
      )
    }
    throw error
  }

  return NextResponse.json({ ok: true })
}
