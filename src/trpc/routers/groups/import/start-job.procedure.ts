import { createGroup } from '@/lib/api'
import { buildExpensesFromFileImport } from '@/lib/imports/file-import'
import { baseProcedure } from '@/trpc/init'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { createImportJobs } from './shared'

// Starts a new import job: creates the group and stages expenses.
export const startCreateImportFromFileProcedure = baseProcedure
  .input(
    z.object({
      fileContent: z.string().min(1),
      groupName: z.string().trim().optional(),
      fileName: z.string().trim().optional(),
    }),
  )
  .mutation(async ({ input: { fileContent, groupName } }) => {
    const trimmed = fileContent.trim()
    if (!trimmed) throw new Error('Uploaded file was empty.')
    const result = await buildExpensesFromFileImport(trimmed)

    if (result.errors.length > 0) {
      throw new Error(
        'Cannot import while the file contains blocking errors. Please fix them first.',
      )
    }

    // Prefer participants supplied by the adapter; otherwise derive from expenses.
    let participantNames: string[] | undefined =
      result.group?.participants?.map((p) => p.name)
    if (!participantNames || participantNames.length === 0) {
      const set = new Set<string>()
      for (const e of result.expenses) {
        set.add(e.paidBy)
        for (const pf of e.paidFor) set.add(pf.participant)
      }
      participantNames = Array.from(set)
    }
    if (participantNames.length === 0)
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
      participants: participantNames.map((name) => ({ name })),
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
    createImportJobs.set(jobId, {
      id: jobId,
      groupId: group.id,
      groupName: group.name,
      expenses: remappedExpenses,
      nextIndex: 0,
      createdExpenseIds: [],
    })

    return {
      jobId,
      totalExpenses: result.expenses.length,
      groupId: group.id,
      groupName: group.name,
    }
  })
