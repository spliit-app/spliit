import {
  getActiveRecurringExpenses,
  getGroup,
  getGroupExpenses,
} from '@/lib/api'
import {
  filterExpensesByDateRange,
  getRecurringSpending,
  getSpendingByCategory,
  getSpendingByParticipant,
  getSpendingOverTime,
  getSpendingSummary,
  getTotalActiveUserPaidFor,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from '@/lib/totals'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

/**
 * Single data-loader for the whole stats page. Fetches the group's expenses
 * once and derives every stats section from them, so loading the page (and
 * changing the date range) costs one request instead of one per card.
 *
 * Recurring stats are range-independent (they reflect the currently active
 * subscriptions) and come from a separate query.
 */
export const getStatsOverviewProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      participantId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, participantId, from, to } }) => {
    // getGroupExpenses and getActiveRecurringExpenses both materialize due
    // recurring frames; run them sequentially so the two passes don't race
    // each other (the second is a no-op once the first has materialized).
    const [group, allExpenses] = await Promise.all([
      getGroup(groupId),
      getGroupExpenses(groupId),
    ])
    const recurringExpenses = await getActiveRecurringExpenses(groupId)

    const expenses = filterExpensesByDateRange(allExpenses, from, to)
    const participants = group?.participants ?? []

    return {
      totalGroupSpendings: getTotalGroupSpending(expenses),
      totalParticipantSpendings:
        participantId !== undefined
          ? getTotalActiveUserPaidFor(participantId, expenses)
          : undefined,
      totalParticipantShare:
        participantId !== undefined
          ? getTotalActiveUserShare(participantId, expenses)
          : undefined,
      summary: getSpendingSummary(expenses),
      months: getSpendingOverTime(expenses),
      participants: getSpendingByParticipant(participants, expenses),
      categories: getSpendingByCategory(expenses),
      recurring: getRecurringSpending(recurringExpenses),
    }
  })
