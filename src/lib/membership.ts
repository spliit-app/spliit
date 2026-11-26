/**
 * Group access control.
 *
 * Two questions are deliberately kept apart:
 *
 * - *May this account open this group?* -> `GroupMembership`.
 * - *Which participant at the table is this account?* -> `Participant.userId`.
 *
 * They are not the same thing. A participant is a ledger identity that exists
 * whether or not its owner has ever signed up ("the flatmate who will never
 * install the app"), and it owns financial rows that must survive the person
 * leaving the group. A membership is purely an access right, and revoking it
 * must not touch a single expense. Splitting the two is what makes revocation
 * possible at all: `Participant` deletion is blocked by RESTRICT precisely
 * because the ledger rows it owns are not disposable.
 */
import type { GroupRole, MembershipStatus } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { randomId } from '@/lib/random'

export type Membership = {
  id: string
  groupId: string
  userId: string
  role: GroupRole
  status: MembershipStatus
}

export type GroupAccess = {
  membership: Membership
  /**
   * The participant row linked to this account, if there is one.
   *
   * Null for an administrator who manages a ledger they are not part of, and
   * for a member who has not been linked to a name yet.
   */
  participantId: string | null
}

const membershipFields = {
  id: true,
  groupId: true,
  userId: true,
  role: true,
  status: true,
} as const

/**
 * The caller's access to a group, or null when they have none.
 *
 * A `REMOVED` membership is kept as an audit trail, so `status` is checked
 * rather than the row's existence.
 */
export async function getGroupAccess(
  groupId: string,
  userId: string,
): Promise<GroupAccess | null> {
  const [membership, participant] = await Promise.all([
    prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: membershipFields,
    }),
    prisma.participant.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { id: true, removedAt: true },
    }),
  ])

  if (!membership || membership.status !== 'ACTIVE') return null

  return {
    membership,
    participantId:
      participant && !participant.removedAt ? participant.id : null,
  }
}

export async function isGroupMember(groupId: string, userId: string) {
  return (await getGroupAccess(groupId, userId)) !== null
}

/**
 * Creates or reactivates a membership.
 *
 * `role` is only ever escalated, never demoted: re-inviting an owner as a plain
 * member must not hand the group to whoever sent the invitation.
 */
export async function grantMembership({
  groupId,
  userId,
  role = 'MEMBER',
}: {
  groupId: string
  userId: string
  role?: GroupRole
}) {
  return prisma.groupMembership.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: {
      id: randomId(),
      groupId,
      userId,
      role,
      status: 'ACTIVE',
    },
    update: {
      status: 'ACTIVE',
      ...(role === 'OWNER' ? { role: 'OWNER' as const } : {}),
    },
    select: membershipFields,
  })
}

/** Revokes access without touching the ledger. */
export async function revokeMembership(groupId: string, userId: string) {
  await prisma.groupMembership.updateMany({
    where: { groupId, userId, status: 'ACTIVE' },
    data: { status: 'REMOVED' },
  })
}

export async function listGroupMembers(groupId: string) {
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    select: {
      ...membershipFields,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  const participants = await prisma.participant.findMany({
    where: { groupId, userId: { not: null } },
    select: { id: true, userId: true, name: true },
  })
  const participantIdByUserId = new Map(
    participants.map(({ id, userId }) => [userId!, id]),
  )

  return memberships.map((membership) => ({
    ...membership,
    createdAt: membership.createdAt.toISOString(),
    participantId: participantIdByUserId.get(membership.userId) ?? null,
  }))
}

/**
 * Makes sure an account has a name at the table in this group.
 *
 * When the owner already typed the person's name before they had an account,
 * that unlinked row is adopted rather than duplicated -- otherwise the newcomer
 * starts with a zero balance while their expenses sit under a stranger.
 */
export async function ensureParticipantForUser({
  groupId,
  userId,
  name,
}: {
  groupId: string
  userId: string
  name: string
}): Promise<string> {
  const existing = await prisma.participant.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true, removedAt: true },
  })
  if (existing) {
    if (existing.removedAt) {
      await prisma.participant.update({
        where: { id: existing.id },
        data: { removedAt: null },
      })
    }
    return existing.id
  }

  const candidates = await prisma.participant.findMany({
    where: {
      groupId,
      userId: null,
      removedAt: null,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true },
  })

  // Ambiguous on purpose: two people called "Alex" means guessing would attach
  // the account to the wrong ledger identity, which is worse than a duplicate.
  if (candidates.length === 1) {
    const [candidate] = candidates
    await prisma.participant.update({
      where: { id: candidate.id },
      data: { userId },
    })
    return candidate.id
  }

  const created = await prisma.participant.create({
    data: { id: randomId(), groupId, userId, name },
    select: { id: true },
  })
  return created.id
}

/**
 * Every participant row in the group that is linked to an account, with the
 * accounts that are not members yet.
 *
 * Used by `updateGroup` after an owner types an email: linking a participant to
 * an account has to grant that account access, or the invitee would be named in
 * the ledger but unable to open it.
 */
export async function syncMembershipsFromLinks(groupId: string) {
  const linked = await prisma.participant.findMany({
    where: { groupId, userId: { not: null }, removedAt: null },
    select: { userId: true },
  })

  const userIds = [...new Set(linked.map(({ userId }) => userId!))]
  if (userIds.length === 0) return

  const existing = await prisma.groupMembership.findMany({
    where: { groupId, userId: { in: userIds } },
    select: { userId: true, status: true },
  })
  const active = new Set(
    existing
      .filter(({ status }) => status === 'ACTIVE')
      .map(({ userId }) => userId),
  )

  await Promise.all(
    userIds
      .filter((userId) => !active.has(userId))
      .map((userId) => grantMembership({ groupId, userId, role: 'MEMBER' })),
  )
}
