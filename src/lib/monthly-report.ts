import { getSuggestedReimbursements, Reimbursement } from '@/lib/balances'
import { getRemainingInstallments, toMonthKey } from '@/lib/series'
import { getExpenseShares } from '@/lib/shares'

/**
 * The monthly report: what falls in a given month. An installment purchase
 * only weighs on the month of each installment, so the report can tell what
 * the month costs, who owes whom for it, and what is already committed for the
 * months to come.
 *
 * It works on two kinds of entries: expenses already recorded, and the
 * occurrences recurring expenses and installment plans will create later
 * ("expected"), as listed by `getProjectedExpenses`.
 */

export type MonthlyReportEntryType =
  'installment' | 'recurring' | 'oneOff' | 'reimbursement'

export const MONTHLY_REPORT_ENTRY_TYPES: MonthlyReportEntryType[] = [
  'installment',
  'recurring',
  'oneOff',
  'reimbursement',
]

/** What the report needs of an expense, recorded or expected. */
export type MonthlyReportSource = {
  id: string
  title: string
  category: { id: number; grouping: string; name: string } | null
  expenseDate: Date
  amount: number
  isReimbursement: boolean
  splitMode: 'EVENLY' | 'BY_SHARES' | 'BY_PERCENTAGE' | 'BY_AMOUNT'
  recurrenceRule: string | null
  occurrenceNumber: number | null
  series: {
    id: string
    kind: 'RECURRING' | 'INSTALLMENTS'
    occurrenceCount: number | null
    totalAmount: number | null
  } | null
  paidBy: { id: string; name: string }
  paidFor: { participant: { id: string; name: string }; shares: number }[]
  /** Set on an expected occurrence: the expense it will be copied from. */
  sourceExpenseId?: string
}

export type MonthlyReportEntry = {
  id: string
  /** The expense to open: itself, or for an expected one, its source. */
  expenseId: string
  expected: boolean
  type: MonthlyReportEntryType
  title: string
  category: MonthlyReportSource['category']
  date: Date
  amount: number
  paidBy: { id: string; name: string }
  occurrenceNumber: number | null
  occurrenceCount: number | null
  /** Installments: what is left to pay after this one. */
  remaining: { count: number; amount: number } | null
}

export type MonthlyReportParticipant = {
  id: string
  name: string
  /** What they paid for the group's spending this month. */
  paid: number
  /** Their part of the group's spending this month. */
  share: number
  /** Positive: the others owe them, for this month. Reimbursements count. */
  balance: number
}

export type MonthlyReportSettlement = {
  participants: MonthlyReportParticipant[]
  reimbursements: Reimbursement[]
}

export type MonthlyReport = {
  month: string
  entries: MonthlyReportEntry[]
  totals: {
    /** Spending of the month, reimbursements excluded. */
    total: number
    recorded: number
    expected: number
    byType: Record<MonthlyReportEntryType, { amount: number; count: number }>
  }
  /** Who owes whom for this month, from recorded expenses only… */
  settlement: MonthlyReportSettlement
  /** …and once the expected ones are counted as well. */
  settlementWithExpected: MonthlyReportSettlement
}

export function getEntryType(
  source: Pick<
    MonthlyReportSource,
    'isReimbursement' | 'series' | 'recurrenceRule'
  >,
): MonthlyReportEntryType {
  if (source.isReimbursement) return 'reimbursement'
  if (source.series?.kind === 'INSTALLMENTS') return 'installment'
  if (
    source.series ||
    (source.recurrenceRule !== null && source.recurrenceRule !== 'NONE')
  )
    return 'recurring'
  return 'oneOff'
}

type InstallmentsBySeries = Map<string, Map<number, number>>

/**
 * Every installment of each plan, recorded or expected, by plan and number:
 * what is left after one of them is then exact, even for a plan that was
 * stopped early or an installment whose amount was edited.
 */
function getInstallmentsBySeries(
  sources: MonthlyReportSource[],
): InstallmentsBySeries {
  const bySeries: InstallmentsBySeries = new Map()
  for (const source of sources) {
    if (source.series?.kind !== 'INSTALLMENTS') continue
    if (source.occurrenceNumber == null) continue
    if (!bySeries.has(source.series.id))
      bySeries.set(source.series.id, new Map())
    bySeries.get(source.series.id)!.set(source.occurrenceNumber, source.amount)
  }
  return bySeries
}

function getRemaining(
  source: MonthlyReportSource,
  installments?: InstallmentsBySeries,
) {
  if (!source.series || source.occurrenceNumber == null) return null
  const number = source.occurrenceNumber
  const occurrences = installments?.get(source.series.id)
  if (!occurrences)
    return getRemainingInstallments(
      { ...source.series, totalOriginalAmount: null },
      number,
      source.amount,
    )
  let count = 0
  let amount = 0
  occurrences.forEach((occurrenceAmount, occurrenceNumber) => {
    if (occurrenceNumber <= number) return
    count += 1
    amount += occurrenceAmount
  })
  return { count, amount }
}

function toEntry(
  source: MonthlyReportSource,
  expected: boolean,
  installments?: InstallmentsBySeries,
) {
  const type = getEntryType(source)
  const remaining =
    type === 'installment' ? getRemaining(source, installments) : null
  return {
    id: source.id,
    expenseId: source.sourceExpenseId ?? source.id,
    expected,
    type,
    title: source.title,
    category: source.category,
    date: source.expenseDate,
    amount: source.amount,
    paidBy: source.paidBy,
    occurrenceNumber: source.series ? source.occurrenceNumber : null,
    occurrenceCount: source.series?.occurrenceCount ?? null,
    remaining,
  } satisfies MonthlyReportEntry
}

function getSettlement(
  sources: MonthlyReportSource[],
  participants: { id: string; name: string }[],
): MonthlyReportSettlement {
  const rows = new Map<string, MonthlyReportParticipant>(
    participants.map(({ id, name }) => [
      id,
      { id, name, paid: 0, share: 0, balance: 0 },
    ]),
  )
  const row = (participant: { id: string; name: string }) => {
    if (!rows.has(participant.id))
      rows.set(participant.id, {
        ...participant,
        paid: 0,
        share: 0,
        balance: 0,
      })
    return rows.get(participant.id)!
  }

  for (const source of sources) {
    const payer = row(source.paidBy)
    payer.balance += source.amount
    if (!source.isReimbursement) payer.paid += source.amount

    const shares = getExpenseShares({
      id: source.sourceExpenseId ? null : source.id,
      amount: source.amount,
      splitMode: source.splitMode,
      paidFor: source.paidFor.map(({ participant, shares }) => ({
        participantId: participant.id,
        shares,
      })),
    })
    for (const { participant } of source.paidFor) {
      const share = shares.get(participant.id) ?? 0
      const target = row(participant)
      target.balance -= share
      if (!source.isReimbursement) target.share += share
    }
  }

  const result = Array.from(rows.values())
  return {
    participants: result,
    reimbursements: getSuggestedReimbursements(
      Object.fromEntries(
        result.map(({ id, paid, share, balance }) => [
          id,
          { paid, paidFor: share, total: balance },
        ]),
      ),
    ),
  }
}

/**
 * The report of `month` (`YYYY-MM`): the recorded expenses and the expected
 * occurrences dated in that month, the spending they add up to, and who owes
 * whom for it.
 */
export function getMonthlyReport({
  month,
  expenses,
  expected,
  participants,
  installments,
}: {
  month: string
  expenses: MonthlyReportSource[]
  expected: MonthlyReportSource[]
  participants: { id: string; name: string }[]
  /**
   * Every installment of the group's plans, recorded or expected until the
   * plan ends, to tell what is left after each one. Without it, that is
   * worked out from the number of installments of the plan.
   */
  installments?: MonthlyReportSource[]
}): MonthlyReport {
  const installmentsBySeries = installments
    ? getInstallmentsBySeries(installments)
    : undefined
  const recordedSources = expenses.filter(
    (expense) => toMonthKey(expense.expenseDate) === month,
  )
  const expectedSources = expected.filter(
    (expense) => toMonthKey(expense.expenseDate) === month,
  )

  const entries = [
    ...recordedSources.map((source) =>
      toEntry(source, false, installmentsBySeries),
    ),
    ...expectedSources.map((source) =>
      toEntry(source, true, installmentsBySeries),
    ),
  ].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      Number(a.expected) - Number(b.expected) ||
      a.title.localeCompare(b.title),
  )

  const byType = Object.fromEntries(
    MONTHLY_REPORT_ENTRY_TYPES.map((type) => [type, { amount: 0, count: 0 }]),
  ) as MonthlyReport['totals']['byType']
  let recorded = 0
  let expectedTotal = 0
  for (const entry of entries) {
    byType[entry.type].amount += entry.amount
    byType[entry.type].count += 1
    if (entry.type === 'reimbursement') continue
    if (entry.expected) expectedTotal += entry.amount
    else recorded += entry.amount
  }

  return {
    month,
    entries,
    totals: {
      total: recorded + expectedTotal,
      recorded,
      expected: expectedTotal,
      byType,
    },
    settlement: getSettlement(recordedSources, participants),
    settlementWithExpected: getSettlement(
      [...recordedSources, ...expectedSources],
      participants,
    ),
  }
}

/** `YYYY-MM` of the month `offset` months after `month`. */
export function addMonths(month: string, offset: number): string {
  const [year, monthIndex] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthIndex - 1 + offset, 1))
  return toMonthKey(date)
}

/** The last day of a `YYYY-MM` month, as a date-only value. */
export function getMonthEnd(month: string): Date {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthIndex, 0))
}

export type UpcomingMonth = {
  month: string
  installment: number
  recurring: number
  oneOff: number
  total: number
}

/**
 * What is already committed for the `count` months starting at `fromMonth`:
 * expected occurrences, and expenses already recorded with a date in those
 * months. Reimbursements are left out.
 */
export function getUpcomingMonths({
  fromMonth,
  count,
  expenses,
  expected,
}: {
  fromMonth: string
  count: number
  expenses: MonthlyReportSource[]
  expected: MonthlyReportSource[]
}): UpcomingMonth[] {
  const months = Array.from({ length: count }, (_, index) => ({
    month: addMonths(fromMonth, index),
    installment: 0,
    recurring: 0,
    oneOff: 0,
    total: 0,
  }))
  const byMonth = new Map(months.map((month) => [month.month, month]))

  for (const source of [...expenses, ...expected]) {
    const month = byMonth.get(toMonthKey(source.expenseDate))
    if (!month) continue
    const type = getEntryType(source)
    if (type === 'reimbursement') continue
    month[type] += source.amount
    month.total += source.amount
  }
  return months
}

export type OpenInstallmentPlan = {
  seriesId: string
  /** The latest recorded installment, to open the plan from. */
  expenseId: string
  title: string
  occurrenceCount: number | null
  /** Installments recorded so far (paid or due). */
  recordedCount: number
  remainingCount: number
  remainingAmount: number
  nextDate: Date
  lastDate: Date
}

/**
 * The installment plans that still have installments to come, with what is
 * left to pay on each, the ones ending first listed first.
 */
export function getOpenInstallmentPlans(
  expected: MonthlyReportSource[],
): OpenInstallmentPlan[] {
  const plans = new Map<string, OpenInstallmentPlan>()
  for (const source of expected) {
    if (source.series?.kind !== 'INSTALLMENTS') continue
    const plan = plans.get(source.series.id)
    if (!plan) {
      plans.set(source.series.id, {
        seriesId: source.series.id,
        expenseId: source.sourceExpenseId ?? source.id,
        title: source.title,
        occurrenceCount: source.series.occurrenceCount,
        recordedCount: (source.occurrenceNumber ?? 1) - 1,
        remainingCount: 1,
        remainingAmount: source.amount,
        nextDate: source.expenseDate,
        lastDate: source.expenseDate,
      })
      continue
    }
    plan.remainingCount += 1
    plan.remainingAmount += source.amount
    if (source.expenseDate < plan.nextDate) {
      plan.nextDate = source.expenseDate
      plan.recordedCount = (source.occurrenceNumber ?? 1) - 1
    }
    if (source.expenseDate > plan.lastDate) plan.lastDate = source.expenseDate
  }
  return Array.from(plans.values()).sort(
    (a, b) =>
      a.lastDate.getTime() - b.lastDate.getTime() ||
      a.title.localeCompare(b.title),
  )
}
