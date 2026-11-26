'use client'

import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchBar } from '@/components/ui/search-bar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EXPENSE_GROUPS,
  getGroupedExpensesByDate,
  getWeekStartsOn,
} from '@/lib/date-groups'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import dayjs from 'dayjs'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useDebounce } from 'use-debounce'
import { useCurrentGroup } from '../current-group-context'

const PAGE_SIZE = 20

type SortBy = 'date' | 'amount' | 'title' | 'createdAt'
type SortOrder = 'asc' | 'desc'

type ExpenseListOptions = {
  searchText: string
  sortBy: SortBy
  sortOrder: SortOrder
  dateFrom: string
  dateTo: string
}

export function ExpenseList() {
  const { groupId, group } = useCurrentGroup()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText] = useDebounce(searchText, 300)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
      <SearchBar
        maxLength={200}
        onValueChange={(value) => setSearchText(value)}
      />
      <ExpenseListControls
        sortBy={sortBy}
        sortOrder={sortOrder}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <ExpenseListForSearch
        groupId={groupId}
        options={{
          searchText: debouncedSearchText,
          sortBy,
          sortOrder,
          dateFrom,
          dateTo,
        }}
      />
    </>
  )
}

const ExpenseListControls = ({
  sortBy,
  sortOrder,
  dateFrom,
  dateTo,
  onSortByChange,
  onSortOrderChange,
  onDateFromChange,
  onDateToChange,
}: {
  sortBy: SortBy
  sortOrder: SortOrder
  dateFrom: string
  dateTo: string
  onSortByChange: (value: SortBy) => void
  onSortOrderChange: (value: SortOrder) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
}) => {
  const t = useTranslations('Expenses.Filters')
  const hasDateFilter = !!dateFrom || !!dateTo

  return (
    <div className="mx-4 sm:mx-6 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex gap-2 items-end sm:flex-1">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">{t('sortBy')}</label>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortByChange(value as SortBy)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t('Sort.date')}</SelectItem>
              <SelectItem value="amount">{t('Sort.amount')}</SelectItem>
              <SelectItem value="title">{t('Sort.title')}</SelectItem>
              <SelectItem value="createdAt">{t('Sort.createdAt')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          title={sortOrder === 'desc' ? t('descending') : t('ascending')}
          onClick={() =>
            onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')
          }
        >
          {sortOrder === 'desc' ? (
            <ArrowDownWideNarrow className="w-4 h-4" />
          ) : (
            <ArrowUpNarrowWide className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">
            {t('dateFrom')}
          </label>
          <Input
            type="date"
            className="h-9"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">{t('dateTo')}</label>
          <Input
            type="date"
            className="h-9"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </div>
        {hasDateFilter && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            title={t('clearDates')}
            onClick={() => {
              onDateFromChange('')
              onDateToChange('')
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

const ExpenseListForSearch = ({
  groupId,
  options: { searchText, sortBy, sortOrder, dateFrom, dateTo },
}: {
  groupId: string
  options: ExpenseListOptions
}) => {
  const utils = trpc.useUtils()
  const { group } = useCurrentGroup()

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.expenses.invalidate()
  }, [utils])

  const t = useTranslations('Expenses')
  const locale = useLocale()
  const weekStartsOn = getWeekStartsOn(locale)
  const { ref: loadingRef, inView } = useInView()

  const {
    data,
    isLoading: expensesAreLoading,
    fetchNextPage,
  } = trpc.groups.expenses.list.useInfiniteQuery(
    {
      groupId,
      limit: PAGE_SIZE,
      filter: searchText,
      sortBy,
      sortOrder,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { getNextPageParam: ({ nextCursor }) => nextCursor },
  )
  // Memoised so the bucketing below is only redone when a page arrives, not on
  // every render (a fresh `flatMap` array would defeat its `useMemo`).
  const expenses = useMemo(
    () => data?.pages.flatMap((page) => page.expenses),
    [data],
  )
  const hasMore = data?.pages.at(-1)?.hasMore ?? false

  const isLoading = expensesAreLoading || !expenses || !group

  useEffect(() => {
    if (inView && hasMore && !isLoading) fetchNextPage()
  }, [fetchNextPage, hasMore, inView, isLoading])

  const groupedExpensesByDate = useMemo(
    () =>
      expenses ? getGroupedExpensesByDate(expenses, dayjs(), weekStartsOn) : {},
    [expenses, weekStartsOn],
  )

  // The "This week / Last month / …" buckets only make sense when the list runs
  // from newest to oldest; any other sort is shown as a single flat list.
  const isGroupedByDate = sortBy === 'date' && sortOrder === 'desc'

  if (isLoading) return <ExpensesLoading />

  if (expenses.length === 0)
    return (
      <p className="px-6 text-sm py-6">
        {searchText || dateFrom || dateTo ? (
          t('Filters.noResults')
        ) : (
          <>
            {t('noExpenses')}{' '}
            <Button variant="link" asChild className="-m-4">
              <Link href={`/groups/${groupId}/expenses/create`}>
                {t('createFirst')}
              </Link>
            </Button>
          </>
        )}
      </p>
    )

  if (!isGroupedByDate)
    return (
      <>
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            currency={getCurrencyFromGroup(group)}
            groupId={groupId}
            participantCount={group.participants.length}
          />
        ))}
        {hasMore && <ExpensesLoading ref={loadingRef} />}
      </>
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
                'text-muted-foreground text-xs pl-4 sm:pl-6 py-1 font-semibold sticky top-16 bg-white dark:bg-[#1b1917]'
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
    <div ref={ref}>
      <Skeleton className="mx-4 sm:mx-6 mt-1 mb-2 h-3 w-32 rounded-full" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex justify-between items-start px-2 sm:px-6 py-4 text-sm gap-2"
        >
          <div className="flex-0 pl-2 pr-1">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
          <div className="flex-0 flex flex-col gap-2 items-end mr-2 sm:mr-12">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
})
ExpensesLoading.displayName = 'ExpensesLoading'
