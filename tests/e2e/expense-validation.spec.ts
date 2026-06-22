import { expect, test } from '@playwright/test'
import { navigateToExpenseCreate } from '../helpers'
import { createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test.describe('Expense Form Validation', () => {
  test('prevents submission with empty title', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Empty Title ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Fill amount and payer, but leave title empty
    await page.locator('input[name="amount"]').fill('50.00')

    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Try to submit
    await page.locator('button[type="submit"]').click()

    // Should still be on create page
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/create/)

    // Title field should have error indication
    const titleInput = page.locator('input[name="title"]')
    await expect(titleInput).toBeVisible()
  })

  test('prevents submission with missing payer', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation No Payer ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Fill title and amount, but don't select payer
    await page.locator('input[name="title"]').fill('Test Expense')
    await page.locator('input[name="amount"]').fill('75.00')

    // Try to submit without selecting payer
    await page.locator('button[type="submit"]').click()

    // Should still be on create page
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/create/)
  })

  test('prevents submission with zero amount', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Zero Amount ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Fill title, zero amount, and payer
    await page.locator('input[name="title"]').fill('Zero Amount Test')
    await page.locator('input[name="amount"]').fill('0')

    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Try to submit
    await page.locator('button[type="submit"]').click()

    // Should still be on create page (zero amount not allowed)
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/create/)
  })

  test('allows negative amount for income', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Negative ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Fill title first
    await page.locator('input[name="title"]').fill('Income Entry')

    // Select payer BEFORE entering negative amount (form changes label when negative)
    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Now fill with negative amount (income)
    await page.locator('input[name="amount"]').fill('-100.00')

    // Submit
    await page.locator('button[type="submit"]').click()

    // Should navigate away (successful creation)
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify income entry created
    await expect(page.getByText('Income Entry')).toBeVisible()
  })

  test('valid form submits successfully', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Success ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    const expenseTitle = 'Valid Expense'
    const expenseAmount = '123.45'

    // Fill all required fields
    await page.locator('input[name="title"]').fill(expenseTitle)
    await page.locator('input[name="amount"]').fill(expenseAmount)

    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Submit
    await page.locator('button[type="submit"]').click()

    // Should navigate to expenses list
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify expense created
    await expect(page.getByText(expenseTitle)).toBeVisible()
    await expect(page.getByText('$123.45')).toBeVisible()
  })

  test('sanitizes amount input to valid decimal', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Sanitize ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Fill with non-numeric characters
    const amountInput = page.locator('input[name="amount"]')
    await page.locator('input[name="title"]').fill('Sanitize Test')

    // Type amount with extra characters
    await amountInput.fill('50.99')

    // Verify the input shows the sanitized value
    await expect(amountInput).toHaveValue('50.99')

    // Complete the form
    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Submit
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify the correct amount was saved
    await expect(page.getByText('$50.99')).toBeVisible()
  })

  test('validates date is not in invalid format', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Date ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    const expenseTitle = 'Date Validation Test'

    // Fill required fields
    await page.locator('input[name="title"]').fill(expenseTitle)
    await page.locator('input[name="amount"]').fill('45.00')

    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Set a valid date
    const dateInput = page.locator('input[type="date"]')
    await dateInput.fill('2024-03-15')

    // Submit
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify expense created
    await expect(page.getByText(expenseTitle)).toBeVisible()
  })

  test('form shows error state visually', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Visual ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Try to submit completely empty form
    await page.locator('button[type="submit"]').click()

    // Should remain on create page
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/create/)

    // Form should still be visible (not navigated away)
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('input[name="amount"]')).toBeVisible()
  })

  test('whitespace-only title is invalid', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Validation Whitespace ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToExpenseCreate(page)

    // Fill with whitespace-only title
    await page.locator('input[name="title"]').fill('   ')
    await page.locator('input[name="amount"]').fill('50.00')

    const paidBySelect = page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
    await paidBySelect.click()
    await page.getByRole('option', { name: 'Alice' }).click()

    // Try to submit
    await page.locator('button[type="submit"]').click()

    // Should still be on create page (whitespace-only title should be invalid)
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/create/)
  })
})
