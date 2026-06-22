import { expect, test } from '@playwright/test'
import { createGroup, navigateToTab } from './helpers'

test('create group - happy path', async ({ page }) => {
  const groupName = `PW E2E group ${Date.now()}`
  const participantA = 'Alice'
  const participantB = 'Bob'

  await createGroup({
    page,
    groupName,
    participants: [participantA, participantB, 'Charlie'],
  })

  // Show balances tab; this page is stable for participant assertions.
  await navigateToTab(page, 'Balances')
  await expect(page.getByText(participantA, { exact: true })).toBeVisible()
  await expect(page.getByText(participantB, { exact: true })).toBeVisible()
})
