'use client'

import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { CreateFromReceiptButton } from '@/app/groups/[groupId]/expenses/create-from-receipt-button'
import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import ExportButton from '@/app/groups/[groupId]/export-button'
import { Button } from '@/components/ui/button'
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
      <section className="mb-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-7">{t('title')}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <ExportButton groupId={groupId} />
            {enableReceiptExtract && <CreateFromReceiptButton />}
            <Button asChild size="icon" className="hidden sm:flex">
              <Link
                href={`/groups/${groupId}/expenses/create`}
                title={t('create')}
              >
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card pb-4">
          <ExpenseList />
        </div>
      </section>

      <Button
        asChild
        size="icon"
        className="sm:hidden fixed right-4 z-40 w-14 h-14 rounded-full shadow-lg"
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
