import { Balances } from '@/lib/balances'
import { cn, formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useLocale } from 'next-intl'

type Props = {
  balances: Balances
  participants: Participant[]
  currency: string
}

export function BalancesList({ balances, participants, currency }: Props) {
  const locale = useLocale()
  const maxBalance = Math.max(
    ...Object.values(balances).map((b) => Math.abs(b.total)),
  )

  return (
    <div className="text-sm">
      {participants.map((participant) => {
        const balance = balances[participant.id]?.total ?? 0
        const isLeft = balance >= 0
        return (
          <div
            key={participant.id}
            className={cn('flex', isLeft || 'flex-row-reverse')}
          >
            <div className={cn('w-1/2 p-2', isLeft && 'text-right')}>
              {participant.name}
            </div>
            <div className={cn('w-1/2 relative', isLeft || 'text-right')}>
              <div className="absolute inset-0 p-2 z-20">
                {formatCurrency(currency, balance, locale)}
              </div>
              {balance !== 0 && (
                <div
                  className={cn(
                    'absolute top-1 h-7 z-10',
                    isLeft
                      ? 'bg-green-200 dark:bg-green-800 left-0 rounded-r-lg border border-green-300 dark:border-green-700'
                      : 'bg-red-200 dark:bg-red-800 right-0 rounded-l-lg border  border-red-300 dark:border-red-700',
                  )}
                  style={{
                    width: (Math.abs(balance) / maxBalance) * 100 + '%',
                  }}
                ></div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
