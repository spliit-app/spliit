'use client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Currency } from '@/lib/currency'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { ReactNode } from 'react'

export type DialogExpense = {
  id: string
  title: string
  amount: number
  expenseDate: Date
}

type Props = {
  open: boolean
  onClose: () => void
  groupId: string
  currency: Currency
  title: ReactNode
  description: ReactNode
  emptyText: string
  expenses?: DialogExpense[]
  isLoading: boolean
}

/**
 * Shared drill-down dialog for the stats cards: lists individual expenses with
 * a link to each one. The caller owns the data-fetching (which stats slice the
 * list comes from) and passes the header content; this component only renders
 * the list, loading and empty states.
 */
export function ExpensesDialog({
  open,
  onClose,
  groupId,
  currency,
  title,
  description,
  emptyText,
  expenses,
  isLoading,
}: Props) {
  const locale = useLocale()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[80vh] gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1.5 border-b p-6">
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          {isLoading || !expenses ? (
            <div className="flex flex-col gap-3 p-6">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-5 w-full" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            <ul className="divide-y">
              {expenses.map((expense) => (
                <li key={expense.id}>
                  <Link
                    href={`/groups/${groupId}/expenses/${expense.id}/edit`}
                    className="flex items-center justify-between gap-2 px-6 py-3 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate">{expense.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateOnly(expense.expenseDate, locale, {
                          dateStyle: 'medium',
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-bold tabular-nums">
                        {formatCurrency(currency, expense.amount, locale)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
