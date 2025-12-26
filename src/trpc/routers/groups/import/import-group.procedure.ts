import { createExpense, createGroup } from '@/lib/api'
import { buildExpensesFromFileImport } from '@/lib/imports/file-import'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

// Creates a new group from a file in a single request (no progress tracking).
// Kept for potential future use; the UI currently prefers the chunked job flow.
export const importGroupFromFileProcedure = baseProcedure
  .input(
    z.object({
      fileContent: z.string().min(1),
      groupName: z.string().trim().optional(),
      fileName: z.string().trim().optional(),
    }),
  )
  .mutation(async ({ input: { fileContent, groupName } }) => {
    const trimmed = fileContent.trim()
    if (!trimmed) {
      throw new Error('Uploaded file was empty.')
    }

    // Parse the file into internal expenses first.
    const result = await buildExpensesFromFileImport(trimmed)

    if (result.errors.length > 0) {
      throw new Error(
        'Unable to import file. Please fix the reported issues and try again.',
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

    // Simple name-based remapping: adapters set participants to display names.
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

    for (const expense of result.expenses.map(remapExpense)) {
      await createExpense(expense, group.id)
    }

    return { groupId: group.id, groupName: group.name }
  })
