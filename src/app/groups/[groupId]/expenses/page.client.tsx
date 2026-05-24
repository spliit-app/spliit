'use client'

import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { CreateFromReceiptButton } from '@/app/groups/[groupId]/expenses/create-from-receipt-button'
import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import ExportButton from '@/app/groups/[groupId]/export-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCurrentGroup } from '../current-group-context'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default function GroupExpensesPageClient({
  enableReceiptExtract,
}: {
  enableReceiptExtract: boolean
}) {
  const t = useTranslations('Expenses')
  const { groupId } = useCurrentGroup()

  return (
    <>
      <Card className="mb-4 rounded-none -mx-4 border-x-0 sm:border-x sm:rounded-lg sm:mx-0">
        <div className="flex flex-1">
          <CardHeader className="flex-1 p-4 sm:p-6">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardHeader className="p-4 sm:p-6 flex flex-row space-y-0 gap-2 items-start">
            <ExportButton groupId={groupId} />
            {enableReceiptExtract && <CreateFromReceiptButton />}
            {/* Add expense button — visible on desktop only; FAB handles mobile */}
            <Button asChild size="icon" className="hidden sm:flex">
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
          <ExpenseList />
        </CardContent>
      </Card>

      {/* Floating action button — mobile only, sits above bottom nav */}
      <Button
        asChild
        size="icon"
        className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-lg"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <Link href={`/groups/${groupId}/expenses/create`} title={t('create')}>
          <Plus className="w-6 h-6" />
        </Link>
      </Button>

      <ActiveUserModal groupId={groupId} />
    </>
  )
}
