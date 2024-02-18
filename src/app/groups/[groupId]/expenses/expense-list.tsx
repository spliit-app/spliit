'use client'
import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { getGroupExpenses } from '@/lib/api'
import { Participant } from '@prisma/client'
import dayjs, { type Dayjs } from 'dayjs'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'

type ExpensesType = Awaited<ReturnType<typeof getGroupExpenses>>

type Props = {
  expensesFirstPage: ExpensesType
  expenseCount: number
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

async function fetchExpenses(
  groupId: string,
  offset: number,
  length: number,
): Promise<ExpensesType> {
  const resp = await fetch(
    `/api/groups/${groupId}/expenses?offset=${offset}&length=${length}`,
  )

  const expenses = resp.ok && ((await resp.json()) as ExpensesType)
  if (expenses === false) throw 'internal error'

  expenses.forEach((e) => {
    e.createdAt = new Date(e.createdAt)
    e.expenseDate = new Date(e.expenseDate)
  })
  return expenses
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

      try {
        const newExpenses = expenses.concat(
          await fetchExpenses(groupId, dataIndex, dataLen),
        )
        setExpenses(newExpenses)
        setHasMoreData(newExpenses.length < expenseCount)
        setDataIndex(dataIndex + dataLen)
        setDataLen(Math.ceil(1.5 * dataLen))
      } catch {}

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
      Your group doesn’t contain any expense yet.{' '}
      <Button variant="link" asChild className="-m-4">
        <Link href={`/groups/${groupId}/expenses/create`}>
          Create the first one
        </Link>
      </Button>
    </p>
  )
}
