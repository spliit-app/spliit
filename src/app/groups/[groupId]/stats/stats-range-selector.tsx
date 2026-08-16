'use client'
import {
  STATS_PERIODS,
  StatsPeriod,
} from '@/app/groups/[groupId]/stats/stats-range'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

type Props = {
  period: StatsPeriod
  onPeriodChange: (period: StatsPeriod) => void
}

export function StatsRangeSelector({ period, onPeriodChange }: Props) {
  const t = useTranslations('Stats.range')

  return (
    <div className="mb-4 flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground">{t('label')}</span>
      <Select
        value={period}
        onValueChange={(value) => onPeriodChange(value as StatsPeriod)}
      >
        <SelectTrigger className="w-auto gap-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATS_PERIODS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
