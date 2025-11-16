import { buildExpensesFromFileImport } from '@/lib/imports/file-import'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

// Parses the upload and returns a normalized preview.
// The client shows warnings and totals before starting the import job.
export const previewImportGroupFromFileProcedure = baseProcedure
  .input(
    z.object({
      fileContent: z.string().min(1),
      fileName: z.string().trim().optional(),
    }),
  )
  .mutation(async ({ input: { fileContent } }) => {
    const trimmed = fileContent.trim()
    if (!trimmed) {
      throw new Error('Uploaded file was empty.')
    }

    // Parse directly into internal expenses and compute summaries.
    return await buildExpensesFromFileImport(trimmed)
  })
