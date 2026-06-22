import { expect, test } from '@playwright/test'
import {
  createExpense,
  openExpenseForEdit,
  verifyExpenseRecurrence,
} from '../helpers/expense'
import { createGroup, navigateToGroup } from '../helpers'
import { randomId } from '@/lib/api'

test.describe('Recurring Expense Creation', () => {
  test('Create daily recurring expense', async ({ page }) => {
    const groupId = await createGroup({
      page,
      groupName: `daily recurring ${randomId(4)}`,
      participants: ['Alice', 'Bob'],
    })

    const expenseTitle = `Daily Recurring ${randomId(4)}`

    await createExpense(page, {
      title: expenseTitle,
      amount: '25.00',
      payer: 'Alice',
      recurrence: 'Daily',
    })

    // Verify expense was created and is visible
    await navigateToGroup(page, groupId)
    await expect(page.getByText(expenseTitle)).toBeVisible()

    // Verify recurrence is set correctly in the edit form
    await openExpenseForEdit(page, expenseTitle)
    await verifyExpenseRecurrence(page, 'Daily')
  })

  test('Create weekly recurring expense', async ({ page }) => {
    const groupId = await createGroup({
      page,
      groupName: `weekly recurring ${randomId(4)}`,
      participants: ['Alice', 'Bob'],
    })

    const expenseTitle = `Weekly Recurring ${randomId(4)}`

    await createExpense(page, {
      title: expenseTitle,
      amount: '50.00',
      payer: 'Bob',
      recurrence: 'Weekly',
    })

    // Verify expense was created and is visible
    await navigateToGroup(page, groupId)
    await expect(page.getByText(expenseTitle)).toBeVisible()

    // Verify recurrence is set correctly in the edit form
    await openExpenseForEdit(page, expenseTitle)
    await verifyExpenseRecurrence(page, 'Weekly')
  })

  test('Create monthly recurring expense', async ({ page }) => {
    const groupId = await createGroup({
      page,
      groupName: `monthly recurring ${randomId(4)}`,
      participants: ['Alice', 'Bob', 'Charlie'],
    })

    const expenseTitle = `Monthly Recurring ${randomId(4)}`

    await createExpense(page, {
      title: expenseTitle,
      amount: '100.00',
      payer: 'Charlie',
      recurrence: 'Monthly',
    })

    // Verify expense was created and is visible
    await navigateToGroup(page, groupId)
    await expect(page.getByText(expenseTitle)).toBeVisible()

    // Verify recurrence is set correctly in the edit form
    await openExpenseForEdit(page, expenseTitle)
    await verifyExpenseRecurrence(page, 'Monthly')
  })
})
