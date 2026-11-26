import {
  ActivityType,
  Expense,
  RecurrenceRule,
  RecurringExpenseLink,
} from '@/generated/prisma/client'
import { MAX_GROUPS_PER_QUERY } from '@/lib/group-query-limits'
import { syncMembershipsFromLinks } from '@/lib/membership'
import { prisma } from '@/lib/prisma'
import { randomId } from '@/lib/random'
import { nextRecurringDate, usesAnchorDay } from '@/lib/recurrence'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'

// Re-exported for backwards compatibility with existing server-side importers.
export { randomId }

/**
 * A reason to refuse a group form submission, stated for the user.
 *
 * All of these become a 400 with the message rendered as-is, rather than a 500:
 * the owner did something the form can explain and fix.
 */
export class GroupFormError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroupFormError'
  }
}

/**
 * A participant written with an email that cannot be linked. Rendered to the
 * user as-is, so the message says what to fix.
 */
export class ParticipantLinkError extends GroupFormError {
  constructor(message: string) {
    super(message)
    this.name = 'ParticipantLinkError'
  }
}

/**
 * Removing a participant that the ledger still refers to.
 *
 * `Participant` rows own expenses and shares with ON DELETE RESTRICT, so the
 * database would refuse the write; catching it here turns a P2003 into a
 * sentence the user can act on ("hide them" or leave them in the group).
 */
export class ParticipantInUseError extends GroupFormError {
  constructor(readonly names: string[]) {
    super(
      names.length === 1
        ? `${names[0]} cannot be removed: they have expenses in this group. Keep them in the group, or delete their expenses first.`
        : `${names.join(', ')} cannot be removed: they have expenses in this group. Keep them in the group, or delete their expenses first.`,
    )
    this.name = 'ParticipantInUseError'
  }
}

/**
 * A participant that exists in the group was submitted as a new one.
 *
 * Removing somebody and adding them back under the same name in one save is
 * almost always a stale form or a hand-written request: the ids are what mark a
 * participant as existing. Left alone it would silently soft-remove the real
 * row (dropping the account link) and create a duplicate in its place.
 */
export class StaleParticipantError extends GroupFormError {
  constructor(readonly names: string[]) {
    super(
      `${names.join(', ')} is already in this group, but was submitted as a new participant. Reload the form and try again.`,
    )
    this.name = 'StaleParticipantError'
  }
}

type ParticipantInput = GroupFormValues['participants'][number]

/**
 * Resolves the account emails typed on the group form into user ids.
 *
 * Only accounts that already exist can be linked: without an email there is
 * nobody to notify, and a pending invitation would need a token, an accept
 * screen and mail delivery. An address with no account is therefore an error
 * rather than a silent no-op -- the owner asked for something that did not
 * happen.
 */
async function resolveParticipantUserIds(
  participants: ParticipantInput[],
): Promise<Map<ParticipantInput, string>> {
  const links = new Map<ParticipantInput, string>()
  const emails = [
    ...new Set(
      participants
        .map(({ email }) => email)
        .filter((email): email is string => !!email),
    ),
  ]
  if (emails.length === 0) return links

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  })
  const userIdByEmail = new Map(users.map(({ id, email }) => [email, id]))

  const unknown = emails.filter((email) => !userIdByEmail.has(email))
  if (unknown.length > 0) {
    throw new ParticipantLinkError(
      unknown.length === 1
        ? `There is no account for ${unknown[0]}. Leave the email empty to add someone without one.`
        : `There is no account for ${unknown.join(', ')}. Leave the email empty to add someone without one.`,
    )
  }

  // One account cannot be two people in the same group.
  const namesByUserId = new Map<string, string>()
  for (const participant of participants) {
    if (!participant.email) continue
    const userId = userIdByEmail.get(participant.email)!
    const otherName = namesByUserId.get(userId)
    if (otherName !== undefined) {
      throw new ParticipantLinkError(
        `${participant.email} is used by both ${otherName} and ${participant.name}. Pick one.`,
      )
    }
    namesByUserId.set(userId, participant.name)
    links.set(participant, userId)
  }

  return links
}

export async function createGroup(
  groupFormValues: GroupFormValues,
  /** The signed-in creator, so the group can be listed as theirs. */
  createdByUserId?: string,
) {
  const links = await resolveParticipantUserIds(groupFormValues.participants)
  const groupId = randomId()

  // One transaction: a group nobody can open (no membership) or a membership
  // pointing at a group that was rolled back would both be broken states.
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        id: groupId,
        name: groupFormValues.name,
        createdByUserId,
        information: groupFormValues.information,
        currency: groupFormValues.currency,
        currencyCode: groupFormValues.currencyCode,
        participants: {
          createMany: {
            data: groupFormValues.participants.map((participant) => ({
              id: randomId(),
              name: participant.name,
              userId: links.get(participant),
            })),
          },
        },
      },
      include: { participants: true },
    })

    if (createdByUserId) {
      // The creator owns the group, which is an access right and not a ledger
      // identity: they may legitimately have left themselves out of the
      // participant list (an administrator keeping somebody else's books).
      await tx.groupMembership.create({
        data: {
          id: randomId(),
          groupId,
          userId: createdByUserId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      })

      // Participants the creator linked by email are named in the ledger, so
      // they must be able to open it. Without this, adding somebody by address
      // would list them but lock them out.
      const otherUserIds = [...new Set(links.values())].filter(
        (userId) => userId !== createdByUserId,
      )
      if (otherUserIds.length > 0) {
        await tx.groupMembership.createMany({
          data: otherUserIds.map((userId) => ({
            id: randomId(),
            groupId,
            userId,
            role: 'MEMBER' as const,
            status: 'ACTIVE' as const,
          })),
          skipDuplicates: true,
        })
      }
    }

    return group
  })
}

export async function createExpense(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  participantId?: string,
  // The expense form mints the id up front so the split it previews is the
  // one the saved expense gets (the id seeds who takes the leftover minor
  // unit, see `getExpenseShares`).
  expenseId: string = randomId(),
): Promise<Expense> {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  await logActivity(groupId, ActivityType.CREATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  const isCreateRecurrence =
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE
  const recurringExpenseLinkPayload = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  return prisma.expense.create({
    data: {
      id: expenseId,
      groupId,
      expenseDate: expenseFormValues.expenseDate,
      categoryId: expenseFormValues.category,
      amount: expenseFormValues.amount,
      originalAmount: expenseFormValues.originalAmount,
      originalCurrency: expenseFormValues.originalCurrency,
      conversionRate: expenseFormValues.conversionRate,
      title: expenseFormValues.title,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      recurrenceRule: expenseFormValues.recurrenceRule,
      recurringExpenseLink: {
        ...(isCreateRecurrence
          ? {
              create: recurringExpenseLinkPayload,
            }
          : {}),
      },
      paidFor: {
        createMany: {
          data: expenseFormValues.paidFor.map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        },
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        createMany: {
          data: expenseFormValues.documents.map((doc) => ({
            id: randomId(),
            url: doc.url,
            width: doc.width,
            height: doc.height,
          })),
        },
      },
      notes: expenseFormValues.notes,
    },
  })
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  participantId?: string,
) {
  const existingExpense = await getExpense(groupId, expenseId)
  await logActivity(groupId, ActivityType.DELETE_EXPENSE, {
    participantId,
    expenseId,
    data: existingExpense?.title,
  })

  // A reimbursement may be the settlement of a due date. Deleting it means the
  // money was not actually paid, so the obligation reopens instead of silently
  // disappearing. The link is read first because the foreign key is set to null
  // by the delete itself.
  const settledPaymentDue = await prisma.paymentDue.findUnique({
    where: { settledByExpenseId: expenseId },
    select: {
      id: true,
      groupId: true,
      fromParticipantId: true,
      toParticipantId: true,
    },
  })

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({
      where: { id: expenseId },
      include: { paidFor: true, paidBy: true },
    })

    if (!settledPaymentDue) return

    // Only one obligation per pair may be pending. If the debt was asked again
    // while this settlement existed, the newer request wins and this one is
    // marked as replaced -- otherwise reopening it would be rejected by the
    // unique index and the expense could never be deleted.
    const newerRequest = await tx.paymentDue.findFirst({
      where: {
        groupId: settledPaymentDue.groupId,
        fromParticipantId: settledPaymentDue.fromParticipantId,
        toParticipantId: settledPaymentDue.toParticipantId,
        status: 'PENDING',
        id: { not: settledPaymentDue.id },
      },
      select: { id: true },
    })

    await tx.paymentDue.update({
      where: { id: settledPaymentDue.id },
      data: {
        status: newerRequest ? 'SUPERSEDED' : 'PENDING',
        settledByExpenseId: null,
        settledAt: null,
      },
    })
  })
}

// Instead of deleting a group and all its data right away, it is scheduled for
// deletion, and can be restored during this grace period. Once it is over, the
// group is purged by src/lib/group-deletion.ts.
const GROUP_DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000

export async function scheduleGroupDeletion(
  groupId: string,
  groupName: string,
  participantId?: string,
) {
  // A single conditional update, so that two concurrent requests cannot both
  // succeed, nor push the deletion date back.
  const { count } = await prisma.group.updateMany({
    where: { id: groupId, name: groupName, deleteAt: null },
    data: { deleteAt: new Date(Date.now() + GROUP_DELETION_GRACE_PERIOD_MS) },
  })
  if (count === 0) {
    const group = await getGroup(groupId)
    if (!group) throw new Error('Invalid group ID')
    if (group.deleteAt)
      throw new Error('Group is already scheduled for deletion')
    throw new Error('Group name does not match')
  }

  await logActivity(groupId, ActivityType.SCHEDULE_GROUP_DELETION, {
    participantId,
  })
}

export async function restoreGroup(groupId: string, participantId?: string) {
  // Once its deletion date has passed, the group may be being purged: it can
  // no longer be restored.
  const { count } = await prisma.group.updateMany({
    where: { id: groupId, deleteAt: { gt: new Date() } },
    data: { deleteAt: null },
  })
  if (count === 0)
    throw new Error(
      'Group is not scheduled for deletion, or can no longer be restored',
    )

  await logActivity(groupId, ActivityType.RESTORE_GROUP, { participantId })
}

export async function getGroupExpensesParticipants(groupId: string) {
  const [payers, paidFor] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      distinct: ['paidById'],
      select: { paidById: true },
    }),
    prisma.expensePaidFor.findMany({
      where: { expense: { groupId } },
      distinct: ['participantId'],
      select: { participantId: true },
    }),
  ])

  return Array.from(
    new Set([
      ...payers.map((expense) => expense.paidById),
      ...paidFor.map((row) => row.participantId),
    ]),
  )
}

/**
 * Every group this account may open.
 *
 * This is the account-scoped replacement for the old "recent groups" list, which
 * lived in `localStorage` and was therefore shared by every account using the
 * same browser. Membership is now the only thing that decides this; the
 * `createdByUserId` fallback that used to paper over creator-less ledgers is
 * gone, because `createGroup` always writes an OWNER membership.
 */
export async function getGroupsForUser(userId: string) {
  return (
    await prisma.group.findMany({
      where: { memberships: { some: { userId, status: 'ACTIVE' } } },
      include: {
        _count: { select: { participants: { where: { removedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
      // Bounded like every other list in the app: the page renders a card per
      // group and the balance card queries them in one go, so an account with
      // hundreds of groups would make its own home page slow.
      take: MAX_GROUPS_PER_QUERY,
    })
  ).map((group) => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
  }))
}

/**
 * Loads groups the caller asked for by id, dropping any they are not a member of.
 *
 * The ids come from `localStorage` (a recency hint), which is not trusted: a
 * filtered query means a stale or tampered list cannot become a read of somebody
 * else's group.
 */
export async function getGroups(groupIds: string[], userId: string) {
  return (
    await prisma.group.findMany({
      where: {
        id: { in: groupIds },
        memberships: { some: { userId, status: 'ACTIVE' } },
      },
      include: {
        _count: { select: { participants: { where: { removedAt: null } } } },
      },
    })
  ).map((group) => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
  }))
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  expenseFormValues: ExpenseFormValues,
  participantId?: string,
) {
  const group = await getGroup(groupId)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  const existingExpense = await getExpense(groupId, expenseId)
  if (!existingExpense) throw new Error(`Invalid expense ID: ${expenseId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  await logActivity(groupId, ActivityType.UPDATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  const isDeleteRecurrenceExpenseLink =
    existingExpense.recurrenceRule !== RecurrenceRule.NONE &&
    expenseFormValues.recurrenceRule === RecurrenceRule.NONE &&
    // Delete the existing RecurrenceExpenseLink only if it has not been acted upon yet
    existingExpense.recurringExpenseLink?.nextExpenseCreatedAt === null

  const expenseDateChanged =
    existingExpense.expenseDate.getUTCFullYear() !==
      expenseFormValues.expenseDate.getUTCFullYear() ||
    existingExpense.expenseDate.getUTCMonth() !==
      expenseFormValues.expenseDate.getUTCMonth() ||
    existingExpense.expenseDate.getUTCDate() !==
      expenseFormValues.expenseDate.getUTCDate()
  const isUpdateRecurrenceExpenseLink =
    existingExpense.recurringExpenseLink?.nextExpenseCreatedAt === null &&
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE &&
    (existingExpense.recurrenceRule !== expenseFormValues.recurrenceRule ||
      expenseDateChanged)
  const isCreateRecurrenceExpenseLink =
    existingExpense.recurrenceRule === RecurrenceRule.NONE &&
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE &&
    // Create a new RecurrenceExpenseLink only if one does not already exist for the expense
    existingExpense.recurringExpenseLink === null

  const newRecurringExpenseLink = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  const updatedAnchorDay = usesAnchorDay(expenseFormValues.recurrenceRule)
    ? expenseFormValues.expenseDate.getUTCDate()
    : null
  const updatedRecurrenceExpenseLinkNextExpenseDate = nextRecurringDate(
    expenseFormValues.recurrenceRule,
    expenseFormValues.expenseDate,
    updatedAnchorDay,
  )

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      expenseDate: expenseFormValues.expenseDate,
      amount: expenseFormValues.amount,
      originalAmount: expenseFormValues.originalAmount,
      originalCurrency: expenseFormValues.originalCurrency,
      conversionRate: expenseFormValues.conversionRate,
      title: expenseFormValues.title,
      categoryId: expenseFormValues.category,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      recurrenceRule: expenseFormValues.recurrenceRule,
      paidFor: {
        create: expenseFormValues.paidFor
          .filter(
            (p) =>
              !existingExpense.paidFor.some(
                (pp) => pp.participantId === p.participant,
              ),
          )
          .map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        update: expenseFormValues.paidFor.map((paidFor) => ({
          where: {
            expenseId_participantId: {
              expenseId,
              participantId: paidFor.participant,
            },
          },
          data: {
            shares: paidFor.shares,
          },
        })),
        deleteMany: existingExpense.paidFor.filter(
          (paidFor) =>
            !expenseFormValues.paidFor.some(
              (pf) => pf.participant === paidFor.participantId,
            ),
        ),
      },
      recurringExpenseLink: {
        ...(isCreateRecurrenceExpenseLink
          ? {
              create: newRecurringExpenseLink,
            }
          : {}),
        ...(isUpdateRecurrenceExpenseLink
          ? {
              update: {
                nextExpenseDate: updatedRecurrenceExpenseLinkNextExpenseDate,
                anchorDay: updatedAnchorDay,
              },
            }
          : {}),
        delete: isDeleteRecurrenceExpenseLink,
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        connectOrCreate: expenseFormValues.documents.map((doc) => ({
          create: doc,
          where: { id: doc.id },
        })),
        deleteMany: existingExpense.documents
          .filter(
            (existingDoc) =>
              !expenseFormValues.documents.some(
                (doc) => doc.id === existingDoc.id,
              ),
          )
          .map((doc) => ({
            id: doc.id,
          })),
      },
      notes: expenseFormValues.notes,
    },
  })
}

export async function updateGroup(
  groupId: string,
  groupFormValues: GroupFormValues,
  participantId?: string,
) {
  const existingGroup = await getGroup(groupId)
  if (!existingGroup) throw new Error('Invalid group ID')

  const links = await resolveParticipantUserIds(groupFormValues.participants)

  // An account can only be one person per group. Reject a submission that would
  // give an account to a second participant *here*, rather than letting the
  // database raise P2002, which reaches the user as a 500.
  //
  // Participants being removed in this same save do not count: removal releases
  // their link (see the write below), so moving an account from a removed
  // participant to a kept one is legitimate.
  const keptIds = new Set(
    groupFormValues.participants.map(({ id }) => id).filter(Boolean),
  )
  const targetIdByUserId = new Map<string, string | undefined>()
  for (const participant of groupFormValues.participants) {
    if (links.has(participant)) {
      targetIdByUserId.set(links.get(participant)!, participant.id)
    }
  }
  const alreadyLinked = await prisma.participant.findMany({
    where: { groupId, userId: { in: [...targetIdByUserId.keys()] } },
    select: { id: true, userId: true, name: true },
  })
  const conflict = alreadyLinked.find(
    (participant) =>
      keptIds.has(participant.id) &&
      targetIdByUserId.get(participant.userId!) !== participant.id,
  )
  if (conflict) {
    throw new ParticipantLinkError(
      `That account is already used by ${conflict.name} in this group.`,
    )
  }

  const removedParticipants = existingGroup.participants.filter(
    (p) => !groupFormValues.participants.some((p2) => p2.id === p.id),
  )
  await assertParticipantsRemovable(removedParticipants)
  assertNoStaleParticipants(removedParticipants, groupFormValues.participants)

  await logActivity(groupId, ActivityType.UPDATE_GROUP, { participantId })

  await prisma.group.update({
    where: { id: groupId },
    data: {
      name: groupFormValues.name,
      information: groupFormValues.information,
      currency: groupFormValues.currency,
      currencyCode: groupFormValues.currencyCode,
      participants: {
        // No `deleteMany`: removing a participant from the form hides them from
        // the group but keeps their row, because their expenses and shares
        // reference it. Deleting the row would either fail (RESTRICT) or -- as
        // it did before -- cascade the ledger into oblivion.
        //
        // Removals come first and clear `userId`: the account link has to be
        // free before another participant can claim it, or the write collides
        // with the unique `(groupId, userId)` constraint. Clearing it also says
        // what happened -- this person is no longer a name at this table --
        // without touching their membership, which is a separate decision made
        // on the members page.
        updateMany: [
          ...removedParticipants.map((participant) => ({
            where: { id: participant.id },
            data: { removedAt: new Date(), userId: null },
          })),
          ...groupFormValues.participants
            .filter((participant) => participant.id !== undefined)
            .map((participant) => ({
              where: { id: participant.id },
              data: {
                name: participant.name,
                // Left untouched when the field is empty, so editing the group
                // cannot silently unlink somebody who is already receiving
                // reminders.
                ...(links.has(participant)
                  ? { userId: links.get(participant) }
                  : {}),
              },
            })),
        ],
        createMany: {
          data: groupFormValues.participants
            .filter((participant) => participant.id === undefined)
            .map((participant) => ({
              id: randomId(),
              name: participant.name,
              userId: links.get(participant),
            })),
        },
      },
    },
  })

  // An owner who typed an address has named an existing account in the ledger;
  // that account has to be able to open the group, or the name is a dead end.
  await syncMembershipsFromLinks(groupId)

  return getGroup(groupId)
}

/**
 * Catches a submission that drops a participant's id and re-adds the name.
 *
 * The form sends an id for every participant it loaded, so this only happens
 * when the payload was built by something else (a stale tab, a script). Without
 * the check the save looks successful while it actually soft-removes the real
 * person -- releasing their account link -- and appends a duplicate.
 */
function assertNoStaleParticipants(
  removed: { name: string }[],
  submitted: { id?: string; name: string }[],
) {
  if (removed.length === 0) return

  const removedNames = new Set(
    removed.map(({ name }) => name.trim().toLowerCase()),
  )
  const recreated = submitted
    .filter(
      (participant) =>
        participant.id === undefined &&
        removedNames.has(participant.name.trim().toLowerCase()),
    )
    .map(({ name }) => name)

  if (recreated.length > 0) throw new StaleParticipantError(recreated)
}

/**
 * Refuses to remove participants the ledger still refers to.
 *
 * The database enforces the same rule with ON DELETE RESTRICT; this check exists
 * so the answer is a sentence naming the person instead of a P2003.
 */
async function assertParticipantsRemovable(
  removed: { id: string; name: string }[],
) {
  if (removed.length === 0) return

  const ids = removed.map(({ id }) => id)
  const [payers, shareHolders, debtors, creditors] = await Promise.all([
    prisma.expense.findMany({
      where: { paidById: { in: ids } },
      distinct: ['paidById'],
      select: { paidById: true },
    }),
    prisma.expensePaidFor.findMany({
      where: { participantId: { in: ids } },
      distinct: ['participantId'],
      select: { participantId: true },
    }),
    prisma.paymentDue.findMany({
      where: { fromParticipantId: { in: ids } },
      distinct: ['fromParticipantId'],
      select: { fromParticipantId: true },
    }),
    prisma.paymentDue.findMany({
      where: { toParticipantId: { in: ids } },
      distinct: ['toParticipantId'],
      select: { toParticipantId: true },
    }),
  ])

  const inUse = new Set([
    ...payers.map(({ paidById }) => paidById),
    ...shareHolders.map(({ participantId }) => participantId),
    ...debtors.map(({ fromParticipantId }) => fromParticipantId),
    ...creditors.map(({ toParticipantId }) => toParticipantId),
  ])

  const blocked = removed
    .filter(({ id }) => inUse.has(id))
    .map(({ name }) => name)
  if (blocked.length > 0) throw new ParticipantInUseError(blocked)
}

export async function getGroup(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    // Participants who left keep their rows for history but are no longer part
    // of the group: they must not appear in the expense form, the stats, or the
    // settings list.
    include: { participants: { where: { removedAt: null } } },
  })
}

export async function getCategories() {
  return prisma.category.findMany()
}

export async function getGroupExpenses(
  groupId: string,
  options?: { offset?: number; length?: number; filter?: string },
) {
  await createRecurringExpenses()

  return prisma.expense.findMany({
    select: {
      amount: true,
      category: true,
      createdAt: true,
      expenseDate: true,
      id: true,
      isReimbursement: true,
      originalAmount: true,
      originalCurrency: true,
      paidBy: { select: { id: true, name: true } },
      paidFor: {
        select: {
          participant: { select: { id: true, name: true } },
          shares: true,
        },
      },
      splitMode: true,
      recurrenceRule: true,
      title: true,
      _count: { select: { documents: true } },
    },
    where: {
      groupId,
      // Search matches the title or the notes (#601).
      OR: options?.filter
        ? [
            { title: { contains: options.filter, mode: 'insensitive' } },
            { notes: { contains: options.filter, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    skip: options && options.offset,
    take: options && options.length,
  })
}

export async function getGroupExpenseCount(groupId: string) {
  return prisma.expense.count({ where: { groupId } })
}

/**
 * Returns the currently active recurring expenses of a group: the latest frame
 * of every ongoing recurring series. Each materialized frame keeps its own
 * `recurringExpenseLink`, but only the current frame's link is still "open"
 * (`nextExpenseCreatedAt` is null) — past frames have it set once their
 * successor is created (see `createRecurringExpenses`). Filtering on the open
 * link ensures a single subscription is counted only once. Used for recurring
 * stats (#508).
 */
export async function getActiveRecurringExpenses(groupId: string) {
  await createRecurringExpenses()

  return prisma.expense.findMany({
    select: {
      id: true,
      title: true,
      amount: true,
      category: true,
      recurrenceRule: true,
      isReimbursement: true,
    },
    where: {
      groupId,
      isReimbursement: false,
      recurrenceRule: { not: RecurrenceRule.NONE },
      recurringExpenseLink: { is: { nextExpenseCreatedAt: null } },
    },
    orderBy: { amount: 'desc' },
  })
}

export async function getExpense(groupId: string, expenseId: string) {
  return prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      paidBy: true,
      paidFor: true,
      category: true,
      documents: true,
      recurringExpenseLink: true,
    },
  })
}

export async function getActivities(
  groupId: string,
  options?: { offset?: number; length?: number },
) {
  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: [{ time: 'desc' }],
    skip: options?.offset,
    take: options?.length,
  })

  const expenseIds = activities
    .map((activity) => activity.expenseId)
    .filter(Boolean)
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      id: { in: expenseIds },
    },
  })

  return activities.map((activity) => ({
    ...activity,
    expense:
      activity.expenseId !== null
        ? expenses.find((expense) => expense.id === activity.expenseId)
        : undefined,
  }))
}

export async function logActivity(
  groupId: string,
  activityType: ActivityType,
  extra?: { participantId?: string; expenseId?: string; data?: string },
) {
  return prisma.activity.create({
    data: {
      id: randomId(),
      groupId,
      activityType,
      ...extra,
    },
  })
}

async function createRecurringExpenses() {
  const localDate = new Date() // Current local date
  const utcDateFromLocal = new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      // More precision beyond date is required to ensure that recurring Expenses are created within <most precises unit> of when expected
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
    ),
  )

  const recurringExpenseLinksWithExpensesToCreate =
    await prisma.recurringExpenseLink.findMany({
      where: {
        nextExpenseCreatedAt: null,
        nextExpenseDate: {
          lte: utcDateFromLocal,
        },
      },
      include: {
        currentFrameExpense: {
          include: {
            paidBy: true,
            paidFor: true,
            category: true,
            documents: true,
          },
        },
      },
    })

  for (const recurringExpenseLink of recurringExpenseLinksWithExpensesToCreate) {
    let newExpenseDate = recurringExpenseLink.nextExpenseDate

    let currentExpenseRecord = recurringExpenseLink.currentFrameExpense
    let currentReccuringExpenseLinkId = recurringExpenseLink.id
    const anchorDay =
      recurringExpenseLink.anchorDay ??
      (usesAnchorDay(currentExpenseRecord.recurrenceRule)
        ? currentExpenseRecord.expenseDate.getUTCDate()
        : null)

    while (newExpenseDate < utcDateFromLocal) {
      const recurrenceRule = currentExpenseRecord.recurrenceRule

      if (recurrenceRule === null || recurrenceRule === RecurrenceRule.NONE)
        break

      const newExpenseId = randomId()
      const newRecurringExpenseLinkId = randomId()

      const newRecurringExpenseNextExpenseDate = nextRecurringDate(
        recurrenceRule,
        newExpenseDate,
        anchorDay,
      )

      const {
        category,
        paidBy,
        paidFor,
        documents,
        ...destructeredCurrentExpenseRecord
      } = currentExpenseRecord

      // Use a transacton to ensure that the only one expense is created for the RecurringExpenseLink
      // just in case two clients are processing the same RecurringExpenseLink at the same time
      const newExpense = await prisma
        .$transaction(async (transaction) => {
          const newExpense = await transaction.expense.create({
            data: {
              ...destructeredCurrentExpenseRecord,
              categoryId: currentExpenseRecord.categoryId,
              paidById: currentExpenseRecord.paidById,
              paidFor: {
                createMany: {
                  data: currentExpenseRecord.paidFor.map((paidFor) => ({
                    participantId: paidFor.participantId,
                    shares: paidFor.shares,
                  })),
                },
              },
              documents: {
                createMany: {
                  data: currentExpenseRecord.documents.map(
                    (documentRecord) => ({
                      id: randomId(),
                      url: documentRecord.url,
                      width: documentRecord.width,
                      height: documentRecord.height,
                    }),
                  ),
                },
              },
              id: newExpenseId,
              expenseDate: newExpenseDate,
              recurringExpenseLink: {
                create: {
                  groupId: currentExpenseRecord.groupId,
                  id: newRecurringExpenseLinkId,
                  nextExpenseDate: newRecurringExpenseNextExpenseDate,
                  anchorDay,
                },
              },
            },
            // Ensure that the same information is available on the returned record that was created
            include: {
              paidFor: true,
              documents: true,
              category: true,
              paidBy: true,
            },
          })

          // Mark the RecurringExpenseLink as being "completed" since the new Expense was created
          // if an expense hasn't been created for this RecurringExpenseLink yet
          await transaction.recurringExpenseLink.update({
            where: {
              id: currentReccuringExpenseLinkId,
              nextExpenseCreatedAt: null,
            },
            data: {
              nextExpenseCreatedAt: newExpense.createdAt,
              anchorDay,
            },
          })

          return newExpense
        })
        .catch(() => {
          console.error(
            'Failed to created recurringExpense for expenseId: %s',
            currentExpenseRecord.id,
          )
          return null
        })

      // If the new expense failed to be created, break out of the while-loop
      if (newExpense === null) break

      // Set the values for the next iteration of the for-loop in case multiple recurring Expenses need to be created
      currentExpenseRecord = newExpense
      currentReccuringExpenseLinkId = newRecurringExpenseLinkId
      newExpenseDate = newRecurringExpenseNextExpenseDate
    }
  }
}

function createPayloadForNewRecurringExpenseLink(
  recurrenceRule: RecurrenceRule,
  priorDateToNextRecurrence: Date,
  groupId: String,
): RecurringExpenseLink {
  const anchorDay = usesAnchorDay(recurrenceRule)
    ? priorDateToNextRecurrence.getUTCDate()
    : null
  const nextExpenseDate = nextRecurringDate(
    recurrenceRule,
    priorDateToNextRecurrence,
    anchorDay,
  )

  const recurringExpenseLinkId = randomId()
  const recurringExpenseLinkPayload = {
    id: recurringExpenseLinkId,
    groupId: groupId,
    nextExpenseDate: nextExpenseDate,
    anchorDay,
  }

  return recurringExpenseLinkPayload as RecurringExpenseLink
}
