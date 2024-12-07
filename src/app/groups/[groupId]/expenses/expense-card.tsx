'use client'
import { ActiveUserBalance } from '@/app/groups/[groupId]/expenses/active-user-balance'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { DocumentsCount } from '@/app/groups/[groupId]/expenses/documents-count'
import { Button } from '@/components/ui/button'
import { getGroupExpenses } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'

type Expense = Awaited<ReturnType<typeof getGroupExpenses>>[number]

function Participants({ expense }: { expense: Expense }) {
  const t = useTranslations('ExpenseCard')
  const key = expense.amount > 0 ? 'paidBy' : 'receivedBy'
  const paidFor = expense.paidFor.map((paidFor, index) => (
    <Fragment key={index}>
      {index !== 0 && <>, </>}
      <strong>{paidFor.participant.name}</strong>
    </Fragment>
  ))
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
  currency: string
  groupId: string
}

export function ExpenseCard({ expense, currency, groupId }: Props) {
  const router = useRouter()
  const locale = useLocale()

  return (
    <div
      key={expense.id}
      className={cn(
        'flex justify-between sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-4 text-sm cursor-pointer hover:bg-accent gap-1 items-stretch',
        expense.isReimbursement && 'italic',
      )}
      onClick={() => {
        router.push(`/groups/${groupId}/expenses/${expense.id}/edit`)
      }}
    >
      <CategoryIcon
        category={expense.category}
        className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground"
      />
      <div className="flex-1">
        <div className={cn('mb-1', expense.isReimbursement && 'italic')}>
          {expense.title}
        </div>
        <div className="text-xs text-muted-foreground">
          <Participants expense={expense} />
        </div>
        <div className="text-xs text-muted-foreground">
          <ActiveUserBalance {...{ groupId, currency, expense }} />
        </div>
      </div>
      <div className="flex flex-col justify-between items-end">
        <div
          className={cn(
            'tabular-nums whitespace-nowrap',
            expense.isReimbursement ? 'italic' : 'font-bold',
          )}
        >
          {formatCurrency(currency, expense.amount, locale)}
        </div>
        <div className="text-xs text-muted-foreground">
          <DocumentsCount count={expense._count.documents} />
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(expense.expenseDate, locale, { dateStyle: 'medium' })}
        </div>
      </div>
      <Button
        size="icon"
        variant="link"
        className="self-center hidden sm:flex"
        asChild
      >
        <Link href={`/groups/${groupId}/expenses/${expense.id}/edit`}>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  )
}
