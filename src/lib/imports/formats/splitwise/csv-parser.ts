import Papa from 'papaparse'

import {
  SplitwiseColumn,
  SplitwiseExportLanguage,
  detectSplitwiseHeaders,
} from './header-detection'

export type SplitwiseExportRow = {
  date: string
  description: string
  category: string
  amount: number
  currency: string
  balances: number[]
  rowNumber: number
}

export type SplitwiseExportParseResult = {
  headers: string[]
  participantNames: string[]
  rows: SplitwiseExportRow[]
  language: SplitwiseExportLanguage
  fieldIndices: Record<SplitwiseColumn, number>
  headerErrors: string[]
  errors: { row: number; message: string }[]
}

function toNumber(value: string): number {
  if (typeof value !== 'string') return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  // Splitwise uses '.' as decimal separator.
  const n = Number(trimmed)
  return Number.isNaN(n) ? 0 : n
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const summaryIndicators = [
  'gesamtbilanz',
  'gesamtsaldo',
  'total balance',
  'balance summary',
  'totalbal',
  'balance net',
]

const isSummaryRow = (description: string) => {
  const normalized = normalizeText(description)
  return summaryIndicators.some((indicator) => normalized.includes(indicator))
}

const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 1024

const sanitize = (value: string) => value.replace(/[<>]/g, '')

export function parseSplitwiseExportCsv(
  csv: string,
): SplitwiseExportParseResult {
  const parseResult = Papa.parse<string[]>(csv, {
    skipEmptyLines: 'greedy',
  })

  const lines = parseResult.data

  if (lines.length === 0) {
    return {
      headers: [],
      participantNames: [],
      rows: [],
      language: 'unknown',
      fieldIndices: {
        date: 0,
        description: 1,
        category: 2,
        cost: 3,
        currency: 4,
      },
      headerErrors: [],
      errors: [],
    }
  }

  const headerCells = lines[0].map((cell) => cell.trim())
  const headers = headerCells

  const detectionResult = detectSplitwiseHeaders(headerCells)
  const headerErrors: string[] = []

  const defaultFieldIndices: Record<SplitwiseColumn, number> = {
    date: 0,
    description: 1,
    category: 2,
    cost: 3,
    currency: 4,
  }

  const fieldIndices: Record<SplitwiseColumn, number> = {
    date: -1,
    description: -1,
    category: -1,
    cost: -1,
    currency: -1,
  }

  for (const field of Object.keys(fieldIndices) as SplitwiseColumn[]) {
    const detectedIndex = detectionResult.fieldIndices[field]
    if (
      detectedIndex !== undefined &&
      detectedIndex >= 0 &&
      detectedIndex < headerCells.length
    ) {
      fieldIndices[field] = detectedIndex
    } else if (detectionResult.missingFields.includes(field)) {
      headerErrors.push(`Missing header for ${field}`)
    }
  }

  // Participants start after all recognized standard fields.
  const detectedIndices = Object.values(fieldIndices).filter((i) => i >= 0)
  const participantStartIndex =
    detectedIndices.length > 0 ? Math.max(...detectedIndices) + 1 : 0

  const participantNames = headerCells
    .slice(participantStartIndex)
    .map((name) => sanitize(name).substring(0, MAX_NAME_LENGTH))

  const rows: SplitwiseExportRow[] = []
  const errors: { row: number; message: string }[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]
    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue

    const date = (cells[fieldIndices.date] ?? '').trim()
    const description = sanitize(
      (cells[fieldIndices.description] ?? '').trim(),
    ).substring(0, MAX_DESCRIPTION_LENGTH)
    const category = (cells[fieldIndices.category] ?? '').trim()
    const amount = toNumber(cells[fieldIndices.cost] ?? '')
    const currency = (cells[fieldIndices.currency] ?? '').trim()

    const balances: number[] = []

    for (let j = 0; j < participantNames.length; j++) {
      const cellIndex = participantStartIndex + j
      const raw = cells[cellIndex] ?? ''
      balances.push(toNumber(raw))
    }

    if (!date || amount === 0 || !description) {
      if (amount === 0 && description && isSummaryRow(description)) {
        continue
      }
      let message = 'Missing or invalid date, amount or description'
      if (description) {
        message += ` for "${description}"`
      }
      errors.push({
        row: i + 1,
        message,
      })
      continue
    }

    rows.push({
      date,
      description,
      category,
      amount,
      currency,
      balances,
      rowNumber: i + 1,
    })
  }

  return {
    headers,
    participantNames,
    rows,
    language: detectionResult.language,
    fieldIndices,
    headerErrors,
    errors,
  }
}
