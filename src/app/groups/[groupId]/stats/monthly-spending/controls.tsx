'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ChartBarStacked, ChartColumnStacked } from 'lucide-react'
import { MonthlySpendingChartType } from './category-utils'

export function ChartTypeToggle({
  chartType,
  onChartTypeChange,
  t,
}: {
  chartType: MonthlySpendingChartType
  onChartTypeChange: (chartType: MonthlySpendingChartType) => void
  t: (key: string) => string
}) {
  return (
    <div
      aria-label={t('chartTypeLabel')}
      className="inline-flex h-8 shrink-0 rounded-md border border-input bg-background"
      role="group"
    >
      <Button
        aria-label={t('ChartTypes.bars')}
        aria-pressed={chartType === 'bars'}
        className={cn(
          'h-7 w-8 rounded-r-none border-0 px-2',
          chartType === 'bars' && 'bg-accent text-accent-foreground',
        )}
        onClick={() => onChartTypeChange('bars')}
        title={t('ChartTypes.bars')}
        type="button"
        variant="ghost"
      >
        <ChartBarStacked className="h-4 w-4" />
      </Button>
      <Button
        aria-label={t('ChartTypes.columns')}
        aria-pressed={chartType === 'columns'}
        className={cn(
          'h-7 w-8 rounded-l-none border-0 px-2',
          chartType === 'columns' && 'bg-accent text-accent-foreground',
        )}
        onClick={() => onChartTypeChange('columns')}
        title={t('ChartTypes.columns')}
        type="button"
        variant="ghost"
      >
        <ChartColumnStacked className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function RoundAmountsToggle({
  checked,
  onCheckedChange,
  t,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  t: (key: string) => string
}) {
  return (
    <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input px-2 text-xs text-muted-foreground">
      <Checkbox
        className="h-3.5 w-3.5"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span>{t('roundAmountsLabel')}</span>
    </label>
  )
}
