import { expect, test } from '@playwright/test'
import { navigateToTab, setActiveUser } from '../helpers'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test('View statistics page', async ({ page }) => {
  await page.goto('/groups')
  
  const groupName = `stats ${randomId(4)}`
  const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob', 'Charlie'])
  await page.goto(`/groups/${groupId}/expenses`)

  await navigateToTab(page, 'Stats')

  // Verify the Totals heading is visible
  await expect(page.getByRole('heading', { name: 'Totals' })).toBeVisible()

  // Verify "Total group spendings" label is present
  await expect(page.getByText('Total group spendings')).toBeVisible()
})

test('Verify Group Total', async ({ page }) => {
  const groupName = `group total ${randomId(4)}`

  await page.goto('/groups')
  const groupId = await createGroupViaAPI(page, groupName, [
    'Alice',
    'Bob',
    'Charlie',
  ])

  // Add expenses
  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 1000,
    payerName: 'Alice',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Drinks',
    amount: 2050,
    payerName: 'Bob',
  })
  await createExpenseViaAPI(page, groupId, {
    title: 'Snacks',
    amount: 500,
    payerName: 'Charlie',
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  await navigateToTab(page, 'Stats')

  // Verify total is exactly 35.50 (10.00 + 20.50 + 5.00)
  const totalGroupSpendings = page.getByTestId('total-group-spendings')
  await expect(totalGroupSpendings).toBeVisible()

  // Check for the specific amount with $ symbol
  await expect(totalGroupSpendings).toContainText('$35.50')
})

test('User statistics calculate paid and share correctly', async ({ page }) => {
  const groupName = `user stats ${randomId(4)}`
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
  // Alice pays $30 for all 3 people (split evenly: $10 each)
  await createExpenseViaAPI(page, groupId, {
    title: 'Dinner',
    amount: 3000,
    payerName: participantA,
  })
  // Bob pays $15 for all 3 people (split evenly: $5 each)
  await createExpenseViaAPI(page, groupId, {
    title: 'Taxi',
    amount: 1500,
    payerName: participantB,
  })

  // Navigate to group page
  await page.goto(`/groups/${groupId}/expenses`)

  // Select Alice as active user via Settings
  await setActiveUser(page, participantA)

  await navigateToTab(page, 'Stats')

  // Verify Alice's total spendings: $30.00 (what she paid)
  const yourSpendings = page.getByTestId('your-total-spendings')
  await expect(yourSpendings).toBeVisible()
  await expect(yourSpendings).toContainText('$30.00')

  // Verify Alice's share: $15.00 ($10 from Dinner + $5 from Taxi)
  const yourShare = page.getByTestId('your-total-share')
  await expect(yourShare).toBeVisible()
  await expect(yourShare).toContainText('$15.00')
})
