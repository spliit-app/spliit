import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './pom/create-group-page'
import { GroupPage } from './pom/group-page'
import { generateUniqueGroupName } from './test-data/groups'

test('Simple group creation and tab navigation', async ({ page }) => {
  const createGroupPage = new CreateGroupPage(page)
  const groupPage = new GroupPage(page)
  
  const groupName = generateUniqueGroupName()

  await test.step('Create a new group', async () => {
    await createGroupPage.navigate()
    await createGroupPage.fillGroupName(groupName)
    await createGroupPage.fillCurrency('USD')
    await createGroupPage.addParticipant('Alice', 0)
    await createGroupPage.addParticipant('Bob', 1)
    await createGroupPage.submit()
  })

  await test.step('Verify group is created', async () => {
    await expect(groupPage.title).toHaveText(groupName)
  })

  await test.step('Test basic tab navigation', async () => {
    // Navigate to balances tab
    await page.getByTestId('tab-balances').click()
    await expect(page).toHaveURL(/\/balances$/)
    await expect(page.getByTestId('balances-content')).toBeVisible()

    // Navigate back to expenses tab
    await page.getByTestId('tab-expenses').click()
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByTestId('expenses-content')).toBeVisible()
  })
})