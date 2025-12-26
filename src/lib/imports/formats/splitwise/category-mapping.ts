import { SplitwiseExportLanguage } from './header-detection'
import {
  CategoryTranslation,
  categoryTranslationsByKey,
  categoryTranslationsByLanguage,
  groupLabelTranslations,
} from './mapping-data'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const separators = [' - ', ' – ', '/', ' / ', ':']

export function mapSplitwiseCategoryLabel(
  label: string,
  language: SplitwiseExportLanguage,
): CategoryTranslation | null {
  if (!label) return null

  const normalized = normalize(label)
  const lookup = categoryTranslationsByLanguage[language] ?? {}
  const canonicalGroups = groupLabelTranslations[language] ?? {}
  const keyLookup = categoryTranslationsByKey[language] ?? {}

  const direct = lookup[normalized]
  if (direct) return direct

  let groupPart: string | null = null
  let subPart: string | null = null

  for (const separator of separators) {
    if (label.includes(separator)) {
      const [group, sub] = label.split(separator)
      groupPart = group
      subPart = sub
      break
    }
  }

  if (groupPart && subPart) {
    const canonicalGroup = canonicalGroups[normalize(groupPart)]
    if (canonicalGroup) {
      const targetNormalized = normalize(subPart)
      const candidate = Object.values(lookup).find(
        (entry) =>
          entry.grouping === canonicalGroup &&
          normalize(entry.label) === targetNormalized,
      )
      if (candidate) return candidate

      const fallbackKey = `${canonicalGroup}/Other`
      return keyLookup[fallbackKey] ?? null
    }
  }

  return null
}
