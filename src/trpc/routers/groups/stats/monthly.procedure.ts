import { getGroup, getGroupExpenses, getProjectedExpenses } from '@/lib/api'
import {
  addMonths,
  getMonthEnd,
  getMonthlyReport,
  getOpenInstallmentPlans,
  getUpcomingMonths,
} from '@/lib/monthly-report'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

/** Months shown in the "coming months" chart, the current one included. */
const UPCOMING_MONTHS = 12
/** Far enough to reach the last installment of any plan. */
const INSTALLMENT_PLANS_HORIZON_YEARS = 31

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

/**
 * Everything the monthly report shows: what falls in `month` (recorded and
 * expected), who owes whom for it, what is committed for the coming months and
 * the installment plans still running. `currentMonth` is the user's current
 * month, which the server cannot tell from its own clock.
 */
export const getStatsMonthlyProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      month: monthSchema,
      currentMonth: monthSchema,
    }),
  )
  .query(async ({ input: { groupId, month, currentMonth } }) => {
    // Both materialize the occurrences that are due: run them one after the
    // other so the two passes do not race.
    const group = await getGroup(groupId)
    const expenses = await getGroupExpenses(groupId)

    const lastUpcomingMonth = addMonths(currentMonth, UPCOMING_MONTHS - 1)
    const until = getMonthEnd(
      month > lastUpcomingMonth ? month : lastUpcomingMonth,
    )
    const expected = await getProjectedExpenses(groupId, until)

    const plansUntil = new Date(until)
    plansUntil.setUTCFullYear(
      new Date().getUTCFullYear() + INSTALLMENT_PLANS_HORIZON_YEARS,
    )
    const expectedInstallments = await getProjectedExpenses(
      groupId,
      plansUntil,
      { seriesKind: 'INSTALLMENTS' },
    )

    return {
      report: getMonthlyReport({
        month,
        expenses,
        expected,
        participants: group?.participants ?? [],
        installments: [...expenses, ...expectedInstallments],
      }),
      upcoming: getUpcomingMonths({
        fromMonth: currentMonth,
        count: UPCOMING_MONTHS,
        expenses,
        expected,
      }),
      installmentPlans: getOpenInstallmentPlans(expectedInstallments),
    }
  })
