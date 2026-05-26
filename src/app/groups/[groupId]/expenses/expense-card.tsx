'use client'
import { ActiveUserBalance } from '@/app/groups/[groupId]/expenses/active-user-balance'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { DocumentsCount } from '@/app/groups/[groupId]/expenses/documents-count'
import { getGroupExpenses } from '@/lib/api'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency, formatDateOnly } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Fragment } from 'react'

type Expense = Awaited<ReturnType<typeof getGroupExpenses>>[number]

function Participants({
  expense,
  participantCount,
}: {
  expense: Expense
  participantCount: number
}) {
  const t = useTranslations('ExpenseCard')
  const key = expense.amount > 0 ? 'paidBy' : 'receivedBy'
  const paidFor =
    expense.paidFor.length == participantCount && participantCount >= 4 ? (
      <strong>{t('everyone')}</strong>
    ) : (
      expense.paidFor.map((paidFor, index) => (
        <Fragment key={index}>
          {index !== 0 && <>, </>}
          <strong>{paidFor.participant.name}</strong>
        </Fragment>
      ))
    )

  const participants = t.rich(key, {
    strong: (chunks) => <strong>{chunks}</strong>,
    paidBy: expense.paidBy.name,
    paidFor: () => paidFor,
    forCount: expense.paidFor.length,
  })
  return <>{participants}</>
}

type Props = {
  expense: Expense
  currency: Currency
  groupId: string
  participantCount: number
}

export function ExpenseCard({
  expense,
  currency,
  groupId,
  participantCount,
}: Props) {
  const locale = useLocale()
  const href = `/groups/${groupId}/expenses/${expense.id}/edit`
  const isIncome = expense.amount < 0

  return (
    <Link
      href={href}
      key={expense.id}
      className={cn(
        'group flex items-stretch gap-3 px-4 py-4 text-sm transition-colors touch-manipulation hover:bg-accent/70 active:bg-accent sm:mx-4 sm:rounded-lg sm:px-4',
        expense.isReimbursement && 'italic',
      )}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground group-hover:border-primary/30 group-hover:text-primary">
        <CategoryIcon category={expense.category} className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'mb-1 truncate font-medium leading-5 text-foreground',
            expense.isReimbursement && 'italic',
          )}
        >
          {expense.title}
        </div>
        <div className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <Participants expense={expense} participantCount={participantCount} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          <ActiveUserBalance {...{ groupId, currency, expense }} />
        </div>
      </div>

      <div className="flex min-w-[6.5rem] shrink-0 flex-col items-end justify-between gap-1 text-right">
        <div
          className={cn(
            'tabular-nums whitespace-nowrap text-sm font-semibold leading-5',
            isIncome && 'text-emerald-700 dark:text-emerald-300',
            expense.isReimbursement &&
              'italic font-medium text-muted-foreground',
          )}
        >
          {formatCurrency(currency, expense.amount, locale)}
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateOnly(expense.expenseDate, locale, { dateStyle: 'medium' })}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DocumentsCount count={expense._count.documents} />
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}
