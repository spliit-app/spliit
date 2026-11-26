/**
 * Invitations.
 *
 * In the link-based model the group URL itself was the permission: knowing the
 * id was enough to read and write the ledger. An invite replaces that with an
 * explicit grant bound to one email address, with an expiry and a single use.
 *
 * The token is not a bearer capability. Possession of the link is *not* enough
 * to join: the signed-in account's address has to match the invited one. That
 * is what makes forwarding the email harmless, and it is why the accept step
 * cannot live behind `groupProcedure` -- the invitee is not a member yet.
 */
import type { GroupRole } from '@/generated/prisma/client'
import { ensureParticipantForUser, grantMembership } from '@/lib/membership'
import { prisma } from '@/lib/prisma'
import { randomId } from '@/lib/random'
import { TRPCError } from '@trpc/server'

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function createInvite({
  groupId,
  email,
  role = 'MEMBER',
  createdByUserId,
}: {
  groupId: string
  email: string
  role?: GroupRole
  createdByUserId: string
}) {
  const normalized = normalizeEmail(email)

  // Inviting somebody who is already in the group would hand them a link that
  // changes nothing, and one pending invite per address keeps the members list
  // readable.
  const existingMember = await prisma.groupMembership.findFirst({
    where: {
      groupId,
      status: 'ACTIVE',
      user: { email: normalized },
    },
    select: { id: true },
  })
  if (existingMember) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'That account is already a member of this group.',
    })
  }

  const pending = await prisma.groupInvite.findFirst({
    where: { groupId, email: normalized, acceptedAt: null, revokedAt: null },
    select: { id: true },
  })
  if (pending) {
    // Re-inviting refreshes the existing one rather than stacking duplicates.
    return prisma.groupInvite.update({
      where: { id: pending.id },
      data: {
        token: randomId(),
        role,
        createdByUserId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    })
  }

  return prisma.groupInvite.create({
    data: {
      id: randomId(),
      groupId,
      email: normalized,
      role,
      token: randomId(),
      createdByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  })
}

export async function listInvites(groupId: string) {
  const invites = await prisma.groupInvite.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  })

  return invites.map((invite) => ({
    ...invite,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    status: invite.acceptedAt
      ? ('ACCEPTED' as const)
      : invite.revokedAt
        ? ('REVOKED' as const)
        : invite.expiresAt.getTime() < Date.now()
          ? ('EXPIRED' as const)
          : ('PENDING' as const),
  }))
}

export async function revokeInvite({
  groupId,
  inviteId,
}: {
  groupId: string
  inviteId: string
}) {
  const { count } = await prisma.groupInvite.updateMany({
    where: { id: inviteId, groupId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (count === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Invitation not found, or already answered.',
    })
  }
}

/** The invite a signed-in visitor is looking at, plus whether they may accept it. */
export async function getInvite(token: string, userId: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    select: {
      id: true,
      groupId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      group: { select: { id: true, name: true } },
    },
  })
  if (!invite) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  const status = invite.acceptedAt
    ? ('ACCEPTED' as const)
    : invite.revokedAt
      ? ('REVOKED' as const)
      : invite.expiresAt.getTime() < Date.now()
        ? ('EXPIRED' as const)
        : ('PENDING' as const)

  return {
    ...invite,
    expiresAt: invite.expiresAt.toISOString(),
    status,
    /** False when the signed-in account is not the invited address. */
    matchesAccount: !!user && normalizeEmail(user.email) === invite.email,
  }
}

export async function acceptInvite({
  token,
  userId,
}: {
  token: string
  userId: string
}) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    select: {
      id: true,
      groupId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
    },
  })

  if (!invite) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found.' })
  }
  if (invite.acceptedAt || invite.revokedAt) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This invitation has already been used or revoked.',
    })
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This invitation has expired.',
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Log in required.' })
  }

  // The address is the security boundary. Without this check the token would be
  // a bearer capability and a forwarded invitation would grant anyone access.
  if (normalizeEmail(user.email) !== invite.email) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `This invitation was sent to ${invite.email}. Sign in with that address to accept it.`,
    })
  }

  await grantMembership({
    groupId: invite.groupId,
    userId: user.id,
    role: invite.role,
  })

  // A member with no name at the table cannot be included in an expense, and an
  // owner who typed the name before the account existed should not end up with
  // two rows for the same person.
  await ensureParticipantForUser({
    groupId: invite.groupId,
    userId: user.id,
    name: user.name,
  })

  await prisma.groupInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedByUserId: user.id },
  })

  return { groupId: invite.groupId }
}
