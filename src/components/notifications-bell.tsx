'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { authClient } from '@/lib/auth-client'
import { countUnreadNotifications } from '@/lib/payment-due'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { Bell } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

/**
 * Settle-up reminders across every group the signed-in user is part of.
 *
 * The rules and the ordering come from `@/lib/payment-due` (the same code the
 * group page uses), so the badge and the list can never disagree.
 */
export function NotificationsBell() {
  const t = useTranslations('Notifications')
  const locale = useLocale()
  const { data: session } = authClient.useSession()
  const { data } = trpc.account.notifications.useQuery(undefined, {
    enabled: !!session,
  })

  // Signed out: nothing to be reminded about, and nothing to explain.
  if (!session) return null

  const notifications = data?.notifications ?? []
  const unread = countUnreadNotifications(notifications)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative -my-3"
          aria-label={t('label')}
          data-testid="notifications-bell"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none"
              data-testid="notifications-badge"
            >
              {unread}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-medium">
          {t('title')}
        </div>
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <ul className="max-h-80 overflow-auto">
            {notifications.map((notification) => (
              <li key={notification.paymentDueId}>
                <Link
                  href={`/groups/${notification.groupId}/balances`}
                  className="flex flex-col gap-0.5 px-3 py-2 text-sm hover:bg-accent"
                  data-testid="notification-item"
                >
                  <span
                    className={
                      notification.daysUntilDue < 0 ? 'text-red-600' : ''
                    }
                  >
                    {notification.role === 'debtor'
                      ? t('youOwe', {
                          name: notification.counterpartName,
                          amount: formatCurrency(
                            getCurrencyFromGroup({
                              currency: notification.currency,
                              currencyCode: notification.currencyCode,
                            }),
                            notification.amount,
                            locale,
                          ),
                        })
                      : t('owesYou', {
                          name: notification.counterpartName,
                          amount: formatCurrency(
                            getCurrencyFromGroup({
                              currency: notification.currency,
                              currencyCode: notification.currencyCode,
                            }),
                            notification.amount,
                            locale,
                          ),
                        })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {notification.groupName}
                    {' · '}
                    {notification.daysUntilDue < 0
                      ? t('overdueBy', {
                          days: Math.abs(notification.daysUntilDue),
                        })
                      : notification.daysUntilDue === 0
                        ? t('dueToday')
                        : t('dueSoon', { days: notification.daysUntilDue })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
