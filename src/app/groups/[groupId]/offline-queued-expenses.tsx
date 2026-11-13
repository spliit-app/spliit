'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Locale } from '@/i18n/request'
import {
  isOfflineQueueSupported,
  listQueuedExpenses,
  QueuedExpense,
  removeQueuedExpense,
  subscribeOfflineQueue,
} from '@/lib/offline-queue'
import {
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { CloudOff } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useCurrentGroup } from './current-group-context'

/** This group's expenses waiting in the offline queue, kept current. */
export function useQueuedExpenses(groupId: string) {
  const [items, setItems] = useState<QueuedExpense[]>([])
  useEffect(() => {
    if (!isOfflineQueueSupported()) return
    let active = true
    const load = () =>
      listQueuedExpenses(groupId)
        .then((next) => {
          if (active) setItems(next)
        })
        .catch(() => {})
    load()
    const unsubscribe = subscribeOfflineQueue(load)
    return () => {
      active = false
      unsubscribe()
    }
  }, [groupId])
  return items
}

export function OfflineQueuedExpenses() {
  const { groupId, group } = useCurrentGroup()
  const items = useQueuedExpenses(groupId)
  const locale = useLocale() as Locale
  const t = useTranslations('Offline')

  if (!group || items.length === 0) return null
  const currency = getCurrencyFromGroup(group)

  return (
    <div>
      {items.map((item) => {
        const values = item.expenseFormValues
        const amount = values.amount
        const kind = item.lastError?.kind
        return (
          <div
            key={item.expenseId}
            className="flex justify-between sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-4 text-sm gap-1 items-stretch opacity-80"
          >
            <CloudOff
              className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground"
              aria-hidden
            />
            <div className="flex-1">
              <div className="mb-1">{values.title}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{t('waiting')}</Badge>
                {kind === 'server' && (
                  <>
                    <span className="text-destructive">{t('failed')}</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => removeQueuedExpense(item.expenseId)}
                    >
                      {t('discard')}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-between items-end">
              <div
                className={
                  values.isReimbursement
                    ? 'tabular-nums whitespace-nowrap italic'
                    : 'tabular-nums whitespace-nowrap font-bold'
                }
              >
                {formatCurrency(currency, amount, locale)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateOnly(values.expenseDate, locale, {
                  dateStyle: 'medium',
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
