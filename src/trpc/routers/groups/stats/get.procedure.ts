import { getGroupExpenses } from '@/lib/api'
import {
  calculateShare,
  getTotalActiveUserPaidFor,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from '@/lib/totals'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getGroupStatsProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, participantId } }) => {
    const expenses = await getGroupExpenses(groupId)
    const totalGroupSpendings = getTotalGroupSpending(expenses)

    const totalParticipantSpendings =
      participantId !== undefined
        ? getTotalActiveUserPaidFor(participantId, expenses)
        : undefined
    const totalParticipantShare =
      participantId !== undefined
        ? getTotalActiveUserShare(participantId, expenses)
        : undefined

    // Per-participant breakdown for pie charts
    const participantMap = new Map<
      string,
      { id: string; name: string; spending: number; share: number }
    >()

    for (const expense of expenses) {
      if (expense.isReimbursement) continue

      const payer = expense.paidBy
      if (!participantMap.has(payer.id)) {
        participantMap.set(payer.id, {
          id: payer.id,
          name: payer.name,
          spending: 0,
          share: 0,
        })
      }
      participantMap.get(payer.id)!.spending += expense.amount

      for (const pf of expense.paidFor) {
        const pid = pf.participant.id
        if (!participantMap.has(pid)) {
          participantMap.set(pid, {
            id: pid,
            name: pf.participant.name,
            spending: 0,
            share: 0,
          })
        }
        participantMap.get(pid)!.share += calculateShare(pid, expense)
      }
    }

    const spendingsByParticipant = Array.from(participantMap.values())
      .filter((p) => p.spending > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        amount: parseFloat(p.spending.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount)

    const sharesByParticipant = Array.from(participantMap.values())
      .filter((p) => p.share > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        amount: parseFloat(p.share.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      totalGroupSpendings,
      totalParticipantSpendings,
      totalParticipantShare,
      spendingsByParticipant,
      sharesByParticipant,
    }
  })
