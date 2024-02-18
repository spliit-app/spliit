'use client'
import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { getGroupExpenses } from '@/lib/api'
import { Participant } from '@prisma/client'
import dayjs, { type Dayjs } from 'dayjs'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type ExpensesType = Awaited<ReturnType<typeof getGroupExpenses>>

type Props = {
  expenses: ExpensesType
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

function getGroupedExpensesByDate(expenses: ExpensesType) {
  const today = dayjs()
  return expenses.reduce((result: { [key: string]: ExpensesType }, expense) => {
    const expenseGroup = getExpenseGroup(dayjs(expense.expenseDate), today)
    result[expenseGroup] = result[expenseGroup] ?? []
    result[expenseGroup].push(expense)
    return result
  }, {})
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

  const groupedExpensesByDate = useMemo(
    () => getGroupedExpensesByDate(expenses),
    [expenses],
  )

  return expenses.length > 0 ? (
    <>
      <SearchBar onChange={(e) => setSearchText(e.target.value)} />
      {Object.values(EXPENSE_GROUPS).map((expenseGroup: string) => {
        let groupExpenses = groupedExpensesByDate[expenseGroup]
        if (!groupExpenses) return null

        groupExpenses = groupExpenses.filter(({ title }) =>
          title.toLowerCase().includes(searchText.toLowerCase()),
        )

        if (groupExpenses.length === 0) return null

        return (
          <div key={expenseGroup}>
            <div
              className={
                'text-muted-foreground text-xs pl-4 sm:pl-6 py-1 font-semibold sticky top-16 bg-white dark:bg-[#1b1917]'
              }
            >
              {expenseGroup}
            </div>
            {groupExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currency={currency}
                groupId={groupId}
              />
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
