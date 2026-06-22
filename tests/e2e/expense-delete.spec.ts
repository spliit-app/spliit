import { expect, test } from '@playwright/test'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test.describe('Expense Deletion', () => {
  test('deletes expense with confirmation dialog', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `Delete Test ${randomId(4)}`, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    await createExpenseViaAPI(page, groupId, {
      title: 'Expense to Delete',
      amount: 5000, // $50.00 in cents
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    // Verify expense exists
    await expect(page.getByText('Expense to Delete')).toBeVisible()

    // Click expense to edit
    await page.getByText('Expense to Delete').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Click delete button
    const deleteButton = page.getByRole('button', { name: /delete/i })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Verify confirmation dialog appears
    const dialogTitle = page.getByRole('heading').filter({ hasText: /delete/i })
    await expect(dialogTitle).toBeVisible()

    // Verify dialog has confirmation text
    await expect(page.getByText(/do you really want to delete/i)).toBeVisible()

    // Click confirm delete
    const confirmButton = page.getByRole('button', { name: /yes/i })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for navigation back to expenses list
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify expense is deleted
    await expect(page.getByText('Expense to Delete')).not.toBeVisible()
  })

  test('cancels deletion when clicking cancel', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Cancel Delete ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Expense to Keep',
      amount: 7500, // $75.00 in cents
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Expense to Keep').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Click delete button
    const deleteButton = page.getByRole('button', { name: /delete/i })
    await deleteButton.click()

    // Verify confirmation dialog appears
    const dialogTitle = page.getByRole('heading').filter({ hasText: /delete/i })
    await expect(dialogTitle).toBeVisible()

    // Click cancel/no button
    const cancelButton = page.getByRole('button', { name: /no|cancel/i })
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    // Should still be on edit page
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Navigate back to list
    await page.goto(`/groups/${groupId}/expenses`)

    // Verify expense still exists
    await expect(page.getByText('Expense to Keep')).toBeVisible()
    await expect(page.getByText('$75.00')).toBeVisible()
  })

  test('deletes one of multiple expenses', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Multi Delete ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    // Create multiple expenses
    await createExpenseViaAPI(page, groupId, {
      title: 'First Expense',
      amount: 10000, // $100.00 in cents
      payerName: 'Alice',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Second Expense',
      amount: 20000, // $200.00 in cents
      payerName: 'Bob',
    })

    await createExpenseViaAPI(page, groupId, {
      title: 'Third Expense',
      amount: 30000, // $300.00 in cents
      payerName: 'Charlie',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Verify all expenses exist
    await expect(page.getByText('First Expense')).toBeVisible()
    await expect(page.getByText('Second Expense')).toBeVisible()
    await expect(page.getByText('Third Expense')).toBeVisible()

    // Delete the second expense
    await page.getByText('Second Expense').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    const deleteButton = page.getByRole('button', { name: /delete/i })
    await deleteButton.click()

    const confirmButton = page.getByRole('button', { name: /yes/i })
    await confirmButton.click()

    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify only the deleted expense is gone
    await expect(page.getByText('First Expense')).toBeVisible()
    await expect(page.getByText('Second Expense')).not.toBeVisible()
    await expect(page.getByText('Third Expense')).toBeVisible()

    // Verify amounts of remaining expenses
    await expect(page.getByText('$100.00')).toBeVisible()
    await expect(page.getByText('$200.00')).not.toBeVisible()
    await expect(page.getByText('$300.00')).toBeVisible()
  })

  test('deletes reimbursement expense', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Delete Reimbursement ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    // First create a regular expense
    await createExpenseViaAPI(page, groupId, {
      title: 'Regular Expense',
      amount: 20000, // $200.00 in cents
      payerName: 'Alice',
    })

    // Create reimbursement
    await createExpenseViaAPI(page, groupId, {
      title: 'Reimbursement to Delete',
      amount: 10000, // $100.00 in cents
      payerName: 'Bob',
      isReimbursement: true,
    })

    await page.goto(`/groups/${groupId}/expenses`)

    const reimbursementTitle = 'Reimbursement to Delete'
    await expect(page.getByText(reimbursementTitle)).toBeVisible()

    // Delete the reimbursement
    await page.getByText(reimbursementTitle).click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    const deleteButton = page.getByRole('button', { name: /delete/i })
    await deleteButton.click()

    const confirmButton = page.getByRole('button', { name: /yes/i })
    await confirmButton.click()

    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify reimbursement is deleted but regular expense remains
    await expect(page.getByText(reimbursementTitle)).not.toBeVisible()
    await expect(page.getByText('Regular Expense')).toBeVisible()
  })

  test('delete button is visible in edit form', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Delete Button ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Check Delete Button',
      amount: 2500, // $25.00 in cents
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Check Delete Button').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Verify delete button is visible and properly styled
    const deleteButton = page.getByRole('button', { name: /delete/i })
    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toBeEnabled()
  })
})
