import { getCurrency } from '@/lib/currency'
import { importFormats, type ImportFormat } from '@/lib/imports/types'
import { expenseFormSchema, ExpenseFormValues } from '@/lib/schemas'
import { amountAsMinorUnits } from '@/lib/utils'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import Papa from 'papaparse'
import { mapSplitwiseCategoryLabel } from './category-mapping'
import { parseSplitwiseExportCsv } from './csv-parser'
import { detectSplitwiseHeaders } from './header-detection'
import {
  Deltas,
  formatReimbursementTitle,
  ParsedRowModel,
  parseExportRow,
} from './reconstruction'

dayjs.extend(customParseFormat)

const normalizeName = (value: string, fallback: string) => {
  const trimmed = value.trim()
  return trimmed || fallback
}

const detectLanguageScore = (language: string, recognizedFields: number) => {
  if (language === 'unknown' || recognizedFields < 3) return 0
  // Reward more recognized headers slightly to beat generic CSVs.
  return Math.min(0.95, 0.7 + recognizedFields * 0.05)
}

class SplitwiseCsvFormat implements ImportFormat {
  id = 'splitwise-csv'
  label = 'Splitwise CSV'
  priority = 90

  async detect(content: string): Promise<number> {
    const parsed = Papa.parse<string[]>(content, {
      preview: 1,
      skipEmptyLines: 'greedy',
    })
    if (parsed.data.length === 0) return 0
    const headerCells = parsed.data[0].map((c) => c.trim())
    const detection = detectSplitwiseHeaders(headerCells)
    const recognizedFields = Object.keys(detection.fieldIndices).length
    return detectLanguageScore(detection.language, recognizedFields)
  }

  async parseToInternal(content: string): Promise<{
    expenses: ExpenseFormValues[]
    group?: import('@/lib/imports/types').ImportParsedGroupInfo
    errors?: { row: number; message: string }[]
  }> {
    const parsed = parseSplitwiseExportCsv(content)

    // Use index-based IDs to handle duplicate names correctly
    const participants = parsed.participantNames.map((name, index) => {
      const fallback = `Participant ${index + 1}`
      const normalized = normalizeName(name, fallback)
      return { id: `p${index}`, name: normalized }
    })

    // Create lookups
    const participantIds = participants.map((p) => p.id)
    const participantNameById: Record<string, string> = {}
    for (const p of participants) {
      participantNameById[p.id] = p.name
    }

    const errors: { row: number; message: string }[] = [
      ...parsed.errors,
      ...parsed.headerErrors.map((message) => ({ row: 1, message })),
    ]
    const expenses: ExpenseFormValues[] = []
    let groupCurrency = ''
    const names = participants.map((p) => p.name)
    if (
      names.length === 0 ||
      parsed.participantNames.some((name) => !name.trim()) ||
      new Set(names).size !== names.length
    ) {
      errors.push({
        row: 1,
        message: 'Participant names must be present and unique',
      })
    }

    for (const row of parsed.rows) {
      const code = row.currency.toUpperCase()
      const currency = getCurrency(code)
      if (!code || !currency.code) {
        errors.push({
          row: row.rowNumber,
          message: `Unsupported currency: ${row.currency}`,
        })
        continue
      }
      if (!groupCurrency) groupCurrency = code
      if (groupCurrency !== code) {
        errors.push({
          row: row.rowNumber,
          message: 'Multiple currencies cannot be imported into one group',
        })
        continue
      }
      const factor = 10 ** currency.decimal_digits
      if (
        [row.amount, ...row.balances].some(
          (value) =>
            Math.abs(value * factor - Math.round(value * factor)) > 1e-7,
        )
      ) {
        errors.push({
          row: row.rowNumber,
          message: `Amount has too many decimal places for ${code}`,
        })
        continue
      }

      // Splitwise exports calendar dates in ISO format; reject invalid dates
      // instead of allowing the parser to roll them into a different month.
      const expenseDate = dayjs(row.date, 'YYYY-MM-DD', true)
      if (!expenseDate.isValid()) {
        errors.push({
          row: row.rowNumber,
          message: `Invalid expense date: ${row.date}`,
        })
        continue
      }

      const totalC = amountAsMinorUnits(row.amount, currency)

      // Build deltas in cents using canonical participant ids (by index).
      const deltasC: Deltas = {}
      for (let i = 0; i < participantIds.length; i++) {
        const id = participantIds[i]
        const balance = row.balances[i] ?? 0
        deltasC[id] = amountAsMinorUnits(balance, currency)
      }

      const mappedCategory = mapSplitwiseCategoryLabel(
        row.category,
        parsed.language,
      )
      const isPaymentCategory =
        mappedCategory?.grouping === 'Uncategorized' &&
        mappedCategory?.name === 'Payment'

      let parsedRow: ParsedRowModel
      try {
        parsedRow = parseExportRow(
          row.description || 'Imported expense',
          isPaymentCategory,
          totalC,
          participantIds,
          deltasC,
        )
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Failed to interpret Splitwise row'
        errors.push({ row: row.rowNumber, message })
        continue
      }

      const firstExpense = expenses.length

      // Group expenses -> normal expenses with BY_AMOUNT split.
      for (const ge of parsedRow.groupExpenses) {
        expenses.push({
          expenseDate: expenseDate.toDate(),
          title: ge.description,
          category: mappedCategory?.id ?? 0,
          amount: ge.totalC,
          originalAmount: undefined,
          originalCurrency: undefined,
          conversionRate: undefined,
          paidBy: ge.payer,
          paidFor: Object.entries(ge.sharesC).map(([participant, share]) => ({
            participant,
            shares: share,
            originalAmount: undefined,
          })),
          splitMode: 'BY_AMOUNT',
          saveDefaultSplittingOptions: false,
          isReimbursement: false,
          documents: [],
          notes: undefined,
          recurrenceRule: 'NONE',
        })
      }

      // Reimbursements -> isReimbursement:true with BY_AMOUNT split.
      for (const r of parsedRow.reimbursements) {
        const payerName = participantNameById[r.payer] ?? r.payer
        const receiverName = participantNameById[r.receiver] ?? r.receiver
        const reimbursementTitle = formatReimbursementTitle(
          payerName,
          receiverName,
          parsed.language,
        )
        expenses.push({
          expenseDate: expenseDate.toDate(),
          title: reimbursementTitle,
          category: mappedCategory?.id ?? 0,
          amount: r.amountC,
          originalAmount: undefined,
          originalCurrency: undefined,
          conversionRate: undefined,
          paidBy: r.payer,
          paidFor: [
            {
              participant: r.receiver,
              shares: r.amountC,
              originalAmount: undefined,
            },
          ],
          splitMode: 'BY_AMOUNT',
          saveDefaultSplittingOptions: false,
          isReimbursement: true,
          documents: [],
          notes: undefined,
          recurrenceRule: 'NONE',
        })
      }

      for (const expense of expenses.slice(firstExpense)) {
        const validation = expenseFormSchema.safeParse(expense)
        if (!validation.success) {
          errors.push({
            row: row.rowNumber,
            message: 'Reconstructed expense is invalid',
          })
          break
        }
      }
    }

    return {
      expenses,
      group: {
        currency: groupCurrency ? getCurrency(groupCurrency).symbol : undefined,
        currencyCode: groupCurrency || undefined,
        participants,
      },
      errors,
    }
  }
}

export const splitwiseCsvFormat = new SplitwiseCsvFormat()
importFormats.register(splitwiseCsvFormat)
