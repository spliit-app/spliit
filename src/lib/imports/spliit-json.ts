import { importFormats, type ImportFormat } from '@/lib/imports/types'
import { expenseFormSchema, type ExpenseFormValues } from '@/lib/schemas'

// Detection on full content: parse JSON and validate minimal structure.
// Requirements:
// - top-level object with arrays: participants[], expenses[] (arrays can be empty)
// - participant objects should have at least one of: name or id (string)
// - expense objects should include: paidById (string), paidFor (array), amount, expenseDate, title
export const looksLikeSpliitJson = (content: string) => {
  try {
    const root = JSON.parse(content)
    if (!root || typeof root !== 'object') return false
    const participants = (root as any).participants
    const expenses = (root as any).expenses
    if (!Array.isArray(participants) || !Array.isArray(expenses)) return false

    // Check a few participant entries (or pass if empty)
    if (participants.length > 0) {
      const p: any = participants[0]
      const hasName = typeof p?.name === 'string'
      const hasId = typeof p?.id === 'string'
      if (!(hasName || hasId)) return false
    }

    // Check a few expense entries (or pass if empty)
    if (expenses.length > 0) {
      const e: any = expenses[0]
      const ok =
        typeof e?.paidById === 'string' &&
        Array.isArray(e?.paidFor) &&
        (typeof e?.amount === 'number' || typeof e?.amount === 'string') &&
        (typeof e?.expenseDate === 'string' ||
          typeof e?.expenseDate === 'number') &&
        typeof e?.title === 'string'
      if (!ok) return false
    }
    return true
  } catch {
    return false
  }
}

// Small helpers for coercion with clear error messages (used within parseToInternal)
const coerceNumber = (value: unknown, label: string): number => {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`Invalid ${label} value in export`)
  }
  return n
}
const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

// Seeded category ids (see prisma/migrations/20240108194443_add_categories/migration.sql)
export const CATEGORY_LOOKUP: Record<string, number> = {
  'uncategorized|general': 0,
  'uncategorized|payment': 1,
  'entertainment|entertainment': 2,
  'entertainment|games': 3,
  'entertainment|movies': 4,
  'entertainment|music': 5,
  'entertainment|sports': 6,
  'food and drink|food and drink': 7,
  'food and drink|dining out': 8,
  'food and drink|groceries': 9,
  'food and drink|liquor': 10,
  'home|home': 11,
  'home|electronics': 12,
  'home|furniture': 13,
  'home|household supplies': 14,
  'home|maintenance': 15,
  'home|mortgage': 16,
  'home|pets': 17,
  'home|rent': 18,
  'home|services': 19,
  'life|childcare': 20,
  'life|clothing': 21,
  'life|education': 22,
  'life|gifts': 23,
  'life|insurance': 24,
  'life|medical expenses': 25,
  'life|taxes': 26,
  'transportation|transportation': 27,
  'transportation|bicycle': 28,
  'transportation|bus/train': 29,
  'transportation|car': 30,
  'transportation|gas/fuel': 31,
  'transportation|hotel': 32,
  'transportation|parking': 33,
  'transportation|plane': 34,
  'transportation|taxi': 35,
  'utilities|utilities': 36,
  'utilities|cleaning': 37,
  'utilities|electricity': 38,
  'utilities|heat/gas': 39,
  'utilities|trash': 40,
  'utilities|tv/phone/internet': 41,
  'utilities|water': 42,
  'life|donation': 43, // see follow-up migration 20250308000000_add_category_donation
}

export const resolveCategoryId = (value: unknown): number => {
  // Numeric ids pass through.
  if (typeof value === 'number' && Number.isFinite(value))
    return Math.max(0, Math.trunc(value))

  // Strings that are numeric -> numeric id.
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(0, Math.trunc(parsed))
  }

  // Object shape with grouping/name (as exported by Spliit).
  if (value && typeof value === 'object') {
    const grouping = normalize((value as any).grouping)
    const name = normalize((value as any).name)
    const key = `${grouping}|${name}`
    if (CATEGORY_LOOKUP[key] !== undefined) return CATEGORY_LOOKUP[key]
    // Fallback: try by name only
    const byName = Object.entries(CATEGORY_LOOKUP).find(
      ([k]) => k.split('|')[1] === name,
    )
    if (byName) return byName[1]
  }

  // Default: uncategorized
  return 0
}
const coerceDate = (value: unknown): Date => {
  if (value instanceof Date) return value
  const str = String(value ?? '').trim()
  if (!str) throw new Error('Missing expense date in export')
  const date = new Date(str)
  if (Number.isNaN(date.getTime()))
    throw new Error('Invalid expense date in export')
  return date
}

export class SpliitJsonFormat implements ImportFormat {
  id = 'spliit-json'
  label = 'Spliit JSON'
  priority = 100

  async detect(content: string): Promise<number> {
    return looksLikeSpliitJson(content) ? 0.95 : 0
  }

  async parseToInternal(content: string): Promise<{
    expenses: ExpenseFormValues[]
    group?: import('@/lib/imports/types').ImportParsedGroupInfo
    errors?: { row: number; message: string }[]
  }> {
    let raw: any
    try {
      raw = JSON.parse(content)
    } catch {
      throw new Error('Invalid JSON: unable to parse file contents.')
    }

    const { externalIdToName, participantNames } = this.extractParticipants(
      raw?.participants,
    )
    const { expenses, errors } = this.extractExpenses(
      raw?.expenses,
      externalIdToName,
    )

    const group = {
      name: raw?.name ?? undefined,
      currency: raw?.currency ?? undefined,
      currencyCode: raw?.currencyCode ?? undefined,
      participants: participantNames.length
        ? participantNames.map((name) => ({ name }))
        : undefined,
    }

    return { expenses, group, errors }
  }

  private extractParticipants(rawParticipants: any[]) {
    const externalIdToName = new Map<string, string>()
    const participantNames: string[] = []

    if (Array.isArray(rawParticipants)) {
      rawParticipants.forEach((p: any, i: number) => {
        const id = typeof p?.id === 'string' ? p.id.trim() : ''
        const nameRaw = typeof p?.name === 'string' ? p.name.trim() : ''
        const name = nameRaw || id || `Participant ${i + 1}`
        participantNames.push(name)
        if (id) externalIdToName.set(id, name)
      })
    }
    return { externalIdToName, participantNames }
  }

  private extractExpenses(
    rawExpenses: any[],
    externalIdToName: Map<string, string>,
  ) {
    const expenses: ExpenseFormValues[] = []
    const errors: { row: number; message: string }[] = []

    const list = Array.isArray(rawExpenses) ? rawExpenses : []

    list.forEach((e: any, index: number) => {
      try {
        const paidByRaw = String(e?.paidById ?? '').trim()
        if (!paidByRaw) throw new Error('Missing paidById')
        const paidBy = externalIdToName.get(paidByRaw) ?? paidByRaw

        const paidFor = this.extractPaidFor(
          Array.isArray(e?.paidFor) ? e.paidFor : [],
          externalIdToName,
        )

        const base = this.mapToFormBase(e, index, paidBy, paidFor)
        const result = expenseFormSchema.safeParse(base)
        if (result.success) {
          expenses.push(result.data)
        } else {
          const message =
            result.error.issues.map((i) => i.message).join(', ') ||
            'Invalid expense'
          errors.push({ row: index + 1, message })
        }
      } catch (err: any) {
        errors.push({
          row: index + 1,
          message: String(err?.message ?? 'Invalid expense'),
        })
      }
    })

    return { expenses, errors }
  }

  private extractPaidFor(
    entries: any[],
    externalIdToName: Map<string, string>,
  ): ExpenseFormValues['paidFor'] {
    const seen = new Set<string>()
    const paidFor: ExpenseFormValues['paidFor'] = []
    entries.forEach((pf: any) => {
      const rawId = String(pf?.participantId ?? '').trim()
      if (!rawId) throw new Error('paidFor without participantId')
      if (seen.has(rawId)) return
      seen.add(rawId)
      const shares = Math.max(
        1,
        Math.trunc(coerceNumber(pf?.shares ?? 1, 'shares')),
      )
      const name = externalIdToName.get(rawId) ?? rawId
      paidFor.push({ participant: name, shares, originalAmount: undefined })
    })
    return paidFor
  }

  private mapToFormBase(
    e: any,
    index: number,
    paidBy: string,
    paidFor: ExpenseFormValues['paidFor'],
  ) {
    return {
      expenseDate: coerceDate(e?.expenseDate),
      title: String(e?.title ?? '').trim() || `Expense ${index + 1}`,
      category: resolveCategoryId(e?.categoryId ?? e?.category),
      amount: Math.round(coerceNumber(e?.amount, 'amount')),
      originalAmount:
        e?.originalAmount != null
          ? coerceNumber(e.originalAmount, 'originalAmount')
          : undefined,
      originalCurrency: e?.originalCurrency ?? undefined,
      conversionRate:
        e?.conversionRate != null
          ? coerceNumber(e.conversionRate, 'conversionRate')
          : undefined,
      paidBy,
      paidFor,
      splitMode: (e?.splitMode as ExpenseFormValues['splitMode']) ?? 'EVENLY',
      saveDefaultSplittingOptions: false,
      isReimbursement: e?.isReimbursement ?? false,
      documents: [],
      notes: e?.notes ?? undefined,
      recurrenceRule:
        (e?.recurrenceRule as ExpenseFormValues['recurrenceRule']) ?? 'NONE',
    }
  }
}

// Self-register the format with the global registry.
importFormats.register(new SpliitJsonFormat())
