'use client'

import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { TagFilterButton } from '@/components/tag-filter-button'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EXPENSE_GROUPS,
  getGroupedExpensesByDate,
  getWeekStartsOn,
} from '@/lib/date-groups'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useDebounce } from 'use-debounce'
import { useCurrentGroup } from '../current-group-context'

const PAGE_SIZE = 20

export function ExpenseList() {
  const { groupId, group } = useCurrentGroup()
  const [searchText, setSearchText] = useState('')
  const [searchReset, setSearchReset] = useState(0)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [untagged, setUntagged] = useState(false)
  const { data: tagsData } = trpc.groups.tags.useQuery({ groupId })
  const tags = tagsData?.tags ?? []
  const clearFilters = () => {
    setSearchText('')
    setSearchReset((value) => value + 1)
    setTagIds([])
    setUntagged(false)
  }
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
      <div className="mx-4 flex items-center gap-2 sm:mx-6">
        <SearchBar
          key={searchReset}
          maxLength={200}
          containerClassName="mx-0 min-w-0 flex-1 sm:mx-0"
          onValueChange={(value) => setSearchText(value)}
        />
        <TagFilterButton
          tags={tags}
          value={tagIds}
          untagged={untagged}
          onValueChange={(ids, onlyUntagged) => {
            setTagIds(ids)
            setUntagged(onlyUntagged)
          }}
        />
      </div>
      <ExpenseListForSearch
        groupId={groupId}
        searchText={debouncedSearchText}
        tagIds={tagIds}
        untagged={untagged}
        onClearFilters={clearFilters}
      />
    </>
  )
}

const ExpenseListForSearch = ({
  groupId,
  searchText,
  tagIds,
  untagged,
  onClearFilters,
}: {
  groupId: string
  searchText: string
  tagIds: string[]
  untagged: boolean
  onClearFilters: () => void
}) => {
  const utils = trpc.useUtils()
  const { group } = useCurrentGroup()

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.expenses.invalidate()
    utils.groups.tags.invalidate()
  }, [utils])

  const t = useTranslations('Expenses')
  const tTags = useTranslations('Tags')
  const locale = useLocale()
  const weekStartsOn = getWeekStartsOn(locale)
  const { ref: loadingRef, inView } = useInView()

  const {
    data,
    isLoading: expensesAreLoading,
    fetchNextPage,
  } = trpc.groups.expenses.list.useInfiniteQuery(
    { groupId, limit: PAGE_SIZE, filter: searchText, tagIds, untagged },
    {
      getNextPageParam: ({ hasMore, nextCursor }) =>
        hasMore ? nextCursor : undefined,
    },
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

  if (isLoading) return <ExpensesLoading />

  if (expenses.length === 0 && (searchText || tagIds.length > 0 || untagged))
    return (
      <div className="px-6 py-6 text-sm">
        <p>{tTags('noResults')}</p>
        <Button
          type="button"
          variant="link"
          className="px-0"
          onClick={onClearFilters}
        >
          {tTags('clear')}
        </Button>
      </div>
    )

  if (expenses.length === 0)
    return (
      <p className="px-6 text-sm py-6">
        {t('noExpenses')}{' '}
        <Button variant="link" asChild className="-m-4">
          <Link href={`/groups/${groupId}/expenses/create`}>
            {t('createFirst')}
          </Link>
        </Button>
      </p>
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
