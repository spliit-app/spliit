import { headerAliasesByLanguage } from './mapping-data'
import { SplitwiseColumn, SplitwiseExportLanguage } from './types'

export type { SplitwiseColumn, SplitwiseExportLanguage } from './types'

export type HeaderDetectionResult = {
  language: SplitwiseExportLanguage
  fieldIndices: Partial<Record<SplitwiseColumn, number>>
  missingFields: SplitwiseColumn[]
}

const normalizeHeader = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const headerFields: SplitwiseColumn[] = [
  'date',
  'description',
  'category',
  'cost',
  'currency',
]

const findHeaderIndex = (
  normalizedCells: string[],
  aliasList: string[],
): number | undefined => {
  for (const alias of aliasList) {
    const normalizedAlias = normalizeHeader(alias)
    const index = normalizedCells.findIndex((cell) => cell === normalizedAlias)
    if (index !== -1) {
      return index
    }
  }
  return undefined
}

export function detectSplitwiseHeaders(
  headerCells: string[],
): HeaderDetectionResult {
  if (headerCells.length === 0) {
    return {
      language: 'unknown',
      fieldIndices: {},
      missingFields: headerFields,
    }
  }

  const normalizedCells = headerCells.map((cell) => normalizeHeader(cell))

  let bestMatch: {
    language: SplitwiseExportLanguage
    matches: Partial<Record<SplitwiseColumn, number>>
    missing: SplitwiseColumn[]
    score: number
  } = {
    language: 'unknown',
    matches: {},
    missing: headerFields,
    score: -1,
  }

  const detectionLanguages = (
    Object.keys(headerAliasesByLanguage) as SplitwiseExportLanguage[]
  ).filter((language) => language !== 'unknown')

  for (const language of detectionLanguages) {
    const matches: Partial<Record<SplitwiseColumn, number>> = {}
    const aliasMap = headerAliasesByLanguage[language] ?? {}
    for (const field of headerFields) {
      const aliasList = aliasMap[field] ?? []
      const index = findHeaderIndex(normalizedCells, aliasList)
      if (index !== undefined) {
        matches[field] = index
      }
    }

    const missing = headerFields.filter((field) => matches[field] === undefined)
    const score = headerFields.length - missing.length

    if (score > bestMatch.score) {
      bestMatch = {
        language,
        matches,
        missing,
        score,
      }
    }
  }

  if (bestMatch.score <= 0) {
    return {
      language: 'unknown',
      fieldIndices: {},
      missingFields: headerFields,
    }
  }

  return {
    language: bestMatch.language,
    fieldIndices: bestMatch.matches,
    missingFields: bestMatch.missing,
  }
}
