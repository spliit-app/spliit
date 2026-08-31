/**
 * `/groups/[groupId]/expenses` and the Balances tab, against the large group.
 *
 * `first-page` mirrors what the page actually issues on mount: the layout's
 * `groups.get` and the list's `groups.expenses.list` at PAGE_SIZE, batched
 * together (src/app/groups/[groupId]/expenses/expense-list.tsx).
 *
 * The other three steps each target a query shape that is cheap on a small
 * group and progressively less so on a large one:
 *
 * - `deep-page`  offset pagination (`nextCursor = cursor + limit`) against an
 *   `orderBy` that has no matching index.
 * - `search`     `title: { contains, mode: 'insensitive' }`, i.e. an unindexed
 *   scan of the group's expenses.
 * - `balances`   `getGroupExpenses(groupId)` with no `take` at all -- the whole
 *   group is loaded to compute balances in JS.
 */
import { batched, single } from '../client'
import {
  LARGE_GROUP,
  SEARCH_TOKEN,
  config,
  deepPageOffset,
  groupId,
} from '../config'
import type { Step } from '../harness'

const id = groupId(LARGE_GROUP)

export const viewGroup: Step[] = [
  {
    name: 'view-group:first-page',
    /** Rows: the group's participants plus the first page of expenses. */
    run: async () => {
      const [group, expenses] = await Promise.all([
        batched.groups.get.query({ groupId: id }),
        batched.groups.expenses.list.query({
          groupId: id,
          cursor: 0,
          limit: config.pageSize,
        }),
      ])
      return (group.group?.participants.length ?? 0) + expenses.expenses.length
    },
  },
  {
    name: 'view-group:deep-page',
    /** Rows: one page of expenses, fetched from halfway down the list. */
    run: async () => {
      const expenses = await single.groups.expenses.list.query({
        groupId: id,
        cursor: deepPageOffset,
        limit: config.pageSize,
      })
      return expenses.expenses.length
    },
  },
  {
    name: 'view-group:search',
    /** Rows: one page of matches for a token seeded into every 10th expense. */
    run: async () => {
      const expenses = await single.groups.expenses.list.query({
        groupId: id,
        cursor: 0,
        limit: config.pageSize,
        filter: SEARCH_TOKEN,
      })
      return expenses.expenses.length
    },
  },
  {
    name: 'view-group:balances',
    /** Rows: balances plus suggested reimbursements. */
    run: async () => {
      const result = await single.groups.balances.list.query({ groupId: id })
      return Object.keys(result.balances).length + result.reimbursements.length
    },
  },
]
