'use client'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { useActiveUser } from '@/lib/hooks'
import { getTotalActiveUserPaidFor } from '@/lib/totals'
import { cn, formatCurrency } from '@/lib/utils'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>
}

export function TotalsYourSpendings({ group, expenses }: Props) {
  const activeUser = useActiveUser(group.id)

  const totalYourSpendings =
    activeUser === '' || activeUser === 'None'
      ? 0
      : getTotalActiveUserPaidFor(activeUser, expenses)
  const currency = group.currency
  const balance = totalYourSpendings < 0 ? 'earnings' : 'spendings'

  return (
    <div>
      <div className="text-muted-foreground">Your total {balance}</div>

      <div
        className={cn(
          'text-lg',
          totalYourSpendings < 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {formatCurrency(currency, Math.abs(totalYourSpendings))}
      </div>
    </div>
  )
}
