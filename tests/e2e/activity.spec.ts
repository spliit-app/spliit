import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { navigateToGroup, navigateToTab } from '../helpers'
import {
  createExpenseViaAPI,
  createExpensesViaAPI,
  createGroupViaAPI,
} from '../helpers/batch-api'

test('View activity page', async ({ page }) => {
  // Setup: Create group with 3 participants and immediately create an expense
  // (if group has no activity, the page shows empty state which doesn't have activity-list testid)
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `activity test ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  // Create an expense so activity list will be populated
  await createExpenseViaAPI(page, groupId, {
    title: 'Activity Test Expense',
    amount: 1000,
    payerName: 'Alice',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Navigate to Activity tab
  await navigateToTab(page, 'Activity')

  // Verify Activity page loads with correct heading
  const activityHeading = page.getByRole('heading', {
    name: 'Activity',
    exact: true,
  })
  await expect(activityHeading).toBeVisible()

  // Since we created an expense, activity-list should be visible (not empty state)
  const activityListWrapper = page.getByTestId('activity-list')
  await expect(activityListWrapper).toBeVisible()

  // Verify the test expense appears in the list
  await expect(page.getByText('Activity Test Expense')).toBeVisible()
})

test('Log shows create', async ({ page }) => {
  // Setup: Create group with 2 participants and expense
  const groupName = `activity create ${randomId(4)}`
  const expenseTitle = `Test Expense ${randomId(4)}`

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

  await createExpenseViaAPI(page, groupId, {
    title: expenseTitle,
    amount: 2500,
    payerName: 'Alice',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Navigate to Activity tab
  await navigateToTab(page, 'Activity')

  // Verify activity list wrapper is visible
  const activityListWrapper = page.getByTestId('activity-list')
  await expect(activityListWrapper).toBeVisible()

  // Verify expense title appears in activity
  await expect(page.getByText(expenseTitle)).toBeVisible()

  // Verify "created" action text appears in activity (e.g., "Alice created Test Expense")
  await expect(page.getByText(/created/i)).toBeVisible()
})

test('Log shows update', async ({ page }) => {
  // Setup: Create group and expense
  const groupName = `activity update ${randomId(4)}`
  const expenseTitle = `Update Test Expense ${randomId(4)}`
  const updatedTitle = `Updated Expense ${randomId(4)}`
  const updatedAmount = '50.00'

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

  const expenseId = await createExpenseViaAPI(page, groupId, {
    title: expenseTitle,
    amount: 3000,
    payerName: 'Alice',
  })

  // Navigate to group page
  await navigateToGroup(page, groupId)

  // Wait for the exact expense row to be visible and clickable. Matching by
  // title alone is flaky while the route shell is rendering.
  const expenseRow = page.getByTestId(`expense-item-${expenseId}`)
  await expect(expenseRow).toBeVisible()

  // Click on the expense to open edit page
  await Promise.all([
    page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/),
    expenseRow.click(),
  ])

  // Update the expense title
  const titleInput = page.locator('input[name="title"]')
  await expect(titleInput).toBeVisible()
  await titleInput.clear()
  await titleInput.fill(updatedTitle)

  // Update the amount
  const amountInput = page.locator('input[name="amount"]')
  await expect(amountInput).toBeVisible()
  await amountInput.clear()
  await amountInput.fill(updatedAmount)

  // Submit the form using semantic role selector
  const submitButton = page.getByRole('button', { name: /save|update/i })
  await expect(submitButton).toBeVisible()
  await submitButton.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

  // Navigate to Activity tab to verify update was logged
  // Note: After editing and saving, ensure we're on the expenses page first
  await navigateToTab(page, 'Activity')

  // Wait for updated expense title to appear in activity
  await expect(page.getByText(updatedTitle)).toBeVisible()

  // Verify "updated" or "edit" action text appears (e.g., "Alice updated Updated Expense")
  await expect(page.getByText(/updated|edit/i)).toBeVisible()
})

test('Log shows delete', async ({ page }) => {
  // Setup: Create group and expense
  const groupName = `activity delete ${randomId(4)}`
  const expenseTitle = `Delete Test Expense ${randomId(4)}`

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

  const expenseId = await createExpenseViaAPI(page, groupId, {
    title: expenseTitle,
    amount: 4000,
    payerName: 'Bob',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Click on the expense to open edit page
  const expenseRow = page.getByTestId(`expense-item-${expenseId}`)
  await expect(expenseRow).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/),
    expenseRow.click(),
  ])

  // Click delete button
  const deleteButton = page.getByRole('button', { name: /delete/i })
  await expect(deleteButton).toBeVisible()
  await deleteButton.click()

  // Verify confirmation dialog appears - wait for the dialog heading with "delete"
  const deleteDialogTitle = page
    .getByRole('heading')
    .filter({ hasText: /delete/i })
  await expect(deleteDialogTitle).toBeVisible()

  // Click confirm delete button using the button with "Yes" text
  const confirmButton = page.getByRole('button', { name: /yes/i })
  await expect(confirmButton).toBeVisible()
  await confirmButton.click()

  // Wait for navigation back to group page
  await page.waitForURL(/\/groups\/[^/]+/)

  // Verify expense is no longer visible in the main list
  await expect(page.getByText(expenseTitle)).not.toBeVisible()

  // Navigate to Activity tab to verify delete was logged
  await navigateToTab(page, 'Activity')

  // Verify delete action text appears in activity
  // The activity list component renders the delete activity with the word "deleted"
  const deleteActivity = page.getByText(/deleted/i)
  await expect(deleteActivity).toBeVisible()
})

test('Log pagination', async ({ page }) => {
  // Setup: Create group and many expenses to trigger pagination
  const groupName = `activity pagination ${randomId(4)}`
  const numExpenses = 25

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

  // Create 25 expenses via API to populate activity log
  const createdExpenses = await createExpensesViaAPI(page, groupId, numExpenses)
  expect(createdExpenses).toHaveLength(numExpenses)

  // Navigate to group page
  await navigateToGroup(page, groupId)

  // Navigate to Activity tab
  await navigateToTab(page, 'Activity')

  // Verify activity list is loaded
  const activityListWrapper = page.getByTestId('activity-list')
  await expect(activityListWrapper).toBeVisible()

  // Verify the most recent expense appears (last in array)
  await expect(
    page.getByText(`Expense “Expense ${numExpenses}” created`),
  ).toBeVisible()

  // Scroll down to trigger infinite scroll pagination
  await page.mouse.wheel(0, 1000)
  await expect(page.locator('.animate-pulse').first()).toBeVisible()

  // Verify all created expenses are loaded after scrolling
  for (let i = 1; i <= numExpenses; i++) {
    await expect(page.getByText(`Expense “Expense ${i}” created`)).toBeVisible()
  }
})
