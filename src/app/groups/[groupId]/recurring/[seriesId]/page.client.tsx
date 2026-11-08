'use client'

import { useCurrentGroup } from '@/app/groups/[groupId]/current-group-context'
import { StopRecurringPopup } from '@/app/groups/[groupId]/recurring/stop-recurring-popup'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Locale } from '@/i18n/request'
import { useActiveUser } from '@/lib/hooks'
import {
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function RecurringSeriesPageClient({ seriesId }: { seriesId: string }) {
  const t = useTranslations()
  const locale = useLocale() as Locale
  const router = useRouter()
  const { groupId, group } = useCurrentGroup()
  const activeUserId = useActiveUser(groupId)
  const utils = trpc.useUtils()
  const { toast } = useToast()

  const { data } = trpc.groups.expenses.recurring.get.useQuery({
    groupId,
    seriesId,
  })
  const { mutateAsync: stopMutateAsync } =
    trpc.groups.expenses.recurring.stop.useMutation()

  const backLink = (
    <Button variant="link" className="self-start px-0 mb-2 h-auto" asChild>
      <Link href={`/groups/${groupId}/recurring`}>
        <ChevronLeft className="w-4 h-4 mr-1" />
        {t('Recurring.back')}
      </Link>
    </Button>
  )

  if (!data || !group) {
    return (
      <Card className="mb-4">
        <CardHeader>
          {backLink}
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
      </Card>
    )
  }

  const { current, occurrences } = data
  const currency = getCurrencyFromGroup(group)

  return (
    <Card className="mb-4">
      <CardHeader>
        {backLink}
        <CardTitle>{(current ?? occurrences[0]).title}</CardTitle>
        {current && (
          <CardDescription>
            {formatCurrency(currency, current.amount, locale)}
            {' · '}
            {t(
              `ExpenseForm.Expense.recurrenceRule.${current.recurrenceRule!.toLowerCase()}`,
            )}
            {' · '}
            {t.rich('Recurring.paidBy', {
              strong: (chunks) => <strong>{chunks}</strong>,
              paidBy: current.paidBy.name,
            })}
            {current.recurringExpenseLink && (
              <>
                <br />
                {t('Recurring.next', {
                  date: formatDateOnly(
                    current.recurringExpenseLink.nextExpenseDate,
                    locale,
                    { dateStyle: 'medium' },
                  ),
                })}
              </>
            )}
          </CardDescription>
        )}
        {current && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" asChild>
              <Link href={`/groups/${groupId}/expenses/${current.id}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                {t('Recurring.edit')}
              </Link>
            </Button>
            <StopRecurringPopup
              onStop={async () => {
                try {
                  await stopMutateAsync({
                    groupId,
                    expenseId: current.id,
                    participantId: activeUserId ?? undefined,
                  })
                } catch (err) {
                  console.error(err)
                  toast({
                    title: t('Recurring.StopPopup.ErrorToast.title'),
                    description: t(
                      'Recurring.StopPopup.ErrorToast.description',
                    ),
                    variant: 'destructive',
                  })
                  utils.groups.expenses.invalidate()
                  return
                }
                // The edit form takes its values once, from whatever is cached
                // when it mounts, so the stopped expense must not be served stale.
                utils.groups.expenses.get.reset({
                  groupId,
                  expenseId: current.id,
                })
                utils.groups.expenses.invalidate()
                utils.groups.stats.invalidate()
                router.push(`/groups/${groupId}/recurring`)
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 pb-4 sm:pb-6">
        <h3 className="px-6 pb-2 font-semibold">{t('Recurring.history')}</h3>
        <div className="flex flex-col">
          {occurrences.map((occurrence) => (
            <Link
              key={occurrence.id}
              href={`/groups/${groupId}/expenses/${occurrence.id}/edit`}
              data-testid="recurring-occurrence"
              className="flex justify-between items-center sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-3 text-sm hover:bg-accent gap-1"
            >
              <div className="flex-1">
                {formatDateOnly(occurrence.expenseDate, locale, {
                  dateStyle: 'medium',
                })}
                {occurrence.id === current?.id && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    ({t('Recurring.latest')})
                  </span>
                )}
              </div>
              <div className="tabular-nums whitespace-nowrap font-bold">
                {formatCurrency(currency, occurrence.amount, locale)}
              </div>
              <ChevronRight className="w-4 h-4 hidden sm:block text-primary" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
