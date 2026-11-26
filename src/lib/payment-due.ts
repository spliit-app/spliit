/**
 * Settle-up obligations ("Bob owes Alice €42.50 by 1 March") and the in-app
 * notifications derived from them.
 *
 * Notifications are *derived* on read rather than stored and pushed: a
 * `PaymentDue` row already carries everything needed to decide whether someone
 * is late, so there is no scheduler, no delivery state and no way for a
 * notification to contradict the ledger. Read a due date, compare it to today,
 * done.
 */
import { Reimbursement } from '@/lib/balances'

export type PaymentDueStatus =
  'PENDING' | 'SETTLED' | 'CANCELLED' | 'SUPERSEDED'

/**
 * The structural subset of a `PaymentDue` row this module needs, so the rules
 * stay testable without a database.
 */
export type PaymentDueLike = {
  id: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
  dueDate: Date | string
  status: PaymentDueStatus
}

export type PaymentDueNotificationKind =
  // The participant has to pay something, increasingly urgent.
  | 'DUE_SOON'
  | 'DUE_TODAY'
  | 'OVERDUE'
  // The participant is the creditor and the money is late.
  | 'AWAITING_PAYMENT'

export type PaymentDueNotification = {
  kind: PaymentDueNotificationKind
  paymentDueId: string
  /** Which side of the obligation the participant is on. */
  role: 'debtor' | 'creditor'
  /** The other party, so the UI can say who to pay / who owes you. */
  counterpartParticipantId: string
  amount: number
  /** Calendar day (`YYYY-MM-DD`), not an instant: a due date has no timezone. */
  dueDate: string
  /** Negative when late. 0 means due today. */
  daysUntilDue: number
}

/** How many days before the deadline the debtor starts seeing a reminder. */
export const DEFAULT_DUE_SOON_DAYS = 3

const DAY_MS = 86_400_000

const KIND_ORDER: Record<PaymentDueNotificationKind, number> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  AWAITING_PAYMENT: 2,
  DUE_SOON: 3,
}

/**
 * Reduces a date to the calendar day it is on, in UTC.
 *
 * `dueDate` is a Postgres `DATE` column, which Prisma hands back as midnight
 * UTC, so taking the UTC day is stable regardless of the server's timezone.
 * Treating a due date as an instant would make the same obligation "overdue"
 * for a user in Auckland and "due today" for one in Los Angeles.
 */
export function toDayKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

function daysBetween(fromDay: string, toDay: string): number {
  const from = Date.parse(`${fromDay}T00:00:00.000Z`)
  const to = Date.parse(`${toDay}T00:00:00.000Z`)
  return Math.round((to - from) / DAY_MS)
}

/**
 * Whole calendar days from today to a deadline; negative when late, 0 when due
 * today. The UI needs this beyond the reminder window, so it is exported rather
 * than inlined in the notification rules.
 */
export function daysUntilDue(
  dueDate: Date | string,
  today: Date | string = new Date(),
): number {
  return daysBetween(toDayKey(today), toDayKey(dueDate))
}

/**
 * Every notification `participantId` should see right now.
 *
 * The debtor is notified `dueSoonDays` before the deadline and stays notified
 * while late. The creditor only learns the money is late — someone nagging you
 * about a debt that is not due yet is exactly the noise this feature avoids.
 */
export function getPaymentDueNotifications({
  dues,
  participantId,
  today = new Date(),
  dueSoonDays = DEFAULT_DUE_SOON_DAYS,
}: {
  dues: PaymentDueLike[]
  participantId: string
  today?: Date | string
  dueSoonDays?: number
}): PaymentDueNotification[] {
  const todayKey = toDayKey(today)
  const notifications: PaymentDueNotification[] = []

  for (const due of dues) {
    // Settled, cancelled and superseded obligations are history.
    if (due.status !== 'PENDING') continue

    const dueDate = toDayKey(due.dueDate)
    const days = daysBetween(todayKey, dueDate)
    const isDebtor = due.fromParticipantId === participantId
    const isCreditor = due.toParticipantId === participantId
    if (!isDebtor && !isCreditor) continue

    if (isDebtor) {
      const kind: PaymentDueNotificationKind | undefined =
        days < 0
          ? 'OVERDUE'
          : days === 0
            ? 'DUE_TODAY'
            : days <= dueSoonDays
              ? 'DUE_SOON'
              : undefined
      if (kind) {
        notifications.push({
          kind,
          paymentDueId: due.id,
          role: 'debtor',
          counterpartParticipantId: due.toParticipantId,
          amount: due.amount,
          dueDate,
          daysUntilDue: days,
        })
      }
      continue
    }

    // Creditor: only once the money is late.
    if (days < 0) {
      notifications.push({
        kind: 'AWAITING_PAYMENT',
        paymentDueId: due.id,
        role: 'creditor',
        counterpartParticipantId: due.fromParticipantId,
        amount: due.amount,
        dueDate,
        daysUntilDue: days,
      })
    }
  }

  return notifications.sort(compareNotifications)
}

/**
 * Most urgent first, which is what the notification list and its badge need:
 * the oldest overdue debt, then what is due today, then money owed to you, then
 * the upcoming ones. Ties break by amount, then id, so the order is stable
 * across renders.
 */
export function compareNotifications(
  a: PaymentDueNotification,
  b: PaymentDueNotification,
): number {
  const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  if (byKind !== 0) return byKind
  const byDays = a.daysUntilDue - b.daysUntilDue
  if (byDays !== 0) return byDays
  const byAmount = b.amount - a.amount
  if (byAmount !== 0) return byAmount
  return a.paymentDueId.localeCompare(b.paymentDueId)
}

/** Notifications that should light up the badge: money that is late or due. */
export function countUnreadNotifications(
  notifications: PaymentDueNotification[],
): number {
  return notifications.filter(
    ({ kind }) => kind === 'OVERDUE' || kind === 'DUE_TODAY',
  ).length
}

/**
 * Whether an obligation still matches the balances.
 *
 * Balances are computed from expenses, so an obligation created last week can
 * be invalidated by anyone adding or editing an expense. The amount is a
 * snapshot, and this is the check that keeps a stale snapshot from being
 * presented as current: the obligation is shown as outdated and can be
 * re-asked (a new row; the old one becomes `SUPERSEDED`).
 */
export function isPaymentDueStale(
  due: Pick<PaymentDueLike, 'fromParticipantId' | 'toParticipantId' | 'amount'>,
  suggestedReimbursements: Reimbursement[],
): boolean {
  return !suggestedReimbursements.some(
    ({ from, to, amount }) =>
      from === due.fromParticipantId &&
      to === due.toParticipantId &&
      Math.round(amount) === Math.round(due.amount),
  )
}

/**
 * Payload of the `Activity.data` column for the payment-due activity types.
 *
 * Activity records only have a single free-text column, and a settle-up has no
 * expense to point at, so the deadline travels as JSON. Parsing is defensive:
 * ordinary activities store a plain title there.
 */
export type PaymentDueActivityData = { dueDate?: string }

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parsePaymentDueActivityData(
  data: string | null | undefined,
): PaymentDueActivityData | null {
  if (!data?.startsWith('{')) return null
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { dueDate } = parsed as { dueDate?: unknown }
    return typeof dueDate === 'string' && DAY_KEY_PATTERN.test(dueDate)
      ? { dueDate }
      : {}
  } catch {
    return null
  }
}
