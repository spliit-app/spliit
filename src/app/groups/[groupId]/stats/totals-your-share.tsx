'use client'
import { getGroup, getGroupExpenses } from '@/lib/api'
import { getTotalActiveUserShare } from '@/lib/totals'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  expenses: NonNullable<Awaited<ReturnType<typeof getGroupExpenses>>>
}

export function TotalsYourShare({ group, expenses }: Props) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')
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
      <div className="text-muted-foreground">{t('yourShare')}</div>
      <div
        className={cn(
          'text-lg',
          totalActiveUserShare < 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {formatCurrency(currency, Math.abs(totalActiveUserShare), locale)}
      </div>
    </div>
  )
}
