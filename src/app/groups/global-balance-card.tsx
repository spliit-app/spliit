'use client'

import { RecentGroups } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Currency } from '@/lib/currency'
import { MAX_GROUPS_PER_QUERY } from '@/lib/group-query-limits'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

type CurrencyBalance = {
  currency: Currency
  amount: number
}

export function GlobalBalanceCard({ groups }: { groups: RecentGroups }) {
  const [activeUserGroups, setActiveUserGroups] = useState<
    { groupId: string; participantId: string }[] | null
  >(null)

  useEffect(() => {
    setActiveUserGroups(
      groups.flatMap((group) => {
        const participantId = localStorage.getItem(`${group.id}-activeUser`)
        if (!participantId || participantId === 'None') return []
        return [{ groupId: group.id, participantId }]
      }),
    )
  }, [groups])

  // Wait until local storage has been read on the client.
  if (activeUserGroups === null) return null

  // Nothing to aggregate until the user has told us who they are in a group.
  if (activeUserGroups.length === 0) return null

  return <GlobalBalanceCard_ activeUserGroups={activeUserGroups} />
}

function GlobalBalanceCard_({
  activeUserGroups,
}: {
  activeUserGroups: { groupId: string; participantId: string }[]
}) {
  const locale = useLocale()
  const t = useTranslations('Groups.GlobalBalance')
  const { data, isLoading, isError, refetch } =
    trpc.groups.balances.forUser.useQuery({
      groups: activeUserGroups.slice(0, MAX_GROUPS_PER_QUERY),
    })

  if (isError) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>{t('loadError')}</p>
          <Button variant="secondary" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-40" />
        </CardContent>
      </Card>
    )
  }

  // Amounts from different currencies cannot be summed, so we aggregate them
  // into one bucket per currency.
  const byCurrency = new Map<string, CurrencyBalance>()
  for (const balance of data.balances) {
    const currency = getCurrencyFromGroup(balance)
    const key = currency.code || `custom:${currency.symbol}`
    const existing = byCurrency.get(key)
    if (existing) {
      existing.amount += balance.amount
    } else {
      byCurrency.set(key, { currency, amount: balance.amount })
    }
  }

  const currencyBalances = [...byCurrency.values()]
  const isSettledUp = currencyBalances.every(({ amount }) => amount === 0)

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isSettledUp ? (
          <p className="text-muted-foreground text-sm">{t('settledUp')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {currencyBalances.map(({ currency, amount }) => {
              if (amount === 0) return null
              const formatted = formatCurrency(
                currency,
                Math.abs(amount),
                locale,
              )
              return (
                <li
                  key={currency.code || currency.symbol}
                  className="flex justify-between items-baseline gap-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {amount > 0 ? t('owedToYou') : t('youOwe')}
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      amount > 0 ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {formatted}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
