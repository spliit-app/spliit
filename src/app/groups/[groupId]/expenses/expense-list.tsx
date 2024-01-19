'use client'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { getGroupExpenses } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Expense, Participant } from '@prisma/client'
import dayjs, { type Dayjs } from 'dayjs'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'

type Props = {
  expenses: Awaited<ReturnType<typeof getGroupExpenses>>
  participants: Participant[]
  currency: string
  groupId: string
}

const EXPENSE_GROUPS = {
  THIS_WEEK: 'This week',
  EARLIER_THIS_MONTH: 'Earlier this month',
  LAST_MONTH: 'Last month',
  EARLIER_THIS_YEAR: 'Earlier this year',
  LAST_YEAR: 'Last year',
  OLDER: 'Older',
}

function getExpenseGroup(date: Dayjs, today: Dayjs) {
  if (today.isSame(date, 'week')) {
    return EXPENSE_GROUPS.THIS_WEEK
  } else if (today.isSame(date, 'month')) {
    return EXPENSE_GROUPS.EARLIER_THIS_MONTH
  } else if (today.subtract(1, 'month').isSame(date, 'month')) {
    return EXPENSE_GROUPS.LAST_MONTH
  } else if (today.isSame(date, 'year')) {
    return EXPENSE_GROUPS.EARLIER_THIS_YEAR
  } else if (today.subtract(1, 'year').isSame(date, 'year')) {
    return EXPENSE_GROUPS.LAST_YEAR
  } else {
    return EXPENSE_GROUPS.OLDER
  }
}

function getGroupedExpensesByDate(
  expenses: Awaited<ReturnType<typeof getGroupExpenses>>,
) {
  const today = dayjs()
  return expenses.reduce(
    (result: { [key: string]: Expense[] }, expense: Expense) => {
      const expenseGroup = getExpenseGroup(dayjs(expense.expenseDate), today)
      result[expenseGroup] = result[expenseGroup] ?? []
      result[expenseGroup].push(expense)
      return result
    },
    {},
  )
}

export function ExpenseList({
  expenses,
  currency,
  participants,
  groupId,
}: Props) {
  const [searchText, setSearchText] = useState('')
  useEffect(() => {
    const activeUser = localStorage.getItem('newGroup-activeUser')
    const newUser = localStorage.getItem(`${groupId}-newUser`)
    if (activeUser || newUser) {
      localStorage.removeItem('newGroup-activeUser')
      localStorage.removeItem(`${groupId}-newUser`)
      if (activeUser === 'None') {
        localStorage.setItem(`${groupId}-activeUser`, 'None')
      } else {
        const userId = participants.find(
          (p) => p.name === (activeUser || newUser),
        )?.id
        if (userId) {
          localStorage.setItem(`${groupId}-activeUser`, userId)
        }
      }
    }
  }, [groupId, participants])

  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  const router = useRouter()

  const groupedExpensesByDate = getGroupedExpensesByDate(expenses)
  return expenses.length > 0 ? (
    <>
      <SearchBar onChange={(e) => setSearchText(e.target.value)} />
      {Object.values(EXPENSE_GROUPS).map((expenseGroup: string) => {
        const groupExpenses = groupedExpensesByDate[expenseGroup]
        if (!groupExpenses) return null
        return (
          <div key={expenseGroup}>
            <div
              className={
                'text-muted-foreground text-xs pl-4 sm:pl-6 py-1 font-semibold sticky top-16 bg-white dark:bg-[#1b1917]'
              }
            >
              {expenseGroup}
            </div>
            {groupExpenses
              .filter(
                (exp) =>
                  exp.title.toLowerCase().match(searchText.toLowerCase()) !==
                  null,
              )
              .map((expense: any) => (
                <div
                  key={expense.id}
                  className={cn(
                    'flex justify-between sm:mx-6 px-4 sm:rounded-lg sm:pr-2 sm:pl-4 py-4 text-sm cursor-pointer hover:bg-accent gap-1 items-stretch',
                    expense.isReimbursement && 'italic',
                  )}
                  onClick={() => {
                    router.push(
                      `/groups/${groupId}/expenses/${expense.id}/edit`,
                    )
                  }}
                >
                  <CategoryIcon
                    category={expense.category}
                    className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground"
                  />
                  <div className="flex-1">
                    <div
                      className={cn(
                        'mb-1',
                        expense.isReimbursement && 'italic',
                      )}
                    >
                      {expense.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Paid by{' '}
                      <strong>{getParticipant(expense.paidById)?.name}</strong>{' '}
                      for{' '}
                      {expense.paidFor.map((paidFor: any, index: number) => (
                        <Fragment key={index}>
                          {index !== 0 && <>, </>}
                          <strong>
                            {
                              participants.find(
                                (p) => p.id === paidFor.participantId,
                              )?.name
                            }
                          </strong>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between items-end">
                    <div
                      className={cn(
                        'tabular-nums whitespace-nowrap',
                        expense.isReimbursement ? 'italic' : 'font-bold',
                      )}
                    >
                      {currency} {(expense.amount / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(expense.expenseDate)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="link"
                    className="self-center hidden sm:flex"
                    asChild
                  >
                    <Link
                      href={`/groups/${groupId}/expenses/${expense.id}/edit`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              ))}
          </div>
        )
      })}
    </>
  ) : (
    <p className="px-6 text-sm py-6">
      Your group doesn’t contain any expense yet.{' '}
      <Button variant="link" asChild className="-m-4">
        <Link href={`/groups/${groupId}/expenses/create`}>
          Create the first one
        </Link>
      </Button>
    </p>
  )
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  })
}
