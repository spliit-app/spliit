'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Locale } from '@/i18n/request'
import { getCurrency } from '@/lib/currency'
import {
  cn,
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCurrentGroup } from '../current-group-context'

export function RecurringList() {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const { groupId, group } = useCurrentGroup()
  const { data } = trpc.groups.expenses.recurring.list.useQuery({
    groupId,
  })

  if (!data || !group) {
    return (
      <div className="flex flex-col gap-4 px-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (data.series.length === 0) {
    return <p className="px-6 text-sm py-6">{t('Recurring.noRecurring')}</p>
  }

  const currency = getCurrencyFromGroup(group)

  return (
    <div className="flex flex-col">
      {data.series.map((expense) => (
        <Link
          key={expense.id}
          href={`/groups/${groupId}/recurring/${expense.recurringSeriesId ?? expense.id}`}
          data-testid="recurring-series"
          className={cn(
            'flex justify-between sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-4 text-sm hover:bg-accent gap-1 items-stretch',
            expense.isReimbursement && 'italic',
          )}
        >
          <div className="flex-1">
            <div className="mb-1">{expense.title}</div>
            <div className="text-xs text-muted-foreground">
              {t(
                `ExpenseForm.Expense.recurrenceRule.${expense.recurrenceRule!.toLowerCase()}`,
              )}
              {' · '}
              {t.rich('Recurring.paidBy', {
                strong: (chunks) => <strong>{chunks}</strong>,
                paidBy: expense.paidBy.name,
              })}
            </div>
          </div>
          <div className="flex flex-col justify-between items-end">
            <div
              className={cn(
                'tabular-nums whitespace-nowrap',
                expense.isReimbursement ? 'italic' : 'font-bold',
              )}
            >
              {formatCurrency(currency, expense.amount, locale)}
            </div>
            {expense.originalAmount != null &&
              expense.originalCurrency &&
              expense.originalCurrency !== currency.code && (
                <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatCurrency(
                    getCurrency(expense.originalCurrency, locale),
                    expense.originalAmount,
                    locale,
                  )}
                </div>
              )}
            {expense.recurringExpenseLink && (
              <div className="text-xs text-muted-foreground">
                {t('Recurring.next', {
                  date: formatDateOnly(
                    expense.recurringExpenseLink.nextExpenseDate,
                    locale,
                    { dateStyle: 'medium' },
                  ),
                })}
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 self-center hidden sm:block text-primary" />
        </Link>
      ))}
    </div>
  )
}
