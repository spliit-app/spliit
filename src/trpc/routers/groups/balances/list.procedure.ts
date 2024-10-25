import { z } from 'zod'
import { getGroupExpenses } from '../../../../lib/api'
import {
  getBalances,
  getPublicBalances,
  getSuggestedReimbursements,
} from '../../../../lib/balances'
import { baseProcedure } from '../../../init'

export const listGroupBalancesProcedure = baseProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId } }) => {
    const expenses = await getGroupExpenses(groupId)
    const balances = getBalances(expenses)
    const reimbursements = getSuggestedReimbursements(balances)
    const publicBalances = getPublicBalances(reimbursements)

    return { balances: publicBalances, reimbursements }
  })
