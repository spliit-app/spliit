'use client'
import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { getGroupExpensesAction } from '@/app/groups/[groupId]/expenses/expense-list-fetch-action'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeString } from '@/lib/utils'
import { Participant } from '@prisma/client'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'

type ExpensesType = NonNullable<
  Awaited<ReturnType<typeof getGroupExpensesAction>>
>

type Props = {
  expensesFirstPage: ExpensesType
  expenseCount: number
  participants: Participant[]
  currency: string
  groupId: string
}

const EXPENSE_GROUPS = {
  UPCOMING: 'upcoming',
  THIS_WEEK: 'thisWeek',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
  LAST_MONTH: 'lastMonth',
  EARLIER_THIS_YEAR: 'earlierThisYear',
  LAST_YEAR: 'lastYear',
  OLDER: 'older',
}

function getExpenseGroup(date: Dayjs, today: Dayjs) {
  if (today.isBefore(date)) {
    return EXPENSE_GROUPS.UPCOMING
  } else if (today.isSame(date, 'week')) {
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
  expensesFirstPage,
  expenseCount,
  currency,
  participants,
  groupId,
}: Props) {
  const firstLen = expensesFirstPage.length
  const [searchText, setSearchText] = useState('')
  const [dataIndex, setDataIndex] = useState(firstLen)
  const [dataLen, setDataLen] = useState(firstLen)
  const [hasMoreData, setHasMoreData] = useState(expenseCount > firstLen)
  const [isFetching, setIsFetching] = useState(false)
  const [expenses, setExpenses] = useState(expensesFirstPage)
  const { ref, inView } = useInView()
  const t = useTranslations('Expenses')

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

  useEffect(() => {
    const fetchNextPage = async () => {
      setIsFetching(true)

      const newExpenses = await getGroupExpensesAction(groupId, {
        offset: dataIndex,
        length: dataLen,
      })

      if (newExpenses !== null) {
        const exp = expenses.concat(newExpenses)
        setExpenses(exp)
        setHasMoreData(exp.length < expenseCount)
        setDataIndex(dataIndex + dataLen)
        setDataLen(Math.ceil(1.5 * dataLen))
      }

      setTimeout(() => setIsFetching(false), 500)
    }

    if (inView && hasMoreData && !isFetching) fetchNextPage()
  }, [
    dataIndex,
    dataLen,
    expenseCount,
    expenses,
    groupId,
    hasMoreData,
    inView,
    isFetching,
  ])

  const groupedExpensesByDate = useMemo(
    () => getGroupedExpensesByDate(expenses),
    [expenses],
  )

  return expenses.length > 0 ? (
    <>
      <SearchBar
        onValueChange={(value) => setSearchText(normalizeString(value))}
      />
      {Object.values(EXPENSE_GROUPS).map((expenseGroup: string) => {
        let groupExpenses = groupedExpensesByDate[expenseGroup]
        if (!groupExpenses) return null

        groupExpenses = groupExpenses.filter(({ title }) =>
          normalizeString(title).includes(searchText),
        )

        if (groupExpenses.length === 0) return null

        return (
          <div key={expenseGroup}>
            <div
              className={
                'text-muted-foreground text-xs pl-4 sm:pl-6 py-1 font-semibold sticky top-16 bg-white dark:bg-[#1b1917]'
              }
            >
              {t(`Groups.${expenseGroup}`)}
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
      {expenses.length < expenseCount &&
        [0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-t flex justify-between items-center px-6 py-4 text-sm"
            ref={i === 0 ? ref : undefined}
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
        ))}
    </>
  ) : (
    <p className="px-6 text-sm py-6">
      {t('noExpenses')}{' '}
      <Button variant="link" asChild className="-m-4">
        <Link href={`/groups/${groupId}/expenses/create`}>
          {t('createFirst')}
        </Link>
      </Button>
    </p>
  )
}
