import { getBalances } from '@/lib/balances'
import { parseWithDetectionInternal } from '@/lib/imports/registry'
import { ExpenseFormValues } from '@/lib/schemas'

// Return type of the import builder.
export type ImportParticipantSummary = { name: string; balance: number }
export type ImportBuildResult = {
  expenses: ExpenseFormValues[]
  errors: { row: number; message: string }[]
  participantSummaries: ImportParticipantSummary[]
  participants: string[]
  group?: import('@/lib/imports/types').ImportParsedGroupInfo
  format: { id: string; label: string }
}

// Compute net balance per participant from internal expenses for preview purposes.
//
// This leverages the existing getBalances() algorithm to ensure consistency with
// app-wide balance logic (split modes, rounding behavior). We adapt the
// internal form values into the minimal structure expected by getBalances.
const buildParticipantSummariesFromInternal = (
  expenses: ExpenseFormValues[],
  group?: import('@/lib/imports/types').ImportParsedGroupInfo,
) => {
  // Adapt form values to the shape consumed by getBalances.
  const previewExpenses = expenses.map((e) => ({
    amount: Math.round(e.amount),
    splitMode: e.splitMode,
    isReimbursement: e.isReimbursement,
    paidBy: { id: e.paidBy },
    paidFor: e.paidFor.map((p) => ({
      participant: { id: p.participant },
      shares: Number(p.shares),
    })),
  })) as any

  const balances = getBalances(previewExpenses)

  // Build a mapping from external participant id -> display name if provided by adapter.
  const idToName = new Map<string, string>()
  if (group?.participants) {
    for (const p of group.participants) {
      const pid = (p.id ?? '').trim()
      const pname = p.name?.trim()
      if (pid && pname) idToName.set(pid, pname)
    }
  }

  // Map balances by participant id to {name, balance} entries, prefer nice names.
  return Object.entries(balances).map(([participantId, { total }]) => ({
    name: idToName.get(participantId) ?? participantId,
    balance: total,
  }))
}

// Convert a parsed/normalized import file into ExpenseFormValues for a group.
// Design notes:
// - Focused on the creation flow.
// - Omits deduplication and category-mapping heuristics.
export async function buildExpensesFromFileImport(
  fileContent: string,
): Promise<ImportBuildResult> {
  const trimmed = fileContent.trim()
  if (!trimmed) throw new Error('Uploaded file was empty.')

  const { expenses, errors, group, format } =
    await parseWithDetectionInternal(trimmed)

  // Derive definitive participant list for group creation.
  // Prefer participants supplied by the adapter; otherwise derive from expenses.
  let participantNames: string[] | undefined = group?.participants?.map(
    (p) => p.name,
  )
  if (!participantNames || participantNames.length === 0) {
    const set = new Set<string>()
    for (const e of expenses) {
      set.add(e.paidBy)
      for (const pf of e.paidFor) set.add(pf.participant)
    }
    participantNames = Array.from(set)
  }

  return {
    expenses,
    errors,
    participantSummaries: buildParticipantSummariesFromInternal(
      expenses,
      group,
    ),
    participants: participantNames,
    group,
    format: { id: format.id, label: format.label },
  }
}
