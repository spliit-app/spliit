import { createExpense } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'
import { getImportChunkSize } from './shared'

const storageSchema = z.array(expenseFormSchema)

// Consumes the next chunk of expenses and creates them in the DB.
export const runCreateImportFromFileChunkProcedure = baseProcedure
  .input(z.object({ jobId: z.string().min(1) }))
  .mutation(async ({ input: { jobId } }) => {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: { group: true },
    })

    if (!job) throw new Error('Import job not found.')

    // If already completed, return success state immediately.
    if (job.status === 'COMPLETED') {
      return {
        processed: job.totalExpenses,
        total: job.totalExpenses,
        remaining: 0,
        done: true,
        resultId: job.id,
        groupId: job.groupId,
        groupName: job.group.name,
      }
    }

    if (job.status === 'CANCELLED' || job.status === 'FAILED') {
      throw new Error(`Import job is ${job.status.toLowerCase()}.`)
    }

    // Safely parse expenses from JSON.
    const parseResult = storageSchema.safeParse(job.expensesToCreate)
    if (!parseResult.success) {
      const msg = 'Import job data is corrupted.'
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: msg },
      })
      throw new Error(msg)
    }
    const allExpenses = parseResult.data

    // Check if we have anything to process based on current state
    if (job.nextIndex >= allExpenses.length) {
      // No more chunks to claim.
      // Return current progress.
      return {
        processed: job.processedExpenses,
        total: job.totalExpenses,
        remaining: Math.max(job.totalExpenses - job.processedExpenses, 0),
        done: job.processedExpenses >= job.totalExpenses,
        resultId:
          job.processedExpenses >= job.totalExpenses ? job.id : undefined,
        groupId: job.groupId,
        groupName: job.group.name,
      }
    }

    const step = Math.max(1, getImportChunkSize())
    const startIndex = job.nextIndex
    const endIndex = Math.min(startIndex + step, allExpenses.length)

    // Optimistic Concurrency Control:
    // Try to claim the next chunk. If nextIndex has changed since we read it,
    // this update will fail (count 0), preventing race conditions.
    const claim = await prisma.importJob.updateMany({
      where: {
        id: jobId,
        nextIndex: startIndex,
      },
      data: {
        nextIndex: endIndex,
        status: 'PROCESSING',
      },
    })

    if (claim.count === 0) {
      // Race condition lost or job state changed externally.
      // Fetch the latest state and return it so the client can decide (e.g., retry or finish).
      const freshJob = await prisma.importJob.findUniqueOrThrow({
        where: { id: jobId },
        include: { group: true },
      })
      const isDone = freshJob.status === 'COMPLETED'
      return {
        processed: freshJob.processedExpenses,
        total: freshJob.totalExpenses,
        remaining: Math.max(
          freshJob.totalExpenses - freshJob.processedExpenses,
          0,
        ),
        done: isDone,
        resultId: isDone ? freshJob.id : undefined,
        groupId: freshJob.groupId,
        groupName: freshJob.group.name,
      }
    }

    // We successfully claimed the range [startIndex, endIndex).
    const createdIds: string[] = []

    try {
      for (let index = startIndex; index < endIndex; index++) {
        const rawExpense = allExpenses[index]
        if (rawExpense) {
          // JSON serialization turns dates into strings; revive them.
          const expense = {
            ...rawExpense,
            expenseDate: new Date(rawExpense.expenseDate),
          }
          const createdExpense = await createExpense(expense, job.groupId)
          createdIds.push(createdExpense.id)
        }
      }
    } catch (error) {
      // If processing fails, fail the job.
      // We do not rollback nextIndex because partial progress might have been made (although createExpense is not batched here).
      // Since we claimed the chunk, leaving a gap is better than infinite retry loops on bad data.
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    }

    // Update progress stats.
    // We use increment for processedExpenses to safely handle parallel completions.
    const updatedJob = await prisma.importJob.update({
      where: { id: jobId },
      data: {
        processedExpenses: { increment: createdIds.length },
        createdExpenseIds: { push: createdIds },
      },
    })

    // Check if the job is fully complete.
    let isDone = updatedJob.status === 'COMPLETED'
    if (!isDone && updatedJob.processedExpenses >= updatedJob.totalExpenses) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      })
      isDone = true
    }

    return {
      processed: updatedJob.processedExpenses,
      total: updatedJob.totalExpenses,
      remaining: Math.max(
        updatedJob.totalExpenses - updatedJob.processedExpenses,
        0,
      ),
      done: isDone,
      resultId: isDone ? jobId : undefined,
      groupId: job.groupId,
      groupName: job.group.name,
    }
  })
