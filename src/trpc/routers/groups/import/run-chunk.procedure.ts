import { createExpense } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import {
  createImportJobs,
  createImportResults,
  getImportChunkSize,
} from './shared'

// Consumes the next chunk of expenses and creates them in the DB.
export const runCreateImportFromFileChunkProcedure = baseProcedure
  .input(z.object({ jobId: z.string().min(1) }))
  .mutation(async ({ input: { jobId } }) => {
    const job = createImportJobs.get(jobId)
    if (!job) throw new Error('Import job not found or already completed.')

    // Fixed chunk size to keep each request short and predictable
    const step = Math.max(1, getImportChunkSize())
    const startIndex = job.nextIndex
    const endIndex = Math.min(job.nextIndex + step, job.expenses.length)

    let nextIndex = startIndex
    try {
      for (let index = startIndex; index < endIndex; index++) {
        const expense = job.expenses[index]
        if (expense) {
          const createdExpense = await createExpense(expense, job.groupId)
          job.createdExpenseIds.push(createdExpense.id)
        }
        nextIndex = index + 1
      }
    } catch (error) {
      createImportJobs.delete(jobId)
      throw error
    }

    job.nextIndex = nextIndex
    const done = job.nextIndex >= job.expenses.length
    let resultId: string | undefined
    if (done) {
      createImportResults.set(jobId, {
        id: jobId,
        groupId: job.groupId,
        groupName: job.groupName,
        expenseIds: [...job.createdExpenseIds],
        totalExpenses: job.expenses.length,
        processedExpenses: job.nextIndex,
        status: 'completed',
      })
      createImportJobs.delete(jobId)
      resultId = jobId
    }

    return {
      processed: job.nextIndex,
      total: job.expenses.length,
      remaining: Math.max(job.expenses.length - job.nextIndex, 0),
      done,
      resultId,
      groupId: job.groupId,
      groupName: job.groupName,
    }
  })
