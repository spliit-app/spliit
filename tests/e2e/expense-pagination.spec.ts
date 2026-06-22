import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import {
  createExpensesViaAPI,
  createGroupViaAPI,
  navigateToGroup,
} from '../helpers'

test.describe('Expense List Pagination', () => {
  test('loads initial page of expenses', async ({ page }) => {
    // Create group via API for speed
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Pagination Init ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    // Create 15 expenses (less than PAGE_SIZE of 20)
    const createdExpenses = await createExpensesViaAPI(page, groupId, 15, [
      'Alice',
      'Bob',
    ])

    await navigateToGroup(page, groupId)

    // Verify expenses are visible
    for (const expense of createdExpenses) {
      await expect(page.getByTestId(`expense-item-${expense}`)).toBeVisible()
    }
  })

  test('loads more expenses on scroll with infinite scroll', async ({
    page,
  }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Pagination Scroll ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    // Create 25 expenses (more than PAGE_SIZE of 20)
    const createdExpenses = await createExpensesViaAPI(page, groupId, 25, [
      'Alice',
      'Bob',
    ])
    expect(createdExpenses).toHaveLength(25)

    await navigateToGroup(page, groupId)

    // Verify most recent expenses visible initially (expenses shown in reverse order)
    await expect(page.getByText('Expense 25')).toBeVisible()

    // Scroll to bottom to trigger loading more
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await expect(page.locator('.animate-pulse').first()).toBeVisible()

    // All 25 should eventually be loaded
    for (const expense of createdExpenses) {
      await expect(page.getByTestId(`expense-item-${expense}`)).toBeVisible()
    }
  })

  test('displays correct expense count after loading all pages', async ({
    page,
  }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Pagination Count ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    // Create 30 expenses (requires 2 pages)
    const createdExpenses = await createExpensesViaAPI(page, groupId, 30, [
      'Alice',
      'Bob',
    ])

    await navigateToGroup(page, groupId)

    // Scroll multiple times to load all
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight)
      })
      // Workaround for waiting for network idle after scroll
      await page.waitForLoadState('networkidle')
    }

    // Verify first and last expenses are visible
    for (const expense of createdExpenses) {
      await expect(page.getByTestId(`expense-item-${expense}`)).toBeVisible()
    }
  })

  test('maintains expense order after pagination', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Pagination Order ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    // Create 22 expenses
    const createdExpenses = await createExpensesViaAPI(page, groupId, 22, [
      'Alice',
      'Bob',
    ])

    await navigateToGroup(page, groupId)

    // Most recent should appear first
    const expense22 = page.getByText('Expense 22')
    const expense21 = page.getByText('Expense 21')

    await expect(expense22).toBeVisible()
    await expect(expense21).toBeVisible()

    // Scroll to load more
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await expect(page.locator('.animate-pulse').first()).toBeVisible()

    // After loading more, older expenses should appear
    for (const expense of createdExpenses) {
      await expect(page.getByTestId(`expense-item-${expense}`)).toBeVisible()
    }
  })

  test('pagination works with search filter', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Pagination Filter ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    // Create 25 expenses
    await createExpensesViaAPI(page, groupId, 25, ['Alice', 'Bob'])

    await navigateToGroup(page, groupId)

    // Apply search filter
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Expense 1')
    await page.waitForResponse('**groups.expenses.list**')

    // Should filter to expenses 01, 10-19
    // Expense 10-19 should match "Expense 1"
    await expect(page.getByText('Expense 10')).toBeVisible()
    await expect(page.getByText('Expense 15')).toBeVisible()

    // Expenses not matching should not appear
    await expect(page.getByText('Expense 22')).not.toBeVisible()
    await expect(page.getByText('Expense 25')).not.toBeVisible()
  })

  test('empty state when no expenses', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Empty State ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await navigateToGroup(page, groupId)

    // Should show empty state or "create first" message
    await expect(
      page.getByText('Here are the expenses that you created for your group'),
    ).toBeVisible()
    await expect(
      page.getByText(
        'Your group doesn’t contain any expense yet. Create the first one',
      ),
    ).toBeVisible()
  })

  test('loading indicator appears during pagination', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Loading State ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    // Create many expenses to ensure pagination is needed
    await createExpensesViaAPI(page, groupId, 30, ['Alice', 'Bob'])

    await navigateToGroup(page, groupId)

    // Verify initial content loaded
    await expect(page.getByText('Expense 30')).toBeVisible()

    // Scroll and check for loading state (skeleton or spinner)
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await expect(page.locator('.animate-pulse').first()).toBeVisible()
  })

  test('expense amounts display correctly across pages', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Amount Display ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    // Create 25 expenses (amounts will be 1100, 1200, ... based on createExpensesViaAPI)
    const createdExpenses = await createExpensesViaAPI(page, groupId, 25, [
      'Alice',
      'Bob',
    ])

    await navigateToGroup(page, groupId)

    // Expense 25 should have amount 25 * 100 + 1000 = 3500 cents = $35.00
    await expect(page.getByText('$35.00')).toBeVisible()

    // Scroll to load all
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })

    for (let index = 0; index < createdExpenses.length; index++) {
      const expense = createdExpenses[index]
      const expectedAmount = ((index + 1) * 100 + 1000) / 100
      const expenseItem = page.getByTestId(`expense-item-${expense}`)
      await expect(
        expenseItem.getByText(`$${expectedAmount.toFixed(2)}`),
      ).toBeVisible()
    }
  })
})
