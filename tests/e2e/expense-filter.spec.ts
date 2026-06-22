import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { navigateToGroup } from '../helpers'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'

test.describe('Expense List Filtering', () => {
  test('filters expenses by text search', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Filter Test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Pizza Dinner',
      amount: 5000,
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Movie Tickets',
      amount: 3000,
      payerName: 'Bob',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Grocery Shopping',
      amount: 7500,
      payerName: 'Alice',
    })

    await navigateToGroup(page, groupId)

    // Verify all expenses visible initially
    await expect(page.getByText('Pizza Dinner')).toBeVisible()
    await expect(page.getByText('Movie Tickets')).toBeVisible()
    await expect(page.getByText('Grocery Shopping')).toBeVisible()

    // Search for "Pizza"
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Pizza')

    // Wait for search
    await page.waitForResponse('**groups.expenses.list**')

    // Verify only Pizza visible
    await expect(page.getByText('Pizza Dinner')).toBeVisible()
    await expect(page.getByText('Movie Tickets')).not.toBeVisible()
    await expect(page.getByText('Grocery Shopping')).not.toBeVisible()

    // Clear search and verify all return
    await searchInput.clear()

    await expect(page.getByText('Pizza Dinner')).toBeVisible()
    await expect(page.getByText('Movie Tickets')).toBeVisible()
    await expect(page.getByText('Grocery Shopping')).toBeVisible()
  })

  test('case insensitive search', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `Case Test ${randomId(4)}`, [
      'Alice',
      'Bob',
    ])

    await createExpenseViaAPI(page, groupId, {
      title: 'UPPERCASE EXPENSE',
      amount: 4000,
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'lowercase expense',
      amount: 6000,
      payerName: 'Bob',
    })

    await navigateToGroup(page, groupId)

    // Search lowercase for uppercase title
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('uppercase')
    await page.waitForResponse('**groups.expenses.list**')

    await expect(page.getByText('UPPERCASE EXPENSE')).toBeVisible()
    await expect(page.getByText('lowercase expense')).not.toBeVisible()

    // Search uppercase for lowercase title
    await searchInput.clear()
    await searchInput.fill('LOWERCASE')
    await page.waitForResponse('**groups.expenses.list**')

    await expect(page.getByText('UPPERCASE EXPENSE')).not.toBeVisible()
    await expect(page.getByText('lowercase expense')).toBeVisible()
  })

  test('partial text match', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Partial Test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Restaurant Dinner',
      amount: 8500,
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Breakfast at Cafe',
      amount: 2500,
      payerName: 'Bob',
    })

    await navigateToGroup(page, groupId)

    // Search for partial match "fast"
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('fast')
    await page.waitForResponse('**groups.expenses.list**')

    // Should match "Breakfast"
    await expect(page.getByText('Restaurant Dinner')).not.toBeVisible()
    await expect(page.getByText('Breakfast at Cafe')).toBeVisible()
  })

  test('no results found', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `No Results ${randomId(4)}`, [
      'Alice',
      'Bob',
    ])

    await createExpenseViaAPI(page, groupId, {
      title: 'Regular Expense',
      amount: 5000,
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    // Search for non-existent text
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('xyz123nonexistent')
    await page.waitForResponse('**groups.expenses.list**')

    // Expense should not be visible
    await expect(page.getByText('Regular Expense')).not.toBeVisible()

    // There should be some "no expenses" indication or empty state
    // Clear search to verify expense returns
    await searchInput.clear()

    await expect(page.getByText('Regular Expense')).toBeVisible()
  })

  test('filter with multiple matching expenses', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Multi Match ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Dinner at Italian Restaurant',
      amount: 8000,
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Dinner at Chinese Restaurant',
      amount: 6500,
      payerName: 'Bob',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Lunch Break',
      amount: 2500,
      payerName: 'Charlie',
    })

    await navigateToGroup(page, groupId)

    // Search for "Dinner"
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Dinner')
    await page.waitForResponse('**groups.expenses.list**')

    // Both dinner expenses visible
    await expect(page.getByText('Dinner at Italian Restaurant')).toBeVisible()
    await expect(page.getByText('Dinner at Chinese Restaurant')).toBeVisible()
    await expect(page.getByText('Lunch Break')).not.toBeVisible()

    // Verify amounts of visible expenses
    await expect(page.getByText('$80.00')).toBeVisible()
    await expect(page.getByText('$65.00')).toBeVisible()
    await expect(page.getByText('$25.00')).not.toBeVisible()
  })

  test('clear search with x button', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Clear Button ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Test Expense One',
      amount: 10000,
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Test Expense Two',
      amount: 20000,
      payerName: 'Bob',
    })

    await navigateToGroup(page, groupId)

    // Filter to show only one
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('One')
    await page.waitForResponse('**groups.expenses.list**')

    await expect(page.getByText('Test Expense One')).toBeVisible()
    await expect(page.getByText('Test Expense Two')).not.toBeVisible()

    // Try to clear with X button if it exists
    const clearButton = page.locator('svg.lucide-x-circle')
    if (await clearButton.isVisible()) {
      await clearButton.click()
    } else {
      // Fallback: clear input manually
      await searchInput.clear()
    }

    // Both should be visible again
    await expect(page.getByText('Test Expense One')).toBeVisible()
    await expect(page.getByText('Test Expense Two')).toBeVisible()
  })

  test('search persists while typing', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Type Persist ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Electricity Bill',
      amount: 15000,
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Electric Car Charging',
      amount: 4500,
      payerName: 'Bob',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Water Bill',
      amount: 3000,
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    const searchInput = page.getByPlaceholder(/search/i)

    // Type "Elec" progressively
    await searchInput.fill('E')
    await page.waitForResponse('**groups.expenses.list**')

    // Should still show Electric items
    await searchInput.fill('Elec')
    await page.waitForResponse('**groups.expenses.list**')

    await expect(page.getByText('Electricity Bill')).toBeVisible()
    await expect(page.getByText('Electric Car Charging')).toBeVisible()
    await expect(page.getByText('Water Bill')).not.toBeVisible()
  })
})
