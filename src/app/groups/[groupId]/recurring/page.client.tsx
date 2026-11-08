import { RecurringList } from '@/app/groups/[groupId]/recurring/recurring-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslations } from 'next-intl'

export function RecurringPageClient() {
  const t = useTranslations('Recurring')

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-4 sm:pb-6">
        <RecurringList />
      </CardContent>
    </Card>
  )
}
