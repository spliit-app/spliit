export type SplitwiseColumn =
  | 'date'
  | 'description'
  | 'category'
  | 'cost'
  | 'currency'

export type SplitwiseExportLanguage = 'de' | 'en' | 'unknown'

export type CategoryTranslation = {
  grouping: string
  name: string
  id: number
  label: string
  key: string
}
