import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

// Cancels a running job: deletes all created expenses and the newly created group.
export const cancelCreateImportFromFileProcedure = baseProcedure
  .input(z.object({ jobId: z.string().min(1) }))
  .mutation(async ({ input: { jobId } }) => {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { group: true },
    })

    if (!job) throw new Error('Import job not found.')
    if (job.status === 'COMPLETED') {
      throw new Error('Import job is already completed.')
    }

    // Deleting the group will cascade delete the expenses and the ImportJob itself.
    await prisma.group.delete({ where: { id: job.groupId } })

    // We still respond with a synthetic result for the client
    return {
      resultId: jobId,
      processed: job.processedExpenses,
      total: job.totalExpenses,
      groupId: job.groupId,
      groupName: job.group.name,
    }
  })
