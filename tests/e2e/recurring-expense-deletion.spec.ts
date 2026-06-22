import { expect, test } from '@playwright/test'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'
import { navigateToGroup } from '../helpers'
import { randomId } from '@/lib/api'

test.describe('Recurring Expense Deletion', () => {
  test('Delete single expense - other expenses remain', async ({ page }) => {
    const expenseTitle1 = `Expense 1 ${randomId(4)}-1`
    const expenseTitle2 = `Expense 2 ${randomId(4)}-2`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, 'Test Group', [
      'Alice',
      'Bob',
    ])
    await createExpenseViaAPI(page, groupId, {
      title: expenseTitle1,
      amount: 2500, // 25.00 in cents
      payerName: 'Alice',
    })
    await createExpenseViaAPI(page, groupId, {
      title: expenseTitle2,
      amount: 3000, // 30.00 in cents
      payerName: 'Bob',
    })

    // Navigate to group and verify both expenses are visible
    await navigateToGroup(page, groupId)
    await expect(page.getByText(expenseTitle1)).toBeVisible()
    await expect(page.getByText(expenseTitle2)).toBeVisible()

    // Click on first expense to edit
    await page.getByText(expenseTitle1).first().click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Delete the first expense
    const deleteButton = page.getByRole('button', { name: /delete/i })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Confirm deletion in dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const confirmDeleteButton = dialog.getByRole('button', { name: /yes/i })
    await expect(confirmDeleteButton).toBeVisible()
    await confirmDeleteButton.click()

    // Wait for navigation back to expense list
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify first expense is deleted and second remains
    await expect(page.getByText(expenseTitle1)).not.toBeVisible()
    await expect(page.getByText(expenseTitle2)).toBeVisible()
  })

  test('Delete recurring expense instance - others remain', async ({
    page,
  }) => {
    const recurringTitle = `Recurring Expense ${randomId(4)}`
    const regularTitle = `Regular Expense ${randomId(4)}`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, 'Test Group', [
      'Alice',
      'Bob',
    ])

    // Create a recurring expense via API with recurrence support
    await createExpenseViaAPI(page, groupId, {
      title: recurringTitle,
      amount: 5000, // 50.00 in cents
      payerName: 'Alice',
      recurrenceRule: 'DAILY',
    })

    // Create regular expense via API
    await createExpenseViaAPI(page, groupId, {
      title: regularTitle,
      amount: 2500, // 25.00 in cents
      payerName: 'Bob',
    })

    // Verify both expenses exist
    navigateToGroup(page, groupId)
    await expect(page.getByText(recurringTitle)).toBeVisible()
    await expect(page.getByText(regularTitle)).toBeVisible()

    // Delete the recurring expense
    await page.getByText(recurringTitle).first().click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    const deleteButton = page.getByRole('button', { name: /delete/i })
    await deleteButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const confirmDeleteButton = dialog.getByRole('button', { name: /yes/i })
    await confirmDeleteButton.click()

    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify recurring expense is deleted but regular expense remains
    await expect(page.getByText(recurringTitle)).not.toBeVisible()
    await expect(page.getByText(regularTitle)).toBeVisible()
  })

  test('Cancel deletion dialog - expense remains', async ({ page }) => {
    const expenseTitle = `Expense ${randomId(4)}`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, 'Test Group', [
      'Alice',
      'Bob',
    ])
    await createExpenseViaAPI(page, groupId, {
      title: expenseTitle,
      amount: 4000, // 40.00 in cents
      payerName: 'Alice',
    })

    navigateToGroup(page, groupId)
    await expect(page.getByText(expenseTitle)).toBeVisible()

    // Open expense for editing
    await page.getByText(expenseTitle).first().click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Click delete button
    const deleteButton = page.getByRole('button', { name: /delete/i })
    await deleteButton.click()

    // Cancel deletion in dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const cancelButton = dialog.getByRole('button', { name: /cancel|no/i })
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    // Dialog should close and we should still be on edit page
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Navigate back and verify expense still exists
    await page.goBack()
    await expect(page.getByText(expenseTitle)).toBeVisible()
  })
})
