'use client'
import {
  STATS_PERIODS,
  StatsPeriod,
  StatsRange,
} from '@/app/groups/[groupId]/stats/stats-range'
import { Input } from '@/components/ui/input'
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
  customRange: StatsRange
  onPeriodChange: (period: StatsPeriod) => void
  onCustomRangeChange: (range: StatsRange) => void
}

export function StatsRangeSelector({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: Props) {
  const t = useTranslations('Stats.range')

  return (
    <div className="mb-4 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
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
      {period === 'custom' && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('from')}</span>
            <Input
              className="date-base w-auto"
              type="date"
              max={customRange.to || undefined}
              value={customRange.from ?? ''}
              onChange={(event) =>
                onCustomRangeChange({
                  ...customRange,
                  from: event.target.value || undefined,
                })
              }
              aria-label={t('from')}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('to')}</span>
            <Input
              className="date-base w-auto"
              type="date"
              min={customRange.from || undefined}
              value={customRange.to ?? ''}
              onChange={(event) =>
                onCustomRangeChange({
                  ...customRange,
                  to: event.target.value || undefined,
                })
              }
              aria-label={t('to')}
            />
          </label>
        </div>
      )}
    </div>
  )
}
