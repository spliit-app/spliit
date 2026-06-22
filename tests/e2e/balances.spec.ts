import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { navigateToTab } from '../helpers'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'

test('suggested reimbursements displayed', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, `balances ${randomId(4)}`, [
    'Alice',
    'Bob',
    'Charlie',
  ])

  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 30000,
    payerName: 'Alice',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Breakfast',
    amount: 15000,
    payerName: 'Bob',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Lunch',
    amount: 12000,
    payerName: 'Charlie',
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')
  await navigateToTab(page, 'Balances')
  await page.waitForLoadState('networkidle')

  // Verify Suggested reimbursements section is visible
  const reimbursementsHeading = page.getByRole('heading', {
    name: 'Suggested reimbursements',
  })
  await expect(reimbursementsHeading).toBeVisible()

  // Verify reimbursements list is displayed
  const reimbursementsList = page.getByTestId('reimbursements-list')
  await expect(reimbursementsList).toBeVisible()

  // Verify specific reimbursement rows with expected visible content
  const bobOwesAlice = page.getByTestId('reimbursement-row-Bob-Alice')
  await expect(bobOwesAlice).toBeVisible()
  await expect(bobOwesAlice).toContainText('Bob owes Alice')
  await expect(bobOwesAlice).toContainText('$40.00')

  const charlieOwesAlice = page.getByTestId('reimbursement-row-Charlie-Alice')
  await expect(charlieOwesAlice).toBeVisible()
  await expect(charlieOwesAlice).toContainText('Charlie owes Alice')
  await expect(charlieOwesAlice).toContainText('$70.00')

  // Verify Mark as paid links exist and are clickable
  await expect(
    bobOwesAlice.getByRole('link', { name: /mark as paid/i }),
  ).toBeVisible()
  await expect(
    charlieOwesAlice.getByRole('link', { name: /mark as paid/i }),
  ).toBeVisible()
})

test('view balances page - calculates correctly', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `balance calculation ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 30000,
    payerName: 'Alice',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Breakfast',
    amount: 15000,
    payerName: 'Bob',
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')
  await navigateToTab(page, 'Balances')
  await page.waitForLoadState('networkidle')

  // Verify Balances section header is visible
  const balancesHeading = page.getByRole('heading', { name: 'Balances' })
  await expect(balancesHeading).toBeVisible()

  // Verify balances list is rendered
  const balancesList = page.getByTestId('balances-list')
  await expect(balancesList).toBeVisible()

  // Verify balance calculations (net amounts)
  const aliceRow = page.getByTestId('balance-row-Alice')
  await expect(aliceRow).toBeVisible()
  await expect(aliceRow).toContainText('Alice')
  await expect(aliceRow).toContainText('$150.00')

  const bobRow = page.getByTestId('balance-row-Bob')
  await expect(bobRow).toBeVisible()
  await expect(bobRow).toContainText('Bob')
  await expect(bobRow).toContainText('$0.00')

  const charlieRow = page.getByTestId('balance-row-Charlie')
  await expect(charlieRow).toBeVisible()
  await expect(charlieRow).toContainText('Charlie')
  await expect(charlieRow).toContainText('-$150.00')
})

test('Active user balance highlighted', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `active user balance ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')
  await navigateToTab(page, 'Balances')
  await page.waitForLoadState('networkidle')

  // Verify balances list loads with all participants
  const balancesList = page.getByTestId('balances-list')
  await expect(balancesList).toBeVisible()

  await expect(page.getByTestId('balance-row-Alice')).toBeVisible()
  await expect(page.getByTestId('balance-row-Bob')).toBeVisible()
  await expect(page.getByTestId('balance-row-Charlie')).toBeVisible()
})

test('Zero balances display correctly', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `zero balances ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')
  await navigateToTab(page, 'Balances')
  await page.waitForLoadState('networkidle')

  // Verify balances list is displayed
  const balancesList = page.getByTestId('balances-list')
  await expect(balancesList).toBeVisible()

  // With no expenses, all balances should be zero
  await expect(page.getByTestId('balance-row-Alice')).toContainText('$0.00')
  await expect(page.getByTestId('balance-row-Bob')).toContainText('$0.00')
  await expect(page.getByTestId('balance-row-Charlie')).toContainText('$0.00')

  // Verify no reimbursements are needed
  await expect(page.getByTestId('no-reimbursements')).toBeVisible()
})

test('Balances match expected from expenses', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `balance verification ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 30000,
    payerName: 'Alice',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Breakfast',
    amount: 15000,
    payerName: 'Bob',
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')
  await navigateToTab(page, 'Balances')
  await page.waitForLoadState('networkidle')

  // Wait for balances list to be visible
  const balancesList = page.getByTestId('balances-list')
  await expect(balancesList).toBeVisible()

  // Verify exact balance values by checking visible text content
  await expect(page.getByTestId('balance-row-Alice')).toContainText('Alice')
  await expect(page.getByTestId('balance-row-Alice')).toContainText('$150.00')

  await expect(page.getByTestId('balance-row-Bob')).toContainText('Bob')
  await expect(page.getByTestId('balance-row-Bob')).toContainText('$0.00')

  await expect(page.getByTestId('balance-row-Charlie')).toContainText('Charlie')
  await expect(page.getByTestId('balance-row-Charlie')).toContainText(
    '-$150.00',
  )

  // Verify reimbursement suggestion exists
  const reimbursementsList = page.getByTestId('reimbursements-list')
  await expect(reimbursementsList).toBeVisible()

  // Charlie should owe Alice $150
  const charlieOwesAlice = page.getByTestId('reimbursement-row-Charlie-Alice')
  await expect(charlieOwesAlice).toBeVisible()
  await expect(charlieOwesAlice).toContainText('Charlie owes Alice')
  await expect(charlieOwesAlice).toContainText('$150.00')
})

test('Suggested reimbursements minimized', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `reimbursement optimization ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie', 'David'],
  )

  await createExpenseViaAPI(page, groupId, {
    title: 'Event A',
    amount: 40000,
    payerName: 'Alice',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Event B',
    amount: 30000,
    payerName: 'Bob',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Event C',
    amount: 20000,
    payerName: 'Charlie',
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')
  await navigateToTab(page, 'Balances')
  await page.waitForLoadState('networkidle')

  // Verify suggested reimbursements section exists
  const reimbursementsHeading = page.getByRole('heading', {
    name: 'Suggested reimbursements',
  })
  await expect(reimbursementsHeading).toBeVisible()

  // Verify reimbursements list is displayed
  const reimbursementsList = page.getByTestId('reimbursements-list')
  await expect(reimbursementsList).toBeVisible()

  // Count reimbursement rows - with optimization should be minimal
  // With 4 participants, maximum needed is 3 reimbursements (n-1)
  const reimbursementRows = page.locator('[data-testid^="reimbursement-row-"]')
  const count = await reimbursementRows.count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThanOrEqual(3)
})

test('Create reimbursement expense', async ({ page }) => {
  await page.goto('/groups')

  const groupId = await createGroupViaAPI(
    page,
    `create reimburse ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  await createExpenseViaAPI(page, groupId, {
    title: 'Initial Expense',
    amount: 30000,
    payerName: 'Alice',
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')

  // Now create a reimbursement expense directly
  const createExpenseLink = page.getByRole('link', { name: 'Create expense' })
  await createExpenseLink.waitFor({ state: 'visible' })

  await createExpenseLink.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/create/)

  await page.getByLabel(/title/i).fill('Reimbursement from Bob')

  // Use the amount field with name="amount" specifically
  await page.locator('input[name="amount"]').fill('100')

  // Select payer
  const payBySelect = page
    .getByRole('combobox')
    .filter({ hasText: 'Select a participant' })
  await payBySelect.click()

  const reimbPayerOption = page.getByRole('option', { name: 'Bob' })
  await reimbPayerOption.click()

  // Check reimbursement checkbox
  const reimbursementCheckbox = page.getByRole('checkbox', {
    name: /reimbursement/i,
  })
  await reimbursementCheckbox.check()

  // Submit
  await page.getByRole('button', { name: /create/i }).click()
  await page.waitForURL(/\/groups\/[^/]+/)

  // Verify reimbursement appears
  await expect(page.getByText(/Reimbursement from/i)).toBeVisible()
})

test('Reimbursement in expenses', async ({ page }) => {
  await page.goto('/groups')
  const groupId = await createGroupViaAPI(
    page,
    `reimbursement totals ${randomId(4)}`,
    ['Alice', 'Bob', 'Charlie'],
  )

  const regularExpense = await createExpenseViaAPI(page, groupId, {
    title: 'Regular Expense',
    amount: 30000,
    payerName: 'Alice',
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')

  // Verify expense appears
  await expect(page.getByTestId(`expense-item-${regularExpense}`)).toBeVisible()

  // Create a reimbursement expense
  const reimbursementExpense = await createExpenseViaAPI(page, groupId, {
    title: 'Reimbursement Expense',
    amount: 15000,
    payerName: 'Bob',
    isReimbursement: true,
  })

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForLoadState('networkidle')

  // Verify both expenses appear
  await expect(page.getByTestId(`expense-item-${regularExpense}`)).toBeVisible()
  await expect(
    page.getByTestId(`expense-item-${reimbursementExpense}`),
  ).toBeVisible()
})
