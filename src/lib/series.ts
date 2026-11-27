import {
  nextRecurringDate,
  RecurrenceRuleName,
  usesAnchorDay,
} from '@/lib/recurrence'
import { distributeAmount, distributeAmountByWeights } from '@/lib/shares'

/**
 * Recurring series and installment plans.
 *
 * A recurring expense is still materialized one occurrence at a time (see
 * `createRecurringExpenses`). A series adds what its occurrences share: when it
 * ends (on a date, or after a number of occurrences), and for a purchase paid
 * in installments, the total that is split across them. Everything here is
 * pure so the API, the expense form and the monthly report agree.
 */

/** Upper bound on the occurrences of a series: 30 years of monthly payments. */
export const MAX_SERIES_OCCURRENCES = 360

export type SeriesKindName = 'RECURRING' | 'INSTALLMENTS'
export type RecurrenceEndName = 'NEVER' | 'ON_DATE' | 'AFTER_OCCURRENCES'

export type SeriesBounds = {
  /** Last day an occurrence may fall on, inclusive. */
  endDate: Date | null
  /** Number of occurrences, the first one included. */
  occurrenceCount: number | null
}

export type SeriesAmounts = {
  occurrenceCount: number | null
  /** Purchase total split across the occurrences, in minor units. */
  totalAmount: number | null
  totalOriginalAmount: number | null
}

export type SeriesSettings = SeriesBounds &
  SeriesAmounts & {
    kind: SeriesKindName
  }

/** A date-only value (carried at UTC midnight) as `YYYY-MM-DD`. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** The `YYYY-MM` month a date-only value falls in. */
export function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

/**
 * Whether occurrence number `occurrenceNumber`, falling on `date`, is still
 * part of the series. An expense without a series, or an occurrence without a
 * number (a series created before occurrences were numbered), is never cut
 * off by a count.
 */
export function isWithinSeries(
  bounds: SeriesBounds | null | undefined,
  occurrenceNumber: number | null | undefined,
  date: Date,
): boolean {
  if (!bounds) return true
  if (
    bounds.occurrenceCount != null &&
    occurrenceNumber != null &&
    occurrenceNumber > bounds.occurrenceCount
  )
    return false
  if (bounds.endDate != null && toDateKey(date) > toDateKey(bounds.endDate))
    return false
  return true
}

/**
 * The amount of installment `occurrenceNumber` (1-based) when `total` is paid
 * in `count` installments. The installments add up to `total` exactly; the
 * leftover minor units go to the first ones, as card issuers usually do
 * (R$ 100,00 in 3x is 33,34 + 33,33 + 33,33).
 */
export function getInstallmentAmount(
  total: number,
  count: number,
  occurrenceNumber: number,
): number {
  if (count < 1 || occurrenceNumber < 1 || occurrenceNumber > count) return 0
  return distributeAmount(total, count)[occurrenceNumber - 1]
}

/** All the installment amounts of a purchase total, in order. */
export function getInstallmentAmounts(total: number, count: number): number[] {
  if (count < 1) return []
  return distributeAmount(total, count)
}

type PaidForShare = { participantId: string; shares: number }

/**
 * Shares split by amount have to add up to the expense amount. When an
 * occurrence gets an amount of its own (an installment), its shares are the
 * ones of the expense it is copied from, rescaled to that amount.
 */
export function rescaleAmountShares<T extends PaidForShare>(
  paidFor: T[],
  amount: number,
): T[] {
  const sorted = [...paidFor].sort((a, b) =>
    a.participantId < b.participantId ? -1 : 1,
  )
  const weights = sorted.map(({ shares }) => Math.abs(shares))
  if (weights.every((weight) => weight === 0)) return paidFor
  const amounts = distributeAmountByWeights(amount, weights)
  const byParticipant = new Map(
    sorted.map(({ participantId }, index) => [participantId, amounts[index]]),
  )
  return paidFor.map((row) => ({
    ...row,
    shares: byParticipant.get(row.participantId) ?? row.shares,
  }))
}

export type OccurrenceSource<T extends PaidForShare = PaidForShare> = {
  amount: number
  originalAmount: number | null
  splitMode: string
  paidFor: T[]
}

/**
 * The amounts of occurrence `occurrenceNumber` of a series. An occurrence
 * repeats the one it is created from, except in an installment plan entered
 * as a purchase total, where each installment has its own share of the total.
 */
export function getOccurrenceValues<T extends PaidForShare>(
  source: OccurrenceSource<T>,
  series: SeriesAmounts | null | undefined,
  occurrenceNumber: number | null | undefined,
): { amount: number; originalAmount: number | null; paidFor: T[] } {
  const count = series?.occurrenceCount
  if (
    !series ||
    series.totalAmount == null ||
    count == null ||
    occurrenceNumber == null ||
    occurrenceNumber < 1 ||
    occurrenceNumber > count
  ) {
    return {
      amount: source.amount,
      originalAmount: source.originalAmount,
      paidFor: source.paidFor,
    }
  }

  const amount = getInstallmentAmount(
    series.totalAmount,
    count,
    occurrenceNumber,
  )
  const originalAmount =
    series.totalOriginalAmount != null
      ? getInstallmentAmount(
          series.totalOriginalAmount,
          count,
          occurrenceNumber,
        )
      : source.originalAmount
  const paidFor =
    source.splitMode === 'BY_AMOUNT'
      ? rescaleAmountShares(source.paidFor, amount)
      : source.paidFor
  return { amount, originalAmount, paidFor }
}

export type ProjectedOccurrence = {
  occurrenceNumber: number | null
  date: Date
}

/**
 * The occurrences a series will still create, from the next one on, up to
 * `until` (inclusive) or the end of the series, at most `limit` of them.
 */
export function projectOccurrences({
  rule,
  nextDate,
  anchorDay,
  nextOccurrenceNumber,
  bounds,
  until,
  limit = MAX_SERIES_OCCURRENCES,
}: {
  rule: RecurrenceRuleName
  nextDate: Date
  anchorDay: number | null
  nextOccurrenceNumber: number | null
  bounds: SeriesBounds | null | undefined
  until: Date
  limit?: number
}): ProjectedOccurrence[] {
  if (rule === 'NONE') return []
  const occurrences: ProjectedOccurrence[] = []
  let date = nextDate
  let occurrenceNumber = nextOccurrenceNumber
  const untilKey = toDateKey(until)
  while (
    occurrences.length < limit &&
    toDateKey(date) <= untilKey &&
    isWithinSeries(bounds, occurrenceNumber, date)
  ) {
    occurrences.push({ occurrenceNumber, date })
    date = nextRecurringDate(rule, date, anchorDay)
    if (occurrenceNumber != null) occurrenceNumber += 1
  }
  return occurrences
}

/**
 * The dates of a series starting on `start`: every occurrence up to its end,
 * or the first `limit` ones when it does not end (or ends too far away).
 */
export function getSeriesDates(
  rule: RecurrenceRuleName,
  start: Date,
  bounds: SeriesBounds | null,
  limit = MAX_SERIES_OCCURRENCES,
): Date[] {
  if (rule === 'NONE') return [start]
  const anchorDay = usesAnchorDay(rule) ? start.getUTCDate() : null
  const dates: Date[] = []
  let date = start
  let occurrenceNumber = 1
  while (
    dates.length < limit &&
    isWithinSeries(bounds, occurrenceNumber, date)
  ) {
    dates.push(date)
    date = nextRecurringDate(rule, date, anchorDay)
    occurrenceNumber += 1
  }
  return dates
}

export type SeriesFormValues = {
  recurrenceRule: RecurrenceRuleName
  seriesKind: SeriesKindName
  recurrenceEnd: RecurrenceEndName
  recurrenceEndDate?: Date | null
  recurrenceOccurrences?: number | null
  installmentAmountIsTotal: boolean
  /** In minor units. */
  amount: number
  originalAmount?: number | null
}

/**
 * What a series created from the expense form looks like, or null when the
 * expense does not repeat. Installments are a fixed number of occurrences;
 * entered as a purchase total, that total is split across them.
 */
export function getSeriesSettings(
  values: SeriesFormValues,
): SeriesSettings | null {
  if (values.recurrenceRule === 'NONE') return null

  if (values.seriesKind === 'INSTALLMENTS') {
    const count = values.recurrenceOccurrences ?? null
    const isTotal = values.installmentAmountIsTotal && count != null
    return {
      kind: 'INSTALLMENTS',
      endDate: null,
      occurrenceCount: count,
      totalAmount: isTotal ? values.amount : null,
      totalOriginalAmount:
        isTotal && values.originalAmount != null ? values.originalAmount : null,
    }
  }

  return {
    kind: 'RECURRING',
    endDate:
      values.recurrenceEnd === 'ON_DATE'
        ? (values.recurrenceEndDate ?? null)
        : null,
    occurrenceCount:
      values.recurrenceEnd === 'AFTER_OCCURRENCES'
        ? (values.recurrenceOccurrences ?? null)
        : null,
    totalAmount: null,
    totalOriginalAmount: null,
  }
}

/**
 * What is left to pay of an installment plan after occurrence
 * `occurrenceNumber`: how many installments, and how much.
 */
export function getRemainingInstallments(
  series: SeriesAmounts,
  occurrenceNumber: number,
  occurrenceAmount: number,
): { count: number; amount: number } | null {
  const count = series.occurrenceCount
  if (count == null) return null
  const remaining = Math.max(count - occurrenceNumber, 0)
  if (series.totalAmount == null)
    return { count: remaining, amount: remaining * occurrenceAmount }
  const amounts = getInstallmentAmounts(series.totalAmount, count)
  return {
    count: remaining,
    amount: amounts
      .slice(occurrenceNumber)
      .reduce((sum, amount) => sum + amount, 0),
  }
}
