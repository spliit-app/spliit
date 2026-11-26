'use client'

import { Money } from '@/components/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { daysUntilDue, getPaymentDueNotifications } from '@/lib/payment-due'
import { useActiveParticipant } from '@/lib/use-active-participant'
import { cn, formatDateOnly, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { useLocale, useTranslations } from 'next-intl'
import { useCurrentGroup } from '../current-group-context'

/**
 * Settle-ups with a deadline.
 *
 * Notifications are computed here, in the browser, from the obligations the
 * server returned: the rules are pure (`@/lib/payment-due`), so there is no
 * delivery pipeline, no stored "seen" state and no way for a reminder to
 * disagree with the ledger.
 */
export function PaymentDuesCard() {
  const { groupId, group } = useCurrentGroup()
  const t = useTranslations('Balances.PaymentDues')
  const locale = useLocale()
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.groups.paymentDues.list.useQuery({ groupId })
  const activeUser = useActiveParticipant(groupId, group?.participants)

  const settle = trpc.groups.paymentDues.settle.useMutation({
    onSuccess: () => {
      utils.groups.paymentDues.invalidate()
      utils.groups.balances.invalidate()
      utils.account.notifications.invalidate()
    },
  })
  const cancel = trpc.groups.paymentDues.cancel.useMutation({
    onSuccess: () => {
      utils.groups.paymentDues.invalidate()
      utils.account.notifications.invalidate()
    },
  })

  const currency = group ? getCurrencyFromGroup(group) : undefined
  const participants = group?.participants ?? []
  const name = (participantId: string) =>
    participants.find(({ id }) => id === participantId)?.name ?? '?'

  // What the current participant should know about right now: overdue, due
  // today, and anything due within the reminder window.
  const notifications =
    activeUser && data
      ? getPaymentDueNotifications({
          dues: data.paymentDues,
          participantId: activeUser,
        })
      : []
  const overdueCount = notifications.filter(
    ({ kind }) => kind === 'OVERDUE',
  ).length

  const describeDue = (days: number) =>
    days < 0
      ? t('overdueBy', { days: Math.abs(days) })
      : days === 0
        ? t('dueToday')
        : t('dueSoon', { days })

  return (
    <Card className="mb-4" data-testid="payment-dues-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{t('title')}</CardTitle>
          {overdueCount > 0 ? (
            <Badge
              variant="destructive"
              data-testid="payment-due-overdue-badge"
            >
              {overdueCount}
            </Badge>
          ) : null}
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : data.paymentDues.length === 0 ? (
          <p className="text-sm pb-2">{t('empty')}</p>
        ) : (
          <div className="text-sm">
            {data.paymentDues.map((due) => {
              const isMine = due.fromParticipantId === activeUser
              const isOwedToMe = due.toParticipantId === activeUser
              const isPending = due.status === 'PENDING'
              const notification = notifications.find(
                ({ paymentDueId }) => paymentDueId === due.id,
              )
              return (
                <div
                  key={due.id}
                  data-testid="payment-due-row"
                  data-status={due.status}
                  className={cn(
                    'flex flex-col gap-1 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between',
                    notification?.kind === 'OVERDUE' && 'text-red-600',
                    isMine && 'font-medium',
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span>
                      {isOwedToMe && due.status === 'PENDING'
                        ? t('owesYou', { from: name(due.fromParticipantId) })
                        : isMine && due.status === 'PENDING'
                          ? t('youOwe', { to: name(due.toParticipantId) })
                          : `${name(due.fromParticipantId)} → ${name(due.toParticipantId)}`}
                      {' · '}
                      {currency ? (
                        <Money currency={currency} amount={due.amount} bold />
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateOnly(due.dueDate, locale, {
                        dateStyle: 'medium',
                      })}
                      {isPending
                        ? ` · ${describeDue(daysUntilDue(due.dueDate))}`
                        : ''}
                    </span>
                    {due.stale && isPending ? (
                      <span className="text-xs text-amber-600">
                        {t('stale')}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {due.status === 'SETTLED' ? (
                      <Badge variant="secondary">{t('settled')}</Badge>
                    ) : due.status === 'CANCELLED' ? (
                      <Badge variant="outline">{t('cancelled')}</Badge>
                    ) : due.status === 'SUPERSEDED' ? (
                      <Badge variant="outline">{t('superseded')}</Badge>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={settle.isPending}
                          onClick={() =>
                            settle.mutate({
                              groupId,
                              paymentDueId: due.id,
                              title: t('reimbursementTitle'),
                            })
                          }
                        >
                          {t('markAsPaid')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={cancel.isPending}
                          onClick={() =>
                            cancel.mutate({
                              groupId,
                              paymentDueId: due.id,
                            })
                          }
                        >
                          {t('cancel')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
