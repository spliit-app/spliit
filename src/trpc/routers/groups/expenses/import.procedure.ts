import { createExpense } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { parseSplitwiseCSV } from '../../../../lib/splitwise-import'

export const importSplitwiseCSVProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      csvContent: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { groupId, csvContent, participantId } }) => {
    try {
      const parsedExpenses = await parseSplitwiseCSV(csvContent, groupId)

      const createdExpenses = []
      for (const expenseData of parsedExpenses) {
        const expense = await createExpense(expenseData, groupId, participantId)
        createdExpenses.push(expense)
      }

      return {
        success: true,
        importedCount: createdExpenses.length,
        expenses: createdExpenses,
      }
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          error instanceof Error ? error.message : 'Failed to import CSV',
      })
    }
  })
