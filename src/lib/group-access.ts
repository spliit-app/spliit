import 'server-only'

import {
  issueUnlockToken,
  pinCookieName,
  UNLOCK_MAX_AGE_SECONDS,
  verifyUnlockToken,
} from '@/lib/group-access-token'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { cookies, headers } from 'next/headers'

const PIN_WINDOW_MS = 15 * 60 * 1000
const PIN_MAX_FAILURES = 8
const PIN_LOCK_MS = 15 * 60 * 1000

export async function readUnlockCookie(
  groupId: string,
): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get(pinCookieName(groupId))?.value
}

export async function isGroupUnlocked(groupId: string): Promise<boolean> {
  const token = await readUnlockCookie(groupId)
  if (!token) return false
  return verifyUnlockToken(groupId, token)
}

export async function assertGroupUnlocked(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, pinHash: true },
  })
  if (!group) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' })
  }
  if (!group.pinHash) return
  if (await isGroupUnlocked(groupId)) return
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'PIN required',
  })
}

export async function setUnlockCookie(groupId: string) {
  const token = await issueUnlockToken(groupId)
  const jar = await cookies()
  jar.set(pinCookieName(groupId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  })
}

async function clientKeyFromRequest(): Promise<string> {
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  const data = new TextEncoder().encode(ip)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function assertPinNotRateLimited(groupId: string) {
  const clientKey = await clientKeyFromRequest()
  const state = await prisma.pinAttempt.findUnique({
    where: { groupId_clientKey: { groupId, clientKey } },
  })
  if (!state) return
  if (state.lockedUntil && Date.now() < state.lockedUntil.getTime()) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many PIN attempts. Try again later.',
    })
  }
}

export async function recordPinFailure(groupId: string) {
  const clientKey = await clientKeyFromRequest()
  const now = new Date()
  const existing = await prisma.pinAttempt.findUnique({
    where: { groupId_clientKey: { groupId, clientKey } },
  })
  const windowStart =
    existing && now.getTime() - existing.windowStart.getTime() < PIN_WINDOW_MS
      ? existing.windowStart
      : now
  const failCount =
    existing && now.getTime() - existing.windowStart.getTime() < PIN_WINDOW_MS
      ? existing.failCount + 1
      : 1
  const lockedUntil =
    failCount >= PIN_MAX_FAILURES ? new Date(now.getTime() + PIN_LOCK_MS) : null
  await prisma.pinAttempt.upsert({
    where: { groupId_clientKey: { groupId, clientKey } },
    create: { groupId, clientKey, failCount, windowStart, lockedUntil },
    update: { failCount, windowStart, lockedUntil },
  })
}

export async function clearPinFailures(groupId: string) {
  const clientKey = await clientKeyFromRequest()
  await prisma.pinAttempt.upsert({
    where: { groupId_clientKey: { groupId, clientKey } },
    create: {
      groupId,
      clientKey,
      failCount: 0,
      windowStart: new Date(),
      lockedUntil: null,
    },
    update: { failCount: 0, windowStart: new Date(), lockedUntil: null },
  })
}

export async function assertExportAccess(req: Request, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { pinHash: true },
  })
  if (!group) return false
  if (!group.pinHash) return true
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${pinCookieName(groupId)}=`))
  const token = match?.slice(`${pinCookieName(groupId)}=`.length)
  if (!token) return false
  return verifyUnlockToken(groupId, decodeURIComponent(token))
}
