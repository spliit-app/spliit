import mappingData from './mapping-data.json'
import {
  CategoryTranslation,
  SplitwiseColumn,
  SplitwiseExportLanguage,
} from './types'

export type { CategoryTranslation } from './types'

export const headerAliasesByLanguage =
  mappingData.headerAliasesByLanguage as Record<
    SplitwiseExportLanguage,
    Partial<Record<SplitwiseColumn, string[]>>
  >

export const categoryTranslationsByLanguage =
  mappingData.categoryTranslationsByLanguage as Record<
    SplitwiseExportLanguage,
    Record<string, CategoryTranslation>
  >

export const categoryTranslationsByKey =
  mappingData.categoryTranslationsByKey as Record<
    SplitwiseExportLanguage,
    Record<string, CategoryTranslation>
  >

export const groupLabelTranslations =
  mappingData.groupLabelTranslations as Record<
    SplitwiseExportLanguage,
    Record<string, string>
  >
