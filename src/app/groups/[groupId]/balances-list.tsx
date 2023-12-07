import { Balances } from '@/lib/balances'
import { cn } from '@/lib/utils'
import { Participant } from '@prisma/client'

type Props = {
  balances: Balances
  participants: Participant[]
  currency: string
}

export function BalancesList({ balances, participants, currency }: Props) {
  const maxBalance = Math.max(
    ...Object.values(balances).map((b) => Math.abs(b.total)),
  )

  return (
    <div className="text-sm">
      {participants.map((participant) => (
        <div
          key={participant.id}
          className={cn(
            'flex',
            balances[participant.id]?.total > 0 || 'flex-row-reverse',
          )}
        >
          <div
            className={cn(
              'w-1/2 p-2',
              balances[participant.id]?.total > 0 && 'text-right',
            )}
          >
            {participant.name}
          </div>
          <div
            className={cn(
              'w-1/2 relative',
              balances[participant.id]?.total > 0 || 'text-right',
            )}
          >
            <div className="absolute inset-0 p-2 z-20">
              {currency} {(balances[participant.id]?.total ?? 0).toFixed(2)}
            </div>
            {balances[participant.id]?.total !== 0 && (
              <div
                className={cn(
                  'absolute top-1 h-7 z-10',
                  balances[participant.id]?.total > 0
                    ? 'bg-green-200 left-0 rounded-r-lg border border-green-300'
                    : 'bg-red-200 right-0 rounded-l-lg border  border-red-300',
                )}
                style={{
                  width:
                    (Math.abs(balances[participant.id]?.total ?? 0) /
                      maxBalance) *
                      100 +
                    '%',
                }}
              ></div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
