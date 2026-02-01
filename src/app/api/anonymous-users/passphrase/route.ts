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
    username?: string
    passphraseHash?: string
    currentPassphraseHash?: string
  } | null

  if (!body?.id || !body?.passphraseHash || !body?.username) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // If currentPassphraseHash is provided, verify it matches before updating
  if (body.currentPassphraseHash) {
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
