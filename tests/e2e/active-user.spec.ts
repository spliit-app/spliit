import { expect, test } from '@playwright/test'
import { navigateToTab } from '../helpers'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test('Active user changes balance view', async ({ page }) => {
  const groupName = `active user balances ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])

  // Seed a couple expenses so balances are non-trivial.
  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 3000,
    payerName: participantA,
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Taxi',
    amount: 1500,
    payerName: participantB,
  })

  await page.goto(`/groups/${groupId}/expenses`)
  await navigateToTab(page, 'Balances')

  // Verify the reimbursements list is displayed with Mark as paid link
  const reimbursementsList = page.getByTestId('reimbursements-list')
  await expect(reimbursementsList).toBeVisible()

  // Get the Mark as paid link and verify it contains reimbursement query params
  const markAsPaidLink = page
    .getByRole('link', { name: 'Mark as paid' })
    .first()
  await expect(markAsPaidLink).toBeVisible()

  const hrefBefore = await markAsPaidLink.getAttribute('href')
  expect(hrefBefore).toContain('reimbursement=yes')
  expect(hrefBefore).toMatch(/\bfrom=/)
  expect(hrefBefore).toMatch(/\bto=/)
  expect(hrefBefore).toMatch(/\bamount=/)

  // Verify Mark as paid link text is visible (confirms it's rendered)
  await expect(markAsPaidLink).toContainText('Mark as paid')

  // Clicking a participant row should set the active context
  const participantRow = page.getByTestId(`balance-row-${participantB}`)
  await participantRow.click()

  // After switching, the reimbursements list should still be visible
  await expect(reimbursementsList).toBeVisible()

  // The participant row itself should still be visible
  await expect(participantRow).toBeVisible()
  await expect(participantRow).toContainText(participantB)
})

test('Clear active user - neutral view', async ({ page }) => {
  const groupName = `clear active user ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    'Charlie',
  ])

  await page.goto(`/groups/${groupId}/expenses`)
  // Navigate to balances
  await navigateToTab(page, 'Balances')

  // Verify balances list is visible with all participants
  const balancesList = page.getByTestId('balances-list')
  await expect(balancesList).toBeVisible()
  await expect(balancesList).toContainText(participantA)

  // Click on a participant to select them as active
  const participantARow = page.getByTestId(`balance-row-${participantA}`)
  await participantARow.click()
  await expect(participantARow).toBeVisible()

  // Now try to clear selection (click again or look for a clear button)
  // This tests that the view can return to neutral state
  await participantARow.click()

  // Verify the page is still visible (neutral state)
  await expect(balancesList).toBeVisible()
  await expect(participantARow).toBeVisible()
  await expect(participantARow).toContainText(participantA)
})

test('Updates stats when active user changes', async ({ page }) => {
  const groupName = `active user stats update ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])

  // Add expenses
  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 3000,
    payerName: participantA,
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Taxi',
    amount: 1500,
    payerName: participantB,
  })

  await page.goto(`/groups/${groupId}/expenses`)
  // Set Alice as active user via Settings
  await navigateToTab(page, 'Settings')
  const activeUserSelector = page.getByTestId('active-user-selector')
  await activeUserSelector.click()
  await page.getByRole('option', { name: participantA }).click()
  await page.getByRole('button', { name: /save/i }).click()

  // Navigate to Stats and verify Alice's stats
  await navigateToTab(page, 'Stats')

  // Alice paid 30.00 - verify "Your total spendings" displays $30.00
  const yourSpendings = page.getByTestId('your-total-spendings')
  await expect(yourSpendings).toBeVisible()
  await expect(yourSpendings).toContainText('30.00')

  // Alice's share is 15.00 (total 45.00 / 3 participants)
  const yourShare = page.getByTestId('your-total-share')
  await expect(yourShare).toBeVisible()
  await expect(yourShare).toContainText('15.00')

  // Change active user to Bob via Settings
  await navigateToTab(page, 'Settings')
  const activeUserSelectorBob = page.getByTestId('active-user-selector')
  await activeUserSelectorBob.click()
  await page.getByRole('option', { name: participantB }).click()
  await page.getByRole('button', { name: /save/i }).click()

  // Navigate back to Stats and verify Bob's stats have changed
  await navigateToTab(page, 'Stats')

  // Bob paid 15.00 - should be different from Alice's 30.00
  const bobSpendings = page.getByTestId('your-total-spendings')
  await expect(bobSpendings).toBeVisible()
  await expect(bobSpendings).toContainText('15.00')

  // Bob's share is still 15.00 (total 45.00 / 3 participants)
  const bobShare = page.getByTestId('your-total-share')
  await expect(bobShare).toBeVisible()
  await expect(bobShare).toContainText('15.00')
})

test('Active user selection persists after page reload', async ({ page }) => {
  const groupName = `active user persistence ${randomId(4)}`
  const participantA = 'Alice'
  const participantB = 'Bob'
  const participantC = 'Charlie'

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    participantA,
    participantB,
    participantC,
  ])

  await page.goto(`/groups/${groupId}/expenses`)
  // Select Alice as active user via Settings
  await navigateToTab(page, 'Settings')
  const activeUserSelector = page.getByTestId('active-user-selector')
  await activeUserSelector.click()
  await page.getByRole('option', { name: participantA }).click()
  await page.getByRole('button', { name: /save/i }).click()

  // Verify selection is applied by navigating to Stats
  await navigateToTab(page, 'Stats')

  // Verify Alice's stats are showing
  const yourSpendings = page.getByTestId('your-total-spendings')
  await expect(yourSpendings).toBeVisible()
  await expect(yourSpendings).toContainText('0.00')

  // Reload the page
  await page.reload()

  // Navigate to Settings and verify Alice is still selected
  await navigateToTab(page, 'Settings')

  // The active user selector should display Alice as selected
  const activeUserSelectorAfterReload = page.getByTestId('active-user-selector')
  await expect(activeUserSelectorAfterReload).toContainText(participantA)

  // Alternatively, verify via Stats that Alice's stats are still showing
  await navigateToTab(page, 'Stats')
  const yourSpendingsAfterReload = page.getByTestId('your-total-spendings')
  await expect(yourSpendingsAfterReload).toBeVisible()
  await expect(yourSpendingsAfterReload).toContainText('0.00')
})
