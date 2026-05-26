import { SpendingCharts } from '@/app/groups/[groupId]/stats/spending-charts'
import { Totals } from '@/app/groups/[groupId]/stats/totals'
import { useTranslations } from 'next-intl'

export function TotalsPageClient() {
  const t = useTranslations('Stats')

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold leading-7">
            {t('Totals.title')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('Totals.description')}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col space-y-4">
            <Totals />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold leading-7">
            {t('SpendingCharts.title')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('SpendingCharts.description')}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <SpendingCharts />
        </div>
      </section>
    </div>
  )
}
