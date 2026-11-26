/**
 * Persistence for settle-up obligations (`PaymentDue`).
 *
 * The rules that decide whether someone is late or whether an obligation is
 * still current live in `@/lib/payment-due` and stay pure and unit-tested. This
 * module only loads, writes and reconciles, so the two never blur together.
 */
import {
  ActivityType,
  PaymentDueStatus,
  Prisma,
} from '@/generated/prisma/client'
import { getGroupExpenses, logActivity } from '@/lib/api'
import { getBalances, getSuggestedReimbursements } from '@/lib/balances'
import {
  getPaymentDueNotifications,
  isPaymentDueStale,
  toDayKey,
  type PaymentDueNotification,
} from '@/lib/payment-due'
import { prisma } from '@/lib/prisma'
import { randomId } from '@/lib/random'
import { TRPCError } from '@trpc/server'

/** Category 1 is "Payment", which is what the reimbursement form uses too. */
const PAYMENT_CATEGORY_ID = 1

/** A `@db.Date` column reads and writes as midnight UTC. */
function dayKeyToDate(value: Date | string) {
  return new Date(`${toDayKey(value)}T00:00:00.000Z`)
}

export type GroupPaymentDue = Awaited<
  ReturnType<typeof listGroupPaymentDues>
>['paymentDues'][number]

/**
 * Active obligations first (closest deadline first), history after, so the
 * balances page can render the list without re-sorting.
 */
export async function listGroupPaymentDues(groupId: string) {
  const [dues, expenses] = await Promise.all([
    prisma.paymentDue.findMany({ where: { groupId } }),
    getGroupExpenses(groupId),
  ])

  // Balances are computed, so "is this obligation still true?" can only be
  // answered against the freshly computed suggestions.
  const suggestedReimbursements = getSuggestedReimbursements(
    getBalances(expenses),
  )

  const withStaleness = dues.map((due) => ({
    ...due,
    stale:
      due.status === 'PENDING' &&
      isPaymentDueStale(due, suggestedReimbursements),
  }))

  return {
    paymentDues: withStaleness.sort((a, b) => {
      const aActive = a.status === 'PENDING' ? 0 : 1
      const bActive = b.status === 'PENDING' ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      if (aActive === 0) {
        return a.dueDate.getTime() - b.dueDate.getTime()
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    }),
  }
}

export type CreatePaymentDueInput = {
  groupId: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
  dueDate: Date | string
  createdByParticipantId?: string
}

/**
 * Asks one participant to pay another by a deadline.
 *
 * A pair can only have one active obligation at a time: asking again supersedes
 * the previous one. That keeps the notification list honest (one debt, one
 * reminder) and gives "re-ask with a new deadline" a natural shape — a new row,
 * so dismissal state tied to the old row cannot leak into the new deadline.
 */
export async function createPaymentDue({
  groupId,
  fromParticipantId,
  toParticipantId,
  amount,
  dueDate,
  createdByParticipantId,
}: CreatePaymentDueInput) {
  if (fromParticipantId === toParticipantId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A participant cannot owe themselves money.',
    })
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The amount must be a positive number of minor units.',
    })
  }

  const participants = await prisma.participant.count({
    where: { groupId, id: { in: [fromParticipantId, toParticipantId] } },
  })
  if (participants !== 2) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Both participants must belong to this group.',
    })
  }

  const day = dayKeyToDate(dueDate)
  const id = randomId()

  try {
    await prisma.$transaction([
      prisma.paymentDue.updateMany({
        where: {
          groupId,
          fromParticipantId,
          toParticipantId,
          status: PaymentDueStatus.PENDING,
        },
        data: { status: PaymentDueStatus.SUPERSEDED },
      }),
      prisma.paymentDue.create({
        data: {
          id,
          groupId,
          fromParticipantId,
          toParticipantId,
          amount,
          dueDate: day,
          createdByParticipantId,
        },
      }),
    ])
  } catch (error) {
    // A partial unique index allows only one PENDING obligation per pair, so two
    // requests racing for the same pair cannot both leave one behind.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A settle-up request is already pending for this pair.',
      })
    }
    throw error
  }

  await logActivity(groupId, ActivityType.CREATE_PAYMENT_DUE, {
    participantId: createdByParticipantId,
    data: JSON.stringify({ dueDate: toDayKey(day) }),
  })

  return { paymentDueId: id }
}

/**
 * Records the money as paid by creating the reimbursement expense that the
 * ledger already understands, and links it to the obligation.
 *
 * Deliberately an ordinary `Expense`: balances keep being computed from the
 * expense list, so a settlement never becomes a second, parallel source of
 * truth. Deleting that expense reopens the obligation (see `deleteExpense`).
 */
export async function settlePaymentDue({
  groupId,
  paymentDueId,
  participantId,
  title,
  today = new Date(),
}: {
  groupId: string
  paymentDueId: string
  participantId?: string
  title: string
  today?: Date
}) {
  const due = await prisma.paymentDue.findFirst({
    where: { id: paymentDueId, groupId },
  })
  if (!due) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Payment due not found.',
    })
  }
  if (due.status !== PaymentDueStatus.PENDING) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This payment is not pending anymore.',
    })
  }

  const expenseId = randomId()
  const expenseDate = dayKeyToDate(today)

  await prisma.$transaction(async (tx) => {
    // Insert first: the foreign key from the obligation to the expense must
    // point at a row that exists. If the claim below loses the race, throwing
    // rolls this insert back with the rest of the transaction.
    await tx.expense.create({
      data: {
        id: expenseId,
        groupId,
        expenseDate,
        title,
        categoryId: PAYMENT_CATEGORY_ID,
        amount: due.amount,
        paidById: due.fromParticipantId,
        splitMode: 'EVENLY',
        isReimbursement: true,
        paidFor: {
          createMany: {
            data: [{ participantId: due.toParticipantId, shares: 1 }],
          },
        },
      },
    })

    // Claim the obligation in one statement. Two people tapping "Mark as paid"
    // at the same time would otherwise both pass the PENDING check above and
    // record the reimbursement twice, leaving one orphaned expense and a ledger
    // that says the debt was paid double.
    const claimed = await tx.paymentDue.updateMany({
      where: { id: due.id, groupId, status: PaymentDueStatus.PENDING },
      data: {
        status: PaymentDueStatus.SETTLED,
        settledByExpenseId: expenseId,
        settledAt: new Date(),
      },
    })
    if (claimed.count === 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This payment is not pending anymore.',
      })
    }
  })

  await logActivity(groupId, ActivityType.SETTLE_PAYMENT_DUE, {
    participantId,
    expenseId,
    data: JSON.stringify({ dueDate: toDayKey(due.dueDate) }),
  })

  return { expenseId }
}

export async function cancelPaymentDue({
  groupId,
  paymentDueId,
  participantId,
}: {
  groupId: string
  paymentDueId: string
  participantId?: string
}) {
  // updateMany so the "still pending" check and the write are one statement:
  // two people tapping cancel at the same time cannot both succeed.
  const { count } = await prisma.paymentDue.updateMany({
    where: {
      id: paymentDueId,
      groupId,
      status: PaymentDueStatus.PENDING,
    },
    data: { status: PaymentDueStatus.CANCELLED },
  })
  if (count === 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This payment is not pending anymore.',
    })
  }

  await logActivity(groupId, ActivityType.CANCEL_PAYMENT_DUE, { participantId })
  return {}
}

export type UserNotification = PaymentDueNotification & {
  groupId: string
  groupName: string
  currency: string
  currencyCode: string | null
  /** The other party's ledger name, resolved for display. */
  counterpartName: string
}

/**
 * Every settle-up reminder the user should see, across all their groups.
 *
 * A user is "in" a group through a `Participant` row that points at their
 * account, which is also what makes an in-app notification meaningful: the
 * debtor is a person with a login, not just a name.
 */
export async function listNotificationsForUser(
  userId: string,
  today = new Date(),
): Promise<UserNotification[]> {
  const participants = await prisma.participant.findMany({
    // Only groups the account can still open: a notification about a group the
    // user was removed from would be a dead link in the header.
    where: {
      userId,
      removedAt: null,
      group: {
        memberships: { some: { userId, status: 'ACTIVE' } },
      },
    },
    select: {
      id: true,
      name: true,
      group: {
        select: { id: true, name: true, currency: true, currencyCode: true },
      },
    },
  })
  if (participants.length === 0) return []

  const ids = participants.map(({ id }) => id)
  const dues = await prisma.paymentDue.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { fromParticipantId: { in: ids } },
        { toParticipantId: { in: ids } },
      ],
    },
    select: {
      id: true,
      groupId: true,
      fromParticipantId: true,
      toParticipantId: true,
      amount: true,
      dueDate: true,
      status: true,
    },
  })

  const names = new Map(
    (
      await prisma.participant.findMany({
        where: {
          id: {
            in: dues.flatMap((d) => [d.fromParticipantId, d.toParticipantId]),
          },
        },
        select: { id: true, name: true },
      })
    ).map((p) => [p.id, p.name]),
  )

  // Rules are per participant, so run them once per identity and merge.
  return participants
    .flatMap((participant) => {
      const group = participant.group
      return getPaymentDueNotifications({
        dues: dues.filter((d) => d.groupId === group.id),
        participantId: participant.id,
        today,
      }).map((notification) => ({
        ...notification,
        groupId: group.id,
        groupName: group.name,
        currency: group.currency,
        currencyCode: group.currencyCode,
        counterpartName:
          names.get(notification.counterpartParticipantId) ?? '?',
      }))
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue || b.amount - a.amount)
}
