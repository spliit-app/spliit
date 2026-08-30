/**
 * `/groups/[groupId]/expenses/[expenseId]/edit` -- which is what "viewing a
 * spending" means here, since expense cards navigate straight to the edit route
 * and there is no read-only expense page.
 *
 * `EditExpenseForm` fires three queries in parallel and renders nothing until
 * all three resolve, so the batch below is the whole critical path of that
 * screen.
 */
import { batched } from '../client'
import { LARGE_GROUP, expenseId, groupId, targetExpenseIndex } from '../config'
import type { Step } from '../harness'

const id = groupId(LARGE_GROUP)
// An expense in the middle of the group: addressed by primary key, so its
// position should not matter -- which is itself worth being able to see.
const target = expenseId(LARGE_GROUP, targetExpenseIndex)

export const viewExpense: Step[] = [
  {
    name: 'view-expense:edit-form',
    /**
     * Rows: the group's participants plus who the expense was paid for.
     * Categories are deliberately excluded -- that table is static reference
     * data seeded by migrations, so pinning its size here would turn "someone
     * added a category" into a performance failure. The bytes budget still
     * covers the category payload, which is the part that actually costs.
     */
    run: async () => {
      const [group, categories, expense] = await Promise.all([
        batched.groups.get.query({ groupId: id }),
        batched.categories.list.query(),
        batched.groups.expenses.get.query({ groupId: id, expenseId: target }),
      ])
      if (categories.categories.length === 0) {
        throw new Error(
          'categories.list returned nothing; is the database migrated?',
        )
      }
      return (
        (group.group?.participants.length ?? 0) + expense.expense.paidFor.length
      )
    },
  },
]
