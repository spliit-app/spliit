import { buildExpensesFromFileImport } from '@/lib/imports/file-import'

export type CreateImportJob = {
  id: string
  groupId: string
  groupName: string
  expenses: Awaited<ReturnType<typeof buildExpensesFromFileImport>>['expenses']
  nextIndex: number
  createdExpenseIds: string[]
}

export type CreateImportRecordStatus = 'completed' | 'cancelled'
export type CreateImportRecord = {
  id: string
  groupId: string
  groupName: string
  expenseIds: string[]
  totalExpenses: number
  processedExpenses: number
  status: CreateImportRecordStatus
}

export const createImportJobs = new Map<string, CreateImportJob>()
export const createImportResults = new Map<string, CreateImportRecord>()

export const DEFAULT_IMPORT_CHUNK_SIZE = 50
export const getImportChunkSize = () => {
  const envValue = process.env.IMPORT_CHUNK_SIZE
  if (!envValue) return DEFAULT_IMPORT_CHUNK_SIZE
  const parsed = Number(envValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_IMPORT_CHUNK_SIZE
  return Math.floor(parsed)
}

export const lookupCreateImportRecord = (resultId: string) => {
  const record = createImportResults.get(resultId)
  if (!record) throw new Error('Import result not found or already handled.')
  return record
}
