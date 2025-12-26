import { prisma } from '@/lib/prisma'
import { expenseFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { RecurrenceRule } from '@prisma/client'
import { nanoid } from 'nanoid'
import { z } from 'zod'

export const processBatchProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string(),
      expenses: z.array(expenseFormSchema),
    }),
  )
  .mutation(async ({ input: { groupId, expenses } }) => {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { participants: true },
    })
    if (!group) throw new Error('Group not found')

    const participantIds = new Set(group.participants.map((p) => p.id))
    const createdIds: string[] = []

    // Validate all participants before starting transaction
    for (const expense of expenses) {
      if (!participantIds.has(expense.paidBy)) {
        throw new Error(`Invalid payer ID: ${expense.paidBy}`)
      }
      for (const pf of expense.paidFor) {
        if (!participantIds.has(pf.participant)) {
          throw new Error(`Invalid receiver ID: ${pf.participant}`)
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const expense of expenses) {
        const expenseId = nanoid()
        createdIds.push(expenseId)

        // Note: We skip individual activity logging for performance and noise reduction.
        // We also skip complex recurrence creation for imports as they are usually historical.

        await tx.expense.create({
          data: {
            id: expenseId,
            groupId,
            expenseDate: expense.expenseDate,
            categoryId: expense.category,
            amount: expense.amount,
            originalAmount: expense.originalAmount,
            originalCurrency: expense.originalCurrency,
            conversionRate: expense.conversionRate,
            title: expense.title,
            paidById: expense.paidBy,
            splitMode: expense.splitMode,
            recurrenceRule: expense.recurrenceRule || RecurrenceRule.NONE,
            isReimbursement: expense.isReimbursement,
            notes: expense.notes,
            paidFor: {
              createMany: {
                data: expense.paidFor.map((pf) => ({
                  participantId: pf.participant,
                  shares: pf.shares,
                })),
              },
            },
            documents: {
              createMany: {
                data: expense.documents.map((doc) => ({
                  id: nanoid(),
                  url: doc.url,
                  width: doc.width,
                  height: doc.height,
                })),
              },
            },
          },
        })
      }

      // Optional: Add a single activity log for the batch?
      // Or just rely on the UI to show success.
      // For now, no activity log to keep it simple and fast.
    })

    return createdIds
  })
