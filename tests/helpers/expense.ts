import { expect, type Page } from '@playwright/test'

export interface CreateExpenseOptions {
  title: string
  amount: string
  payer: string
  category?: string
  date?: string
  notes?: string
  isReimbursement?: boolean
  splitMode?: 'evenly' | 'shares' | 'percentage' | 'amount'
  splitValues?: Record<string, string>
  recurrence?: 'Daily' | 'Weekly' | 'Monthly'
}

/**
 * Navigates to the expense creation page
 */
export async function navigateToExpenseCreate(page: Page): Promise<void> {
  // The button is an icon button with title "Create expense"
  const createExpenseButton = page.getByRole('link', {
    name: /create expense/i,
  })
  await createExpenseButton.waitFor({ state: 'visible' })

  await createExpenseButton.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/create/)
}

/**
 * Creates an expense with the specified options
 * @param excludeParticipants - Optional array of participant names to exclude from the expense split
 */
export async function createExpense(
  page: Page,
  options: CreateExpenseOptions,
  excludeParticipants?: string[],
): Promise<void> {
  await navigateToExpenseCreate(page)
  await fillExpenseForm(page, options)

  // Exclude specific participants if provided
  if (excludeParticipants && excludeParticipants.length > 0) {
    for (const participant of excludeParticipants) {
      const checkbox = page.getByRole('checkbox', { name: participant })
      await expect(checkbox).toBeVisible()
      await checkbox.uncheck()
    }
  }

  await submitExpenseAndVerify(page, options.title)
}

/**
 * Sets the recurrence for an expense
 */
export async function setExpenseRecurrence(
  page: Page,
  recurrence: 'Daily' | 'Weekly' | 'Monthly',
): Promise<void> {
  // Find the recurrence combobox
  const recurrenceCombobox = page
    .getByRole('combobox')
    .filter({ hasText: /None|Daily|Weekly|Monthly/ })
    .last()

  await recurrenceCombobox.waitFor({ state: 'visible' })
  await recurrenceCombobox.click()

  // Select the recurrence option
  const recurrenceOption = page.getByRole('option', { name: recurrence })
  await recurrenceOption.waitFor({ state: 'visible'})
  await recurrenceOption.click()
}

/**
 * Fills the expense form with the provided options
 */
export async function fillExpenseForm(
  page: Page,
  options: CreateExpenseOptions,
): Promise<void> {
  // Wait for form to be visible
  const expenseTitle = page.locator('input[name="title"]')
  await expenseTitle.waitFor({ state: 'visible' })

  // Fill title
  await expenseTitle.fill(options.title)

  // Fill amount
  const amountInput = page.locator('input[name="amount"]')
  await amountInput.fill(options.amount)

  // Select payer
  const paidBySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Select a participant' })
  await paidBySelect.waitFor({ state: 'visible' })
  await paidBySelect.click()

  const payerOption = page.getByRole('option', { name: options.payer })
  await payerOption.waitFor({ state: 'visible', timeout: 5000 })
  await payerOption.click()

  // Optional: Select category
  if (options.category) {
    const categorySelects = page.locator('[role="combobox"]')
    if ((await categorySelects.count()) >= 2) {
      await categorySelects.nth(1).click()
      await page.getByRole('option', { name: options.category }).click()
    }
  }

  // Optional: Set date
  if (options.date) {
    const dateInputs = page.locator('input[type="date"]')
    if ((await dateInputs.count()) > 0) {
      await dateInputs.first().fill(options.date)
    }
  }

  // Optional: Add notes
  if (options.notes) {
    const textareas = page.locator('textarea')
    if ((await textareas.count()) > 0) {
      await textareas.first().fill(options.notes)
    }
  }

  // Optional: Check reimbursement checkbox
  if (options.isReimbursement) {
    const reimbursementLabel = page.getByText(/this is a reimbursement/i)
    await reimbursementLabel.click()
  }

  // Optional: Set recurrence
  if (options.recurrence) {
    await setExpenseRecurrence(page, options.recurrence)
  }
}

/**
 * Submits the expense form and verifies it was created
 */
export async function submitExpenseAndVerify(
  page: Page,
  expenseTitle: string,
): Promise<void> {
  // Use more specific selector for the Create button
  const createButton = page.getByRole('button', { name: 'Create' })
  await createButton.click()

  // Wait for navigation to expenses list (more specific pattern)
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

  // Verify expense appears in the list using data-testid
  const expenseTitleElement = page
    .getByTestId('expense-title')
    .filter({ hasText: expenseTitle })
  await expect(expenseTitleElement).toBeVisible()
}

/**
 * Deletes an expense by clicking on it and confirming deletion
 */
export async function deleteExpense(
  page: Page,
  expenseTitle: string,
): Promise<void> {
  // Click expense to edit (use data-testid)
  const expenseTitleElement = page
    .getByTestId('expense-title')
    .filter({ hasText: expenseTitle })
  await expenseTitleElement.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)

  // Click delete button
  const deleteButton = page.getByRole('button', { name: /delete/i })
  await deleteButton.click()

  // Confirm deletion
  const confirmButton = page.getByRole('button', { name: /yes/i })
  await confirmButton.click()

  // Wait for navigation back to expenses list
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

  // Verify expense is deleted (check that title element no longer exists)
  const deletedExpense = page
    .getByTestId('expense-title')
    .filter({ hasText: expenseTitle })
  await expect(deletedExpense).not.toBeVisible()
}

/**
 * Opens an expense for editing
 */
export async function openExpenseForEdit(
  page: Page,
  expenseTitle: string,
): Promise<void> {
  // Click expense using data-testid
  const expenseTitleElement = page
    .getByTestId('expense-title')
    .filter({ hasText: expenseTitle })
  await expenseTitleElement.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/)
  await expect(page.locator('input[name="title"]')).toHaveValue(expenseTitle)
}

/**
 * Updates an expense's fields and saves
 */
export async function updateExpense(
  page: Page,
  updates: Partial<CreateExpenseOptions>,
): Promise<void> {
  // Update title if provided
  if (updates.title) {
    const titleInput = page.locator('input[name="title"]')
    await titleInput.clear()
    await titleInput.fill(updates.title)
  }

  // Update amount if provided
  if (updates.amount) {
    const amountInput = page.locator('input[name="amount"]')
    await amountInput.clear()
    await amountInput.fill(updates.amount)
  }

  // Update date if provided
  if (updates.date) {
    await page.locator('input[type="date"]').fill(updates.date)
  }

  // Update notes if provided
  if (updates.notes !== undefined) {
    const notesTextarea = page.locator('textarea')
    await notesTextarea.clear()
    await notesTextarea.fill(updates.notes)
  }

  // Save
  const saveButton = page.getByRole('button', { name: /save/i })
  await saveButton.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/)
}

/**
 * Verifies expense values in edit form
 */
export async function verifyExpenseValues(
  page: Page,
  expected: {
    title?: string
    amount?: string
    date?: string
    notes?: string
    payer?: string
  },
): Promise<void> {
  if (expected.title) {
    await expect(page.locator('input[name="title"]')).toHaveValue(
      expected.title,
    )
  }
  if (expected.amount) {
    await expect(page.locator('input[name="amount"]')).toHaveValue(
      expected.amount,
    )
  }
  if (expected.date) {
    await expect(page.locator('input[type="date"]')).toHaveValue(expected.date)
  }
  if (expected.notes) {
    await expect(page.locator('textarea')).toHaveValue(expected.notes)
  }
  if (expected.payer) {
    // The payer combobox shows the participant name when selected
    await expect(
      page.getByRole('combobox').filter({ hasText: expected.payer }),
    ).toBeVisible()
  }
}

/**
 * Verifies that an expense has a specific recurrence setting in the edit form
 */
export async function verifyExpenseRecurrence(
  page: Page,
  expectedRecurrence: 'None' | 'Daily' | 'Weekly' | 'Monthly',
): Promise<void> {
  const recurrenceCombobox = page
    .getByRole('combobox')
    .filter({ hasText: expectedRecurrence })
  await expect(recurrenceCombobox).toBeVisible()
}
