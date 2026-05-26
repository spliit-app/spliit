'use client'
import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { getGroupExpensesAction } from '@/app/groups/[groupId]/expenses/expense-list-fetch-action'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import dayjs, { type Dayjs } from 'dayjs'
import { Receipt } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useDebounce } from 'use-debounce'
import { useCurrentGroup } from '../current-group-context'

const PAGE_SIZE = 20

type ExpensesType = NonNullable<
  Awaited<ReturnType<typeof getGroupExpensesAction>>
>

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

export function ExpenseList() {
  const { groupId, group } = useCurrentGroup()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText] = useDebounce(searchText, 300)

  const participants = group?.participants

  useEffect(() => {
    if (!participants) return

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

  return (
    <>
      <div className="border-b p-3">
        <SearchBar onValueChange={(value) => setSearchText(value)} />
      </div>
      <ExpenseListForSearch
        groupId={groupId}
        searchText={debouncedSearchText}
      />
    </>
  )
}

const ExpenseListForSearch = ({
  groupId,
  searchText,
}: {
  groupId: string
  searchText: string
}) => {
  const utils = trpc.useUtils()
  const { group } = useCurrentGroup()

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.expenses.invalidate()
  }, [utils])

  const t = useTranslations('Expenses')
  const { ref: loadingRef, inView } = useInView()

  const {
    data,
    isLoading: expensesAreLoading,
    fetchNextPage,
  } = trpc.groups.expenses.list.useInfiniteQuery(
    { groupId, limit: PAGE_SIZE, filter: searchText },
    { getNextPageParam: ({ nextCursor }) => nextCursor },
  )
  const expenses = data?.pages.flatMap((page) => page.expenses)
  const hasMore = data?.pages.at(-1)?.hasMore ?? false

  const isLoading = expensesAreLoading || !expenses || !group

  useEffect(() => {
    if (inView && hasMore && !isLoading) fetchNextPage()
  }, [fetchNextPage, hasMore, inView, isLoading])

  const groupedExpensesByDate = useMemo(
    () => (expenses ? getGroupedExpensesByDate(expenses) : {}),
    [expenses],
  )

  if (isLoading) return <ExpensesLoading />

  if (expenses.length === 0)
    return (
      <div className="px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Receipt className="h-5 w-5" />
        </div>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {t('noExpenses')}
        </p>
        {!searchText && (
          <Button asChild className="mt-5">
            <Link href={`/groups/${groupId}/expenses/create`}>
              {t('createFirst')}
            </Link>
          </Button>
        )}
      </div>
    )

  return (
    <>
      {Object.values(EXPENSE_GROUPS).map((expenseGroup: string) => {
        let groupExpenses = groupedExpensesByDate[expenseGroup]
        if (!groupExpenses || groupExpenses.length === 0) return null

        return (
          <div key={expenseGroup}>
            <div
              className={
                'text-muted-foreground text-xs pl-4 sm:pl-6 py-1.5 font-semibold uppercase tracking-wide sticky top-14 bg-card/95 backdrop-blur-sm border-b border-border/50'
              }
            >
              {t(`Groups.${expenseGroup}`)}
            </div>
            {groupExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currency={getCurrencyFromGroup(group)}
                groupId={groupId}
                participantCount={group.participants.length}
              />
            ))}
          </div>
        )
      })}
      {hasMore && <ExpensesLoading ref={loadingRef} />}
    </>
  )
}

const ExpensesLoading = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="py-2">
      <Skeleton className="mx-4 sm:mx-6 my-2 h-3 w-32 rounded-full" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-4 text-sm sm:mx-4 sm:rounded-lg"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-4/5 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </div>
          <div className="flex min-w-[6.5rem] shrink-0 flex-col items-end gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-3 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
})
ExpensesLoading.displayName = 'ExpensesLoading'
