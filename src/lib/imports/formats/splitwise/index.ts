import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import Papa from 'papaparse'

import { importFormats, type ImportFormat } from '@/lib/imports/types'
import { ExpenseFormValues } from '@/lib/schemas'
import { mapSplitwiseCategoryLabel } from './category-mapping'
import { parseSplitwiseExportCsv } from './csv-parser'
import { detectSplitwiseHeaders } from './header-detection'
import {
  Deltas,
  ParsedRowModel,
  formatReimbursementTitle,
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

    for (const row of parsed.rows) {
      if (!groupCurrency && row.currency) {
        groupCurrency = row.currency
      }

      // Robust date parsing using dayjs. Splitwise usually uses YYYY-MM-DD (ISO) in exports.
      // We accept a few common variants just in case, but rely on ISO primarily.
      const expenseDate = dayjs(row.date)
      if (!expenseDate.isValid()) {
        errors.push({
          row: row.rowNumber,
          message: `Invalid expense date: ${row.date}`,
        })
        continue
      }

      const totalC = Math.round(row.amount * 100)

      // Build deltas in cents using canonical participant ids (by index).
      const deltasC: Deltas = {}
      for (let i = 0; i < participantIds.length; i++) {
        const id = participantIds[i]
        const balance = row.balances[i] ?? 0
        deltasC[id] = Math.round(balance * 100)
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

      // Group expenses -> normal expenses with BY_AMOUNT split.
      for (const ge of parsedRow.groupExpenses) {
        expenses.push({
          expenseDate: expenseDate.toDate(),
          title: ge.description,
          category: mappedCategory?.id ?? 0,
          amount: ge.totalC,
          originalAmount: undefined,
          originalCurrency: row.currency || undefined,
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
          originalCurrency: row.currency || undefined,
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
    }

    return {
      expenses,
      group: {
        currency: groupCurrency || undefined,
        currencyCode: groupCurrency || undefined,
        participants,
      },
      errors,
    }
  }
}

export const splitwiseCsvFormat = new SplitwiseCsvFormat()
importFormats.register(splitwiseCsvFormat)
