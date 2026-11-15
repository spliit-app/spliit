import { getCurrency } from '@/lib/currency'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'

const MCP_LOCALE = 'en-US'

type GroupForDisplay = {
  currency: string
  currencyCode: string | null
}

type ExpenseForDisplay = {
  amount: number
  originalAmount: number | null
  originalCurrency: string | null
}

export function formatAmount(group: GroupForDisplay, amount: number): string {
  return formatCurrency(getCurrencyFromGroup(group), amount, MCP_LOCALE)
}

function formatOriginalAmount(
  group: GroupForDisplay,
  amount: number,
  currencyCode: string | null,
): string {
  return formatCurrency(
    getCurrency(currencyCode ?? group.currencyCode, MCP_LOCALE, group.currency),
    amount,
    MCP_LOCALE,
  )
}

export function expenseDisplay(
  group: GroupForDisplay,
  expense: ExpenseForDisplay,
): { amount: string; originalAmount?: string } {
  return {
    amount: formatAmount(group, expense.amount),
    ...(expense.originalAmount != null
      ? {
          originalAmount: formatOriginalAmount(
            group,
            expense.originalAmount,
            expense.originalCurrency,
          ),
        }
      : {}),
  }
}

export function balanceDisplay(
  group: GroupForDisplay,
  balances: Record<string, { paid: number; paidFor: number; total: number }>,
): Record<string, { paid: string; paidFor: string; total: string }> {
  return Object.fromEntries(
    Object.entries(balances).map(([participantId, balance]) => [
      participantId,
      {
        paid: formatAmount(group, balance.paid),
        paidFor: formatAmount(group, balance.paidFor),
        total: formatAmount(group, balance.total),
      },
    ]),
  )
}
