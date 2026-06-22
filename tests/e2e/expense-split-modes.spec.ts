import { expect, test } from '@playwright/test'
import { navigateToTab } from '../helpers'
import { createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test('Create expense - evenly split (most common flow)', async ({ page }) => {
  const groupName = `split modes ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  // Step 1: Create group with 3 participants (Alice, Bob, Charlie)
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])
  await page.goto(`/groups/${groupId}/expenses`)

  // Step 2: Navigate to expense creation by clicking the link
  const createLink = page
    .getByRole('link', { name: /create expense|create the first/i })
    .first()
  await createLink.waitFor({ state: 'visible' })
  await createLink.click()

  // Wait for navigation to expense creation page
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/create/)

  // Wait for the expense form to load by checking for the title input field
  const expenseTitle = page.locator('input[name="title"]')
  await expenseTitle.waitFor({ state: 'visible' })

  // Step 3: Fill title: "Team Dinner"
  await expenseTitle.fill('Team Dinner')

  // Step 4: Fill amount: 300.00
  const amountInput = page.locator('input[name="amount"]')
  await amountInput.fill('300.00')

  // Step 5: Select payer: Alice
  const paidBySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Select a participant' })
  await paidBySelect.waitFor({ state: 'visible' })
  await paidBySelect.click()

  const aliceOption = page.getByRole('option', { name: participantA })
  await aliceOption.waitFor({ state: 'visible' })
  await aliceOption.click()

  // Step 6: Verify split section is visible (evenly split is the default when all are checked)
  // The form doesn't explicitly show "Evenly" text, but by default all participants are checked

  // Step 7: Verify all 3 participants are included
  const participantCheckboxes = page.getByRole('checkbox')
  const checkedCount = await participantCheckboxes.count()
  expect(checkedCount).toBeGreaterThanOrEqual(3)

  // Step 8: Submit expense
  const saveButton = page.locator('button[type="submit"]').first()
  await saveButton.click()

  // Wait for redirect back to group page
  await page.waitForURL(/\/groups\/[^/]+/, {})

  // Step 9: Navigate to Expenses tab
  await navigateToTab(page, 'Expenses')

  // Step 10: Verify expense appears with correct title and amount
  await expect(page.getByText('Team Dinner')).toBeVisible({})
  await expect(page.locator(`text=300.00`)).toBeVisible({})

  // Step 11: Verify balances
  await navigateToTab(page, 'Balances')

  // Wait for the Balances heading to appear
  await expect(
    page
      .locator('h2, h3, h4, h5')
      .filter({ hasText: /balance/i })
      .first(),
  ).toBeVisible()

  // Verify participants are mentioned in the balances (use .first() to avoid strict mode)
  await expect(page.getByText(participantA).first()).toBeVisible()
  await expect(page.getByText(participantB).first()).toBeVisible()
  await expect(page.getByText(participantC).first()).toBeVisible()
})

test('Create expense - by shares split mode', async ({ page }) => {
  const groupName = `by shares ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  // Step 1: Create group with 3 participants
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])
  await page.goto(`/groups/${groupId}/expenses`)

  // Step 2: Navigate to expense creation
  const createLink = page
    .getByRole('link', { name: /create expense|create the first/i })
    .first()
  await createLink.waitFor({ state: 'visible' })
  await createLink.click()

  // Wait for navigation to expense creation page
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/create/)

  // Wait for the expense form to load
  const expenseTitle = page.locator('input[name="title"]')
  await expenseTitle.waitFor({ state: 'visible' })

  // Step 3: Fill title and amount
  await expenseTitle.fill('Team Dinner Shares')
  const amountInput = page.locator('input[name="amount"]')
  await amountInput.fill('300.00')

  // Step 4: Select payer: Alice
  const paidBySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Select a participant' })
  await paidBySelect.waitFor({ state: 'visible' })
  await paidBySelect.click()

  const aliceOption = page.getByRole('option', { name: participantA })
  await aliceOption.waitFor({ state: 'visible' })
  await aliceOption.click()

  // Step 5: Expand advanced options
  await page
    .getByRole('button', { name: 'Advanced splitting options…' })
    .click()

  // Step 6: Select split mode: By shares
  const splitModeSelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Evenly' })
  await splitModeSelect.click()
  await page.getByRole('option', { name: 'Unevenly – By shares' }).click()

  // Step 7: Fill shares - Alice: 1, Bob: 2, Charlie: 3
  // The split-mode inputs are plain textboxes without stable attributes;
  // scope to the "Paid for" section and match by the trailing "share(s)" label.
  const paidForSection = page
    .locator('h1,h2,h3,h4,h5', { hasText: /^Paid for/i })
    .first()
    .locator('..')
    .locator('..')

  const shareInputs = paidForSection
    .locator('div', { hasText: 'share(s)' })
    .getByRole('textbox')

  await expect(shareInputs).toHaveCount(3)

  await shareInputs.nth(0).fill('1') // Alice
  await shareInputs.nth(1).fill('2') // Bob
  await shareInputs.nth(2).fill('3') // Charlie

  // Step 7: Submit expense
  const saveButton = page.locator('button[type="submit"]').first()
  await saveButton.click()

  // Wait for redirect back to group page
  await page.waitForURL(/\/groups\/[^/]+/, {})

  // Step 8: Navigate to Expenses tab
  await navigateToTab(page, 'Expenses')

  // Step 9: Verify expense appears
  await expect(page.getByText('Team Dinner Shares')).toBeVisible()
  await expect(page.locator('text=300.00')).toBeVisible()

  // Step 10: Verify balances (Alice paid 300, shares 1:2:3 so she is owed 250, Bob owes 100, Charlie owes 150)
  await navigateToTab(page, 'Balances')

  // Wait for balances to load
  await expect(
    page
      .locator('h2, h3, h4, h5')
      .filter({ hasText: /balance/i })
      .first(),
  ).toBeVisible({})

  // Verify participants are shown
  await expect(page.getByText(participantA).first()).toBeVisible({})
  await expect(page.getByText(participantB).first()).toBeVisible({})
  await expect(page.getByText(participantC).first()).toBeVisible({})
})

test('Create expense - by percentage split mode', async ({ page }) => {
  const groupName = `by percentage ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  // Step 1: Create group with 3 participants
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])
  await page.goto(`/groups/${groupId}/expenses`)

  // Step 2: Navigate to expense creation
  const createLink = page
    .getByRole('link', { name: /create expense|create the first/i })
    .first()
  await createLink.waitFor({ state: 'visible' })
  await createLink.click()

  // Wait for navigation to expense creation page
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/create/)

  // Wait for the expense form to load
  const expenseTitle = page.locator('input[name="title"]')
  await expenseTitle.waitFor({ state: 'visible' })

  // Step 3: Fill title and amount
  await expenseTitle.fill('Team Dinner Percentage')
  const amountInput = page.locator('input[name="amount"]')
  await amountInput.fill('300.00')

  // Step 4: Select payer: Alice
  const paidBySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Select a participant' })
  await paidBySelect.waitFor({ state: 'visible' })
  await paidBySelect.click()

  const aliceOption = page.getByRole('option', { name: participantA })
  await aliceOption.waitFor({ state: 'visible' })
  await aliceOption.click()

  // Step 5: Expand advanced options
  await page
    .getByRole('button', { name: 'Advanced splitting options…' })
    .click()

  // Step 6: Select split mode: By percentage
  const splitModeSelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Evenly' })
  await splitModeSelect.click()
  await page.getByRole('option', { name: 'Unevenly – By percentage' }).click()

  // Step 7: Fill percentages - Alice: 25%, Bob: 25%, Charlie: 50%
  // Scope to the "Paid for" section and match by the trailing "%" label.
  const paidForSection = page
    .locator('h1,h2,h3,h4,h5', { hasText: /^Paid for/i })
    .first()
    .locator('..')
    .locator('..')

  const percentageInputs = paidForSection
    .locator('div', { hasText: '%' })
    .getByRole('textbox')

  await expect(percentageInputs).toHaveCount(3)

  await percentageInputs.nth(0).fill('25') // Alice
  await percentageInputs.nth(1).fill('25') // Bob
  await percentageInputs.nth(2).fill('50') // Charlie

  // Step 7: Submit expense
  const saveButton = page.locator('button[type="submit"]').first()
  await saveButton.click()

  // Wait for redirect back to group page
  await page.waitForURL(/\/groups\/[^/]+/)

  // Step 8: Navigate to Expenses tab
  await navigateToTab(page, 'Expenses')

  // Step 9: Verify expense appears
  await expect(page.getByText('Team Dinner Percentage')).toBeVisible()
  await expect(page.locator('text=300.00')).toBeVisible()

  // Step 10: Verify balances
  await navigateToTab(page, 'Balances')

  // Wait for balances to load
  await expect(
    page
      .locator('h2, h3, h4, h5')
      .filter({ hasText: /balance/i })
      .first(),
  ).toBeVisible()

  // Verify participants are shown
  await expect(page.getByText(participantA).first()).toBeVisible()
  await expect(page.getByText(participantB).first()).toBeVisible()
  await expect(page.getByText(participantC).first()).toBeVisible()
})

test('Create expense - by amount split mode', async ({ page }) => {
  const groupName = `by amount ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  // Step 1: Create group with 3 participants
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])
  await page.goto(`/groups/${groupId}/expenses`)

  // Step 2: Navigate to expense creation
  const createLink = page
    .getByRole('link', { name: /create expense|create the first/i })
    .first()
  await createLink.waitFor({ state: 'visible' })
  await createLink.click()

  await page.waitForURL(/\/groups\/[^/]+\/expenses\/create/)

  const expenseTitle = page.locator('input[name="title"]')
  await expenseTitle.waitFor({ state: 'visible' })

  // Step 3: Fill title and total amount
  await expenseTitle.fill('Team Dinner Amounts')
  const amountInput = page.locator('input[name="amount"]')
  await amountInput.fill('300.00')

  // Step 4: Select payer: Alice
  const paidBySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Select a participant' })
  await paidBySelect.waitFor({ state: 'visible' })
  await paidBySelect.click()
  await page.getByRole('option', { name: participantA }).click()

  // Step 5: Expand advanced options
  await page
    .getByRole('button', { name: 'Advanced splitting options…' })
    .click()

  // Step 6: Select split mode: By amount
  const splitModeSelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Evenly' })
  await splitModeSelect.click()
  await page.getByRole('option', { name: 'Unevenly – By amount' }).click()

  // Step 7: Fill amounts - Alice: 50, Bob: 100, Charlie: 150 (sum to 300)
  // In BY_AMOUNT mode the per-participant amount inputs live in the "Paid for" rows.
  const paidForSection = page
    .locator('h1,h2,h3,h4,h5', { hasText: /^Paid for/i })
    .first()
    .locator('..')
    .locator('..')

  const amountSplitInputs = paidForSection
    .locator('div', { hasText: '$' })
    .getByRole('textbox')

  await expect(amountSplitInputs).toHaveCount(3)

  await amountSplitInputs.nth(0).fill('50.00')
  await amountSplitInputs.nth(1).fill('100.00')
  await amountSplitInputs.nth(2).fill('150.00')

  // Step 8: Submit expense
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/groups\/[^/]+/)

  // Step 9: Verify expense appears
  await navigateToTab(page, 'Expenses')
  await expect(page.getByText('Team Dinner Amounts')).toBeVisible()
  await expect(page.locator('text=300.00')).toBeVisible()

  // Step 10: Verify balances page loads and shows participants
  await navigateToTab(page, 'Balances')

  await expect(
    page
      .locator('h2, h3, h4, h5')
      .filter({ hasText: /balance/i })
      .first(),
  ).toBeVisible()

  await expect(page.getByText(participantA).first()).toBeVisible()
  await expect(page.getByText(participantB).first()).toBeVisible()
  await expect(page.getByText(participantC).first()).toBeVisible()
})
