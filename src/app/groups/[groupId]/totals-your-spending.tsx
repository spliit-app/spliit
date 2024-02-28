'use client'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { getTotalActiveUserPaidFor } from '@/lib/totals'
import { formatCurrency } from '@/lib/utils'
import { useEffect, useState } from 'react'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>
}

export function TotalsYourSpendings({ group, expenses }: Props) {
  const [activeUser, setActiveUser] = useState('')

  useEffect(() => {
    const activeUser = localStorage.getItem(`${group.id}-activeUser`)
    if (activeUser) setActiveUser(activeUser)
  }, [group, expenses])

  const totalYourSpendings =
    activeUser === '' || activeUser === 'None'
      ? 0
      : getTotalActiveUserPaidFor(activeUser, expenses)
  const currency = group.currency

  return (
    <div>
      <div className="text-muted-foreground">Total you paid for</div>

      <div className="text-lg">
        {formatCurrency(currency, totalYourSpendings)}
      </div>
    </div>
  )
}
