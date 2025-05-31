'use client'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { getTotalsPerCategoryAndMonth } from './totals-per-category-and-month-actions'
import { useEffect, useMemo, useState } from 'react'

export function TotalsPerCategoryAndMonth({
  groupId = '',
}: {
  groupId: string
}) {
  const locale = useLocale()
  const t = useTranslations('Stats.Totals')
  const [expenses, setExpenses] = useState(new Map<string, number>());

  useEffect(() => {
    getTotalsPerCategoryAndMonth(groupId, new Date()).then((expensesFromServer) => {
      setExpenses(expensesFromServer);
      console.log(expensesFromServer)
    })
  }, [groupId]);

  return (
    <div>
      <div className="text-muted-foreground">{t('perCategoryAndMonth')}
        {
          Array.from(expenses.keys()).map(expenseCategory => {
            return (
              <>
                <div>
                  {expenseCategory} , {expenses.get(expenseCategory)}
                </div>
              </>
            );
          }
          )
        }
      </div>
    </div>
  )
}
