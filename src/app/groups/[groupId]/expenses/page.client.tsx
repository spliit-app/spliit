'use client'

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
import { Download, Plus } from 'lucide-react'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default function GroupExpensesPageClient({
  groupId,
  enableReceiptExtract,
}: {
  groupId: string
  enableReceiptExtract: boolean
}) {
  const t = useTranslations('Expenses')

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
            {enableReceiptExtract && (
              <CreateFromReceiptButton groupId={groupId} />
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
          <ExpenseList groupId={groupId} />
        </CardContent>
      </Card>

      <ActiveUserModal groupId={groupId} />
    </>
  )
}
