'use client'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { getTotalActiveUserShare } from '@/lib/totals'
import { cn, formatCurrency } from '@/lib/utils'
import { useEffect, useState } from 'react'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>
}

export function TotalsYourShare({ group, expenses }: Props) {
  const [activeUser, setActiveUser] = useState('')

  useEffect(() => {
    const activeUser = localStorage.getItem(`${group.id}-activeUser`)
    if (activeUser) setActiveUser(activeUser)
  }, [group, expenses])

  const totalActiveUserShare =
    activeUser === '' || activeUser === 'None'
      ? 0
      : getTotalActiveUserShare(activeUser, expenses)
  const currency = group.currency

  return (
    <div>
      <div className="text-muted-foreground">Your total share</div>
      <div
        className={cn(
          'text-lg',
          totalActiveUserShare < 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {formatCurrency(currency, Math.abs(totalActiveUserShare))}
      </div>
    </div>
  )
}
