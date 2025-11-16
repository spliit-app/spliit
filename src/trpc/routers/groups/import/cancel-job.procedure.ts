import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { createImportJobs } from './shared'

// Cancels a running job: deletes all created expenses and the newly created group.
export const cancelCreateImportFromFileProcedure = baseProcedure
  .input(z.object({ jobId: z.string().min(1) }))
  .mutation(async ({ input: { jobId } }) => {
    const job = createImportJobs.get(jobId)
    if (!job) throw new Error('Import job not found or already completed.')
    // Fast cancellation: remove all expenses of the group in one go, then drop the group.
    await prisma.expense.deleteMany({ where: { groupId: job.groupId } })
    await prisma.group.delete({ where: { id: job.groupId } })
    createImportJobs.delete(jobId)
    // We still respond with a synthetic result for the client
    return {
      resultId: jobId,
      processed: job.nextIndex,
      total: job.expenses.length,
      groupId: job.groupId,
      groupName: job.groupName,
    }
  })
