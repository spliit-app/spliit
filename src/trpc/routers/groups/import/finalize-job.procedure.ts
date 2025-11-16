import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { createImportResults, lookupCreateImportRecord } from './shared'

// Finalizes a completed job so the UI can navigate to the new group safely.
export const finalizeCreateImportFromFileProcedure = baseProcedure
  .input(z.object({ resultId: z.string().min(1) }))
  .mutation(({ input: { resultId } }) => {
    const record = lookupCreateImportRecord(resultId)
    createImportResults.delete(resultId)
    return {
      success: true,
      groupId: record.groupId,
      groupName: record.groupName,
    }
  })
