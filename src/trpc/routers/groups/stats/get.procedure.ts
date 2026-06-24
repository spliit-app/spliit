import { getGroupExpenses } from '@/lib/api'
import { getBalanceTimeline } from '@/lib/balance-timeline'
import {
  getMonthlyCategorySpending,
  monthlySpendingGroupingOptions,
  monthlySpendingRangeOptions,
} from '@/lib/monthly-spending'
import {
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
      monthlySpendingGrouping: z
        .enum(monthlySpendingGroupingOptions)
        .default('categoryGroup'),
      monthlySpendingRange: z.enum(monthlySpendingRangeOptions).default('6'),
    }),
  )
  .query(
    async ({
      input: {
        groupId,
        participantId,
        monthlySpendingGrouping,
        monthlySpendingRange,
      },
    }) => {
      const expenses = await getGroupExpenses(groupId)
      const totalGroupSpendings = getTotalGroupSpending(expenses)
      const monthlyCategorySpending = getMonthlyCategorySpending(expenses, {
        grouping: monthlySpendingGrouping,
        range: monthlySpendingRange,
      })
      const balanceTimeline = getBalanceTimeline(expenses, {
        range: monthlySpendingRange,
      })

      const totalParticipantSpendings =
        participantId !== undefined
          ? getTotalActiveUserPaidFor(participantId, expenses)
          : undefined
      const totalParticipantShare =
        participantId !== undefined
          ? getTotalActiveUserShare(participantId, expenses)
          : undefined

      return {
        totalGroupSpendings,
        totalParticipantSpendings,
        totalParticipantShare,
        monthlyCategorySpending,
        balanceTimeline,
      }
    },
  )
