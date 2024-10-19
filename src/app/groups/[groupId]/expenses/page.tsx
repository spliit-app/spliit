import { cached } from '@/app/cached-functions'
import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { CreateFromReceiptButton } from '@/app/groups/[groupId]/expenses/create-from-receipt-button'
import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { Download, Plus } from 'lucide-react'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default async function GroupExpensesPage({
  params: { groupId },
}: {
  params: { groupId: string }
}) {
  const t = await getTranslations('Expenses')
  const group = await cached.getGroup(groupId)
  if (!group) notFound()

  const categories = await getCategories()

  return (
    <>
      <Card className="mb-4 rounded-none -mx-4 border-x-0 sm:border-x sm:rounded-lg sm:mx-0">
        <div className="flex flex-1">
          <CardHeader className="flex-1 p-4 sm:p-6">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardHeader className="p-4 sm:p-6 flex flex-row space-y-0 gap-2">
            <Button variant="secondary" size="icon" asChild>
              <Link
                prefetch={false}
                href={`/groups/${groupId}/expenses/export/json`}
                target="_blank"
                title={t('exportJson')}
              >
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            {env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT && (
              <CreateFromReceiptButton
                groupId={groupId}
                groupCurrency={group.currency}
                categories={categories}
              />
            )}
            <Button asChild size="icon">
              <Link
                href={`/groups/${groupId}/expenses/create`}
                title={t('create')}
              >
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
        </div>

        <CardContent className="p-0 pt-2 pb-4 sm:pb-6 flex flex-col gap-4 relative">
          <ExpenseList
            groupId={group.id}
            currency={group.currency}
            participants={group.participants}
          />
        </CardContent>
      </Card>

      <ActiveUserModal group={group} />
    </>
  )
}
