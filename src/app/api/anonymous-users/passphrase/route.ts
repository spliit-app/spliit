import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import {
  sessionStore,
  createSessionCookie,
  getSession,
} from '@/lib/session'

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
    username?: string
    passphraseHash?: string
    currentPassphraseHash?: string
  } | null

  if (!body?.id || !body?.passphraseHash || !body?.username) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // If currentPassphraseHash is provided, verify it matches before updating
  if (body.currentPassphraseHash) {
    // For updates, require existing session
    const session = await getSession(request)
    if (!session || session.userId !== body.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this account' },
        { status: 403 },
      )
    }

    const user = await prisma.anonymousUser.findUnique({
      where: { id: body.id },
      select: { passphraseHash: true },
    })

    if (!user || user.passphraseHash !== body.currentPassphraseHash) {
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
