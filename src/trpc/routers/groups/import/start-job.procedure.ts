import { createGroup } from '@/lib/api'
import { buildExpensesFromFileImport } from '@/lib/imports/file-import'
import { prisma } from '@/lib/prisma'
import { baseProcedure } from '@/trpc/init'
import { nanoid } from 'nanoid'
import { z } from 'zod'

// Starts a new import job: creates the group and stages expenses.
export const startCreateImportFromFileProcedure = baseProcedure
  .input(
    z.object({
      fileContent: z
        .string()
        .min(1)
        .max(10 * 1024 * 1024), // 10MB limit
      groupName: z.string().trim().optional(),
      fileName: z.string().trim().optional(),
    }),
  )
  .mutation(async ({ input: { fileContent, groupName } }) => {
    // Maintenance: Clean up old jobs (older than 24h) to prevent table bloat.
    // This is a simple strategy that runs on every new import start.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await prisma.importJob.deleteMany({
      where: { createdAt: { lt: yesterday } },
    })

    const trimmed = fileContent.trim()
    if (!trimmed) throw new Error('Uploaded file was empty.')
    const result = await buildExpensesFromFileImport(trimmed)

    if (result.errors.length > 0) {
      throw new Error(
        'Cannot import while the file contains blocking errors. Please fix them first.',
      )
    }

    if (result.participants.length === 0)
      throw new Error('No participants found in file.')

    const currency =
      (result.group?.currency as string | undefined)?.trim() || '€'
    const currencyCode =
      (result.group?.currencyCode as string | undefined)?.trim() || ''
    const inferredName = (result.group?.name as string | undefined)?.trim()
    const group = await createGroup({
      name: groupName?.trim() || inferredName || 'Imported group',
      information: undefined,
      currency,
      currencyCode,
      participants: result.participants.map((name) => ({ name })),
    })

    // Map names to DB IDs; adapters use participant names directly in expenses.
    const createdNameToId = new Map(
      group.participants.map((p) => [p.name, p.id] as const),
    )
    const remapExpense = (exp: (typeof result.expenses)[number]) => ({
      ...exp,
      paidBy: createdNameToId.get(exp.paidBy) ?? exp.paidBy,
      paidFor: exp.paidFor.map((pf) => ({
        ...pf,
        participant: createdNameToId.get(pf.participant) ?? pf.participant,
      })),
    })

    const remappedExpenses = result.expenses.map(remapExpense)

    const jobId = nanoid()
    await prisma.importJob.create({
      data: {
        id: jobId,
        groupId: group.id,
        status: 'PENDING',
        expensesToCreate: remappedExpenses as any, // Prisma Json handling
        totalExpenses: remappedExpenses.length,
      },
    })

    return {
      jobId,
      totalExpenses: result.expenses.length,
      groupId: group.id,
      groupName: group.name,
    }
  })
