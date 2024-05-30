import { formatCurrency } from '@/lib/utils'

type Props = {
  totalGroupSpendings: number
  currency: string
}

export function TotalsGroupSpending({ totalGroupSpendings, currency }: Props) {
  const balance = totalGroupSpendings < 0 ? 'earnings' : 'spendings'
  return (
    <div>
      <div className="text-muted-foreground">Total group {balance}</div>
      <div className="text-lg">
        {formatCurrency(currency, Math.abs(totalGroupSpendings))}
      </div>
    </div>
  )
}
