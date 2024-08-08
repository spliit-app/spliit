import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  totalGroupSpendings: number
  currency: string
}

export function TotalsGroupSpending({ totalGroupSpendings, currency }: Props) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')
  const balance = totalGroupSpendings < 0 ? 'groupEarnings' : 'groupSpendings'
  return (
    <div>
      <div className="text-muted-foreground">{t(balance)}</div>
      <div className="text-lg">
        {formatCurrency(currency, Math.abs(totalGroupSpendings), locale)}
      </div>
    </div>
  )
}
