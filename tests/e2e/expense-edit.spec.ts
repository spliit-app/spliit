import { expect, test } from '@playwright/test'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test.describe('Expense Editing', () => {
  test('updates expense title and amount', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `Edit Test ${randomId(4)}`, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    await createExpenseViaAPI(page, groupId, {
      title: 'Original Expense',
      amount: 10000, // $100.00 in cents
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Original Expense').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Update title
    const newTitle = 'Updated Expense Title'
    const titleInput = page.locator('input[name="title"]')
    await titleInput.clear()
    await titleInput.fill(newTitle)

    // Update amount
    const newAmount = '250.00'
    const amountInput = page.locator('input[name="amount"]')
    await amountInput.clear()
    await amountInput.fill(newAmount)

    // Submit
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify updated values in list
    await expect(page.getByText(newTitle)).toBeVisible()
    await expect(page.getByText('$250.00')).toBeVisible()
    await expect(page.getByText('Original Expense')).not.toBeVisible()
  })

  test('updates expense payer', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Payer Update ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Payer Change Test',
      amount: 6000, // $60.00 in cents
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Payer Change Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Change payer from Alice to Bob
    const payerSelect = page.getByRole('combobox').filter({ hasText: 'Alice' })
    await payerSelect.click()
    await page.getByRole('option', { name: 'Bob' }).click()

    // Submit
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify payer updated in list
    const expenseCard = page.getByText('Payer Change Test').locator('..')
    await expect(page.getByText(/Bob/)).toBeVisible()
  })

  test('updates expense date', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `Date Update ${randomId(4)}`, [
      'Alice',
      'Bob',
    ])

    const originalDate = '2024-05-15'

    await createExpenseViaAPI(page, groupId, {
      title: 'Date Change Test',
      amount: 4500, // $45.00 in cents
      payerName: 'Alice',
      expenseDate: new Date(originalDate),
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Date Change Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Verify original date
    await expect(page.locator('input[type="date"]')).toHaveValue(originalDate)

    // Update date
    const newDate = '2024-06-20'
    await page.locator('input[type="date"]').fill(newDate)

    // Submit
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Click again to verify date was saved
    await page.getByText('Date Change Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)
    await expect(page.locator('input[type="date"]')).toHaveValue(newDate)
  })

  test('updates expense notes', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Notes Update ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    const originalNotes = 'Original notes content'

    await createExpenseViaAPI(page, groupId, {
      title: 'Notes Update Test',
      amount: 3000, // $30.00 in cents
      payerName: 'Alice',
      notes: originalNotes,
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Notes Update Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Verify original notes
    await expect(page.locator('textarea')).toHaveValue(originalNotes)

    // Update notes
    const newNotes = 'Updated notes with new information'
    const notesTextarea = page.locator('textarea')
    await notesTextarea.clear()
    await notesTextarea.fill(newNotes)

    // Submit
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Click again to verify notes were saved
    await page.getByText('Notes Update Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)
    await expect(page.locator('textarea')).toHaveValue(newNotes)
  })

  test('updates all fields simultaneously', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `Full Update ${randomId(4)}`, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    // Create initial expense
    await createExpenseViaAPI(page, groupId, {
      title: 'Initial Full Test',
      amount: 10000, // $100.00 in cents
      payerName: 'Alice',
      notes: 'Original notes',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Initial Full Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Update all fields
    const newTitle = 'Completely Updated Expense'
    const newAmount = '350.00'
    const newDate = '2024-08-10'
    const newNotes = 'Completely new notes'

    await page.locator('input[name="title"]').clear()
    await page.locator('input[name="title"]').fill(newTitle)

    await page.locator('input[name="amount"]').clear()
    await page.locator('input[name="amount"]').fill(newAmount)

    await page.locator('input[type="date"]').fill(newDate)

    await page.locator('textarea').clear()
    await page.locator('textarea').fill(newNotes)

    // Change payer
    const payerSelect = page.getByRole('combobox').filter({ hasText: 'Alice' })
    await payerSelect.click()
    await page.getByRole('option', { name: 'Charlie' }).click()

    // Submit
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Verify in list
    await expect(page.getByText(newTitle)).toBeVisible()
    await expect(page.getByText('$350.00')).toBeVisible()
    await expect(page.getByText('Initial Full Test')).not.toBeVisible()

    // Click to verify all values persisted
    await page.getByText(newTitle).click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    await expect(page.locator('input[name="title"]')).toHaveValue(newTitle)
    // Amount may lose trailing zeros
    await expect(page.locator('input[name="amount"]')).toHaveValue(/350(\.00)?/)
    await expect(page.locator('input[type="date"]')).toHaveValue(newDate)
    await expect(page.locator('textarea')).toHaveValue(newNotes)
    await expect(
      page.getByRole('combobox').filter({ hasText: 'Charlie' }),
    ).toBeVisible()
  })

  test('toggles reimbursement status', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `Reimbursement Toggle ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Reimbursement Toggle Test',
      amount: 7500, // $75.00 in cents
      payerName: 'Alice',
    })

    await page.goto(`/groups/${groupId}/expenses`)

    await page.goto(`/groups/${groupId}/expenses`)

    // Click expense to edit
    await page.getByText('Reimbursement Toggle Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    // Check reimbursement
    const reimbursementCheckbox = page.getByRole('checkbox', {
      name: /reimbursement/i,
    })
    await expect(reimbursementCheckbox).not.toBeChecked()
    await reimbursementCheckbox.check()
    await expect(reimbursementCheckbox).toBeChecked()

    // Submit
    const saveButton = page.getByRole('button', { name: /save/i })
    await saveButton.click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Click again to verify reimbursement status persisted
    await page.getByText('Reimbursement Toggle Test').click()
    await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

    await expect(
      page.getByRole('checkbox', { name: /reimbursement/i }),
    ).toBeChecked()
  })
})
