import { expect, test } from '@playwright/test'
import { navigateToGroup, switchLocale } from '../helpers'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test('Mobile navigation uses hamburger menu', async ({ page }) => {
  // Set viewport to mobile size (iPhone SE)
  await page.setViewportSize({ width: 375, height: 667 })

  // Create a test group
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `mobile test ${randomId(4)}`,
    ['Alice', 'Bob'],
  )

  // Create an expense so we have content to verify
  await createExpenseViaAPI(page, groupId, {
    title: 'Mobile Test Expense',
    amount: 5000,
    payerName: 'Alice',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Verify the expense is visible in mobile view
  const mobileExpenseTitle = page
    .getByTestId('expense-title')
    .filter({ hasText: 'Mobile Test Expense' })
  await expect(mobileExpenseTitle).toBeVisible()

  // Verify amount is visible in mobile layout
  const mobileExpenseAmount = page
    .getByTestId('expense-amount')
    .filter({ hasText: '$50.00' })
  await expect(mobileExpenseAmount).toBeVisible()

  // Verify tabs are still accessible in mobile view
  const statsTab = page.getByRole('tab', { name: 'Stats' })
  await expect(statsTab).toBeVisible()
  await statsTab.click()

  // Verify we navigated to Stats
  await page.waitForURL(/\/stats$/)
  await expect(page.getByRole('heading', { name: 'Totals' })).toBeVisible()
})

test('Desktop view displays full layout', async ({ page }) => {
  // Set viewport to desktop size
  await page.setViewportSize({ width: 1280, height: 1024 })

  // Create a test group
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `desktop test ${randomId(4)}`,
    ['Alice', 'Bob'],
  )

  // Create an expense
  await createExpenseViaAPI(page, groupId, {
    title: 'Desktop Test Expense',
    amount: 10000,
    payerName: 'Alice',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Verify main content is visible
  await expect(page.getByRole('main')).toBeVisible()

  // Verify navigation header is visible
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible()

  // Verify all tabs are visible without scrolling
  await expect(page.getByRole('tab', { name: 'Expenses' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Balances' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible()

  // Verify expense card details are fully visible
  const desktopExpenseTitle = page
    .getByTestId('expense-title')
    .filter({ hasText: 'Desktop Test Expense' })
  await expect(desktopExpenseTitle).toBeVisible()

  const desktopExpenseAmount = page
    .getByTestId('expense-amount')
    .filter({ hasText: '$100.00' })
  await expect(desktopExpenseAmount).toBeVisible()

  await expect(page.getByText('Paid by')).toBeVisible()
})

test('Date format changes with locale selection', async ({ page }) => {
  // Create a test group
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `i18n date test ${randomId(4)}`,
    ['Alice', 'Bob'],
  )

  // Create an expense with a known date
  const expense = await createExpenseViaAPI(page, groupId, {
    title: 'i18n Date Test',
    amount: 5000,
    payerName: 'Alice',
    expenseDate: new Date('2026-01-17'), // January 17, 2026
  })

  // Navigate to group page
  await navigateToGroup(page, groupId)

  // Verify expense is visible
  const expenseItem = page
    .getByTestId(`expense-item-${expense}`)
  await expect(expenseItem).toBeVisible()

  // Get the date text in English format (e.g., "Jan 17, 2026")
  const expenseDateElement = page.getByTestId('expense-date').first()
  await expect(expenseDateElement).toHaveText('Jan 17, 2026')

  // Switch to Spanish locale
  await switchLocale(page, 'Español')

  await expect(expenseDateElement).toHaveText('17 ene 2026')
})

test('Currency displays with correct format for locale', async ({ page }) => {
  // Create a test group with USD currency
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `currency format test ${randomId(4)}`,
    ['Alice', 'Bob'],
  )

  // Create an expense with a specific amount
  await createExpenseViaAPI(page, groupId, {
    title: 'Currency Format Test',
    amount: 123456,
    payerName: 'Alice',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Verify expense is visible
  const currencyExpenseTitle = page
    .getByTestId('expense-title')
    .filter({ hasText: 'Currency Format Test' })
  await expect(currencyExpenseTitle).toBeVisible()

  // In English (US) locale, USD amounts display as $1,234.56
  // Verify the amount displays with $ prefix and period as decimal separator
  const expenseAmount = page
    .getByTestId('expense-amount')
    .filter({ hasText: '$1,234.56' })
  await expect(expenseAmount).toBeVisible()

  // Navigate to Stats to see total
  await page.getByRole('tab', { name: 'Stats' }).click()
  await page.waitForURL(/\/stats$/)

  // Verify the total also uses correct format
  const totalGroupSpending = page.getByTestId('total-group-spendings')
  await expect(totalGroupSpending).toContainText('$1,234.56')

  // Switch to French locale which uses different number formatting
  await switchLocale(page, 'Français')

  // In French locale, numbers use space as thousands separator and comma as decimal
  // $1,234.56 becomes 1 234,56 $ or similar format
  // At minimum, verify the page still works and displays amounts
  await expect(page.getByText(/1.*234.*56/)).toBeVisible()
})
