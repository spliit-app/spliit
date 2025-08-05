'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  groupId: string
}

export function GroupTabs({ groupId }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const value =
    pathname.replace(/\/groups\/[^\/]+\/([^/]+).*/, '$1') || 'expenses'
  const router = useRouter()

  return (
    <Tabs
      value={value}
      className="[&>*]:border overflow-x-auto"
      onValueChange={(value) => {
        router.push(`/groups/${groupId}/${value}`)
      }}
    >
      <TabsList>
        <TabsTrigger value="expenses" data-testid="tab-expenses">{t('Expenses.title')}</TabsTrigger>
        <TabsTrigger value="balances" data-testid="tab-balances">{t('Balances.title')}</TabsTrigger>
        <TabsTrigger value="information" data-testid="tab-information">{t('Information.title')}</TabsTrigger>
        <TabsTrigger value="stats" data-testid="tab-stats">{t('Stats.title')}</TabsTrigger>
        <TabsTrigger value="activity" data-testid="tab-activity">{t('Activity.title')}</TabsTrigger>
        <TabsTrigger value="edit" data-testid="tab-edit">{t('Settings.title')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
