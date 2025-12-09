import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

// Finalizes a completed job so the UI can navigate to the new group safely.
export const finalizeCreateImportFromFileProcedure = baseProcedure
  .input(z.object({ resultId: z.string().min(1) }))
  .mutation(async ({ input: { resultId } }) => {
    const job = await prisma.importJob.findUnique({
      where: { id: resultId },
      include: { group: true },
    })

    if (!job) throw new Error('Import result not found or already handled.')
    if (job.status !== 'COMPLETED') {
      throw new Error('Import job is not completed.')
    }

    // Clean up the job record, but keep the group!
    await prisma.importJob.delete({ where: { id: resultId } })

    return {
      success: true,
      groupId: job.groupId,
      groupName: job.group.name,
    }
  })
