import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { requireSession, deleteSessionCookie } from '@/lib/session'

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
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const user = await prisma.anonymousUser.findUnique({
    where: { id },
    select: {
      passkeysEnabled: true,
      groups: true,
    },
  })

  if (!user) {
    return NextResponse.json({
      groups: [],
      passkeysEnabled: false,
    })
  }

  return NextResponse.json({
    groups: user.groups.map((group: { groupId: string; groupName: string }) => ({
      groupId: group.groupId,
      groupName: group.groupName,
    })),
    passkeysEnabled: user.passkeysEnabled,
  })
}

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
    groups?: Array<{ groupId: string; groupName: string }>
  } | null

  if (!body?.id || !body.groups) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Require valid session and verify user owns the account
  const authResult = await requireSession(request)
  if ('error' in authResult) {
    return authResult.error
  }

  if (authResult.session.userId !== body.id) {
    return NextResponse.json(
      { error: 'Not authorized to modify groups for this account' },
      { status: 403 }
    )
  }

  // If groups array is empty, check if user should be deleted
  if (body.groups.length === 0) {
    const existingUser = await prisma.anonymousUser.findUnique({
      where: { id: body.id },
      select: {
        passphraseHash: true,
        passkeysEnabled: true,
      },
    })

    // Delete user if they have no auth configured
    if (existingUser && !existingUser.passphraseHash && !existingUser.passkeysEnabled) {
      await prisma.anonymousUser.delete({
        where: { id: body.id },
      })
      
      const response = NextResponse.json({ ok: true, deleted: true })
      response.headers.set('Set-Cookie', deleteSessionCookie())
      
      return response
    }
    
    // If user has auth configured, just remove groups
    if (existingUser) {
      await prisma.anonymousUserGroup.deleteMany({
        where: { anonymousUserId: body.id },
      })
      return NextResponse.json({ ok: true })
    }
    
    // User doesn't exist, nothing to do
    return NextResponse.json({ ok: true })
  }

  // Create user if doesn't exist (now they have groups)
  await prisma.anonymousUser.upsert({
    where: { id: body.id },
    create: { id: body.id },
    update: {},
  })

  const userId = body.id

  await prisma.$transaction([
    prisma.anonymousUserGroup.deleteMany({
      where: { anonymousUserId: userId },
    }),
    prisma.anonymousUserGroup.createMany({
      data: body.groups.map((group) => ({
        anonymousUserId: userId,
        groupId: group.groupId,
        groupName: group.groupName,
      })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ ok: true })
}
