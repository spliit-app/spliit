import type { ExpenseFormValues } from '@/lib/schemas'
import { distributeAmount } from '@/lib/shares'
import type { ExpensesCreateInput, ExpensesUpdateInput } from '@/mcp/schemas'

type Participant = { id: string; name: string }

type PaidForInput = NonNullable<ExpensesCreateInput['paidFor']>

type ExistingPaidFor = { participantId: string; shares: number }

export type ExistingExpenseForForm = {
  expenseDate: Date
  title: string
  amount: number
  originalAmount: number | null
  originalCurrency: string | null
  conversionRate: { toNumber(): number } | null
  categoryId: number
  paidById: string
  paidFor: ExistingPaidFor[]
  splitMode: ExpenseFormValues['splitMode']
  isReimbursement: boolean
  documents: ExpenseFormValues['documents']
  notes: string | null
  recurrenceRule: ExpenseFormValues['recurrenceRule'] | null
}

function utcDate(date: string | undefined): Date {
  return new Date(
    `${date ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
  )
}

function assertKnownParticipants(
  entries: { participantId: string }[],
  participants: Participant[],
) {
  for (const { participantId } of entries) {
    if (!participants.some((participant) => participant.id === participantId))
      throw new Error(`Invalid participant ID: ${participantId}`)
  }
}

function defaultShares(
  mode: ExpenseFormValues['splitMode'],
  amount: number,
  count: number,
): number[] {
  switch (mode) {
    case 'EVENLY':
    case 'BY_SHARES':
      return Array.from({ length: count }, () => 100)
    case 'BY_PERCENTAGE':
      return distributeAmount(100, count).map((shares) => shares * 100)
    case 'BY_AMOUNT':
      return distributeAmount(amount, count)
  }
}

function storedShares(
  shares: number,
  mode: ExpenseFormValues['splitMode'],
): number {
  if (shares <= 0) throw new Error('Shares must be positive')
  switch (mode) {
    case 'EVENLY':
    case 'BY_SHARES':
    case 'BY_PERCENTAGE':
      return Math.round(shares * 100)
    case 'BY_AMOUNT':
      if (!Number.isInteger(shares))
        throw new Error('BY_AMOUNT shares must be whole minor units')
      return shares
  }
}

function buildPaidFor(
  input: PaidForInput | undefined,
  mode: ExpenseFormValues['splitMode'],
  amount: number,
  participants: Participant[],
): ExpenseFormValues['paidFor'] {
  const entries =
    input ??
    participants.map((participant) => ({
      participantId: participant.id,
      shares: undefined,
    }))
  if (entries.length === 0)
    throw new Error('At least one participant is required')
  assertKnownParticipants(entries, participants)

  const defaults = defaultShares(mode, amount, entries.length)
  const paidFor = entries.map(({ participantId, shares }, index) => ({
    participant: participantId,
    shares: shares === undefined ? defaults[index] : storedShares(shares, mode),
  }))

  if (mode === 'BY_PERCENTAGE') {
    const sum = paidFor.reduce((total, { shares }) => total + shares, 0)
    if (sum !== 10_000) throw new Error('BY_PERCENTAGE shares must sum to 100')
  }
  if (mode === 'BY_AMOUNT') {
    const sum = paidFor.reduce((total, { shares }) => total + shares, 0)
    if (sum !== amount) throw new Error('BY_AMOUNT shares must sum to amount')
  }

  return paidFor
}

export function buildCreateExpenseForm(
  input: ExpensesCreateInput,
  participants: Participant[],
): ExpenseFormValues {
  const splitMode = input.splitMode ?? 'EVENLY'
  return {
    expenseDate: utcDate(input.expenseDate),
    title: input.title,
    category: input.categoryId ?? 0,
    amount: input.amount,
    originalAmount: input.originalAmount,
    originalCurrency: input.originalCurrency ?? null,
    conversionRate: input.conversionRate,
    paidBy: input.paidBy,
    paidFor: buildPaidFor(input.paidFor, splitMode, input.amount, participants),
    splitMode,
    saveDefaultSplittingOptions: false,
    isReimbursement: input.isReimbursement ?? false,
    documents: input.documents ?? [],
    notes: input.notes,
    recurrenceRule: input.recurrenceRule ?? 'NONE',
  }
}

export function buildUpdateExpenseForm(
  existing: ExistingExpenseForForm,
  input: ExpensesUpdateInput,
  participants: Participant[],
): ExpenseFormValues {
  const splitMode = input.splitMode ?? existing.splitMode
  const amount = input.amount ?? existing.amount
  const paidFor =
    input.paidFor !== undefined
      ? buildPaidFor(input.paidFor, splitMode, amount, participants)
      : input.splitMode !== undefined && input.splitMode !== existing.splitMode
        ? buildPaidFor(undefined, splitMode, amount, participants)
        : existing.paidFor.map(({ participantId, shares }) => ({
            participant: participantId,
            shares,
          }))

  return {
    expenseDate:
      input.expenseDate === undefined
        ? existing.expenseDate
        : utcDate(input.expenseDate),
    title: input.title ?? existing.title,
    category: input.categoryId ?? existing.categoryId,
    amount,
    originalAmount:
      input.originalAmount ?? existing.originalAmount ?? undefined,
    originalCurrency:
      input.originalCurrency ?? existing.originalCurrency ?? undefined,
    conversionRate:
      input.conversionRate ??
      (existing.conversionRate === null
        ? undefined
        : existing.conversionRate.toNumber()),
    paidBy: input.paidBy ?? existing.paidById,
    paidFor,
    splitMode,
    saveDefaultSplittingOptions: false,
    isReimbursement: input.isReimbursement ?? existing.isReimbursement,
    documents: input.documents ?? existing.documents,
    notes: input.notes ?? existing.notes ?? undefined,
    recurrenceRule: input.recurrenceRule ?? existing.recurrenceRule ?? 'NONE',
  }
}
