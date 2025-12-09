import { createExpense } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { expenseFormSchema, type ExpenseFormValues } from '@/lib/schemas'
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

    // Mark as processing if strictly pending
    if (job.status === 'PENDING') {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
      })
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

    const step = Math.max(1, getImportChunkSize())
    const startIndex = job.nextIndex
    const endIndex = Math.min(startIndex + step, allExpenses.length)

    const createdIds: string[] = []
    let nextIndex = startIndex

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
        nextIndex = index + 1
      }
    } catch (error) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    }

    const done = nextIndex >= allExpenses.length
    const newStatus = done ? 'COMPLETED' : 'PROCESSING'

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        nextIndex,
        processedExpenses: nextIndex,
        createdExpenseIds: { push: createdIds },
        status: newStatus,
      },
    })

    return {
      processed: nextIndex,
      total: allExpenses.length,
      remaining: Math.max(allExpenses.length - nextIndex, 0),
      done,
      resultId: done ? jobId : undefined,
      groupId: job.groupId,
      groupName: job.group.name,
    }
  })
