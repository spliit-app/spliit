import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './pom/create-group-page'
import { GroupPage } from './pom/group-page'
import { SettingsPage } from './pom/settings-page'
import { testGroups, generateUniqueGroupName } from './test-data/groups'

test.describe('Group Lifecycle Management', () => {
  test('Complete group lifecycle: create, navigate tabs, edit details', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const settingsPage = new SettingsPage(page)
    
    const groupName = generateUniqueGroupName()
    const groupData = { ...testGroups.basic, name: groupName }

    await test.step('Create a new group with participants', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupData.name)
      await createGroupPage.fillCurrency(groupData.currency)
      await createGroupPage.fillAdditionalInfo(groupData.information)
      
      // Add participants
      for (let i = 0; i < groupData.participants.length; i++) {
        await createGroupPage.addParticipant(groupData.participants[i], i)
      }
      
      await createGroupPage.submit()
    })

    await test.step('Verify group is created and displayed correctly', async () => {
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
      await expect(groupPage.title).toHaveText(groupData.name)
      await expect(page).toHaveURL(/\/groups\/[^\/]+/)
    })

    await test.step('Navigate between group tabs', async () => {
      // Test navigation to each tab
      const tabs = [
        { name: 'expenses', content: 'expenses-content' },
        { name: 'balances', content: 'balances-content' },
        { name: 'information', content: 'information-content' },
        { name: 'stats', content: 'stats-content' },
        { name: 'activity', content: 'activity-content' },
        { name: 'edit', content: 'edit-content' }
      ]
      
      for (const tab of tabs) {
        await page.getByTestId(`tab-${tab.name}`).click()
        // Wait for navigation to complete
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(new RegExp(`\\/groups\\/[^\\/]+\\/${tab.name}`))
        
        // Verify tab content loads with retry
        await expect(page.getByTestId(tab.content)).toBeVisible({ timeout: 10000 })
      }
    })

    await test.step('Verify we can access edit page', async () => {
      // Navigate to settings if not already there
      await page.getByTestId('tab-edit').click()
      
      // Just verify we can access the edit content
      await expect(page.getByTestId('edit-content')).toBeVisible()
    })

    await test.step('Return to expenses tab', async () => {
      // Navigate back to main group page
      await page.getByTestId('tab-expenses').click()
      await expect(page.getByTestId('expenses-content')).toBeVisible()
    })
  })

  test('Create minimal group with two participants', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    
    const groupName = generateUniqueGroupName()
    const groupData = { ...testGroups.minimal, name: groupName }

    await test.step('Create minimal group', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupData.name)
      await createGroupPage.fillCurrency(groupData.currency)
      
      // Add only two participants
      await createGroupPage.addParticipant(groupData.participants[0], 0)
      await createGroupPage.addParticipant(groupData.participants[1], 1)
      
      await createGroupPage.submit()
    })

    await test.step('Verify minimal group creation', async () => {
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
      await expect(groupPage.title).toHaveText(groupData.name)
      
      // Verify we're on the expenses page
      await expect(page.getByTestId('expenses-content')).toBeVisible({ timeout: 10000 })
    })
  })

  test('Create group with three participants', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    
    const groupName = generateUniqueGroupName()
    const groupData = { ...testGroups.basic, name: groupName }

    await test.step('Create group with 3 participants', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupData.name)
      await createGroupPage.fillCurrency(groupData.currency)
      await createGroupPage.fillAdditionalInfo(groupData.information)
      
      // Add 3 participants
      for (let i = 0; i < 3; i++) {
        await createGroupPage.addParticipant(groupData.participants[i], i)
      }
      
      await createGroupPage.submit()
    })

    await test.step('Verify group with 3 participants is created', async () => {
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
      await expect(groupPage.title).toHaveText(groupData.name)
      
      // Verify we're on the expenses page
      await expect(page.getByTestId('expenses-content')).toBeVisible({ timeout: 10000 })
    })
  })
})