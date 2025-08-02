import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './create-group-page'

test('Create a new group', async ({ page }) => {
  const createGroupPage = new CreateGroupPage(page)

  await createGroupPage.navigate()
  await createGroupPage.fillGroupName('New Test Group')
  await createGroupPage.fillCurrency('USD')
  await createGroupPage.fillAdditionalInfo('This is a test group.')

  await createGroupPage.addParticipant('John', 0)
  await createGroupPage.addParticipant('Jane', 1)

  await createGroupPage.submit()

  await page.waitForURL(/.*\/groups\/.*\/expenses/)
  await expect(
    page.getByRole('heading', { name: 'New Test Group' }),
  ).toBeVisible()
})
