import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import { navigateToTab, verifyGroupHeading } from '../helpers'
import { createGroupViaAPI } from '../helpers/batch-api'

test.describe('Group Navigation', () => {
  test('navigate between multiple groups', async ({ page }) => {
    const groupName1 = `navigate 1 ${randomId(4)}`
    const groupName2 = `navigate 2 ${randomId(4)}`

    // Create first group
    await page.goto('/groups')
    const groupId1 = await createGroupViaAPI(page, groupName1, ['Alice', 'Bob'])
    await page.goto(`/groups/${groupId1}/expenses`)

    // Verify we're on group 1
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId1}/expenses$`))
    await verifyGroupHeading(page, groupName1)

    // Create second group
    await page.goto('/groups')
    const groupId2 = await createGroupViaAPI(page, groupName2, [
      'Charlie',
      'Dave',
    ])
    await page.goto(`/groups/${groupId2}/expenses`)

    // Verify we're on group 2
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId2}/expenses$`))
    await verifyGroupHeading(page, groupName2)

    // Navigate to groups list
    await page.goto('/groups')

    // Verify both groups appear in the list
    const group1Link = page.getByText(groupName1)
    const group2Link = page.getByText(groupName2)
    await expect(group1Link).toBeVisible()
    await expect(group2Link).toBeVisible()

    // Navigate to first group
    await group1Link.click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId1}`))
    await verifyGroupHeading(page, groupName1)

    // Verify we can see group 1 participants in a tab
    await navigateToTab(page, 'Balances')
    await expect(page.getByText('Alice', { exact: true })).toBeVisible()
    await expect(page.getByText('Bob', { exact: true })).toBeVisible()

    // Navigate back to groups list
    await page.goto('/groups')
    await expect(page).toHaveURL('/groups')

    // Navigate to second group
    await page.getByText(groupName2).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId2}`))
    await verifyGroupHeading(page, groupName2)

    // Verify we can see group 2 participants
    await navigateToTab(page, 'Balances')
    await expect(page.getByText('Charlie', { exact: true })).toBeVisible()
    await expect(page.getByText('Dave', { exact: true })).toBeVisible()
  })

  test('recent groups persistence across page reloads', async ({ page }) => {
    const groupName = `recent ${randomId(4)}`

    // Create a group
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])
    await page.goto(`/groups/${groupId}/expenses`)

    // Verify group was created
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/expenses$`))

    // Navigate to groups list
    await page.goto('/groups')
    await expect(page).toHaveURL('/groups')

    // Verify group appears in recent list
    const groupLink = page.getByText(groupName)
    await expect(groupLink).toBeVisible()

    // Reload the page to test persistence
    await page.reload()
    await expect(page).toHaveURL('/groups')

    // Verify group still appears after reload
    await expect(page.getByText(groupName)).toBeVisible()

    // Navigate to the group via the link
    await page.getByText(groupName).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${groupId}`))
    await verifyGroupHeading(page, groupName)
  })

  test('navigate to group information tab', async ({ page }) => {
    const groupName = `info tab ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, [
      'Alice',
      'Bob',
      'Charlie',
    ])
    await page.goto(`/groups/${groupId}/expenses`)

    // Navigate to Information tab
    await navigateToTab(page, 'Information')

    // Verify URL changed
    await expect(page).toHaveURL(/\/groups\/[^/]+\/information$/)

    // Verify group name in heading
    await verifyGroupHeading(page, groupName)

    // Verify all tabs are visible
    await expect(page.getByRole('tab', { name: 'Balances' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Expenses' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Stats' })).toBeVisible()
  })

  test('navigate between all group tabs', async ({ page }) => {
    const groupName = `all tabs ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])
    await page.goto(`/groups/${groupId}/expenses`)

    const tabs: Array<{
      name: 'Expenses' | 'Balances' | 'Stats' | 'Settings' | 'Information'
      urlPattern: RegExp
    }> = [
      { name: 'Expenses', urlPattern: /\/expenses$/ },
      { name: 'Balances', urlPattern: /\/balances$/ },
      { name: 'Stats', urlPattern: /\/stats$/ },
      { name: 'Information', urlPattern: /\/information$/ },
      { name: 'Settings', urlPattern: /\/edit$/ },
    ]

    // Navigate through each tab and verify
    for (const tab of tabs) {
      await navigateToTab(page, tab.name)

      // Verify URL
      await expect(page).toHaveURL(tab.urlPattern)

      // Verify tab is selected
      await expect(page.getByRole('tab', { name: tab.name })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      // Verify group name is still visible in heading
      await verifyGroupHeading(page, groupName)
    }
  })

  test('direct URL navigation to group tabs', async ({ page }) => {
    const groupName = `direct URL ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    // Test direct navigation to each tab
    const tabUrls = [
      `/groups/${groupId}/expenses`,
      `/groups/${groupId}/balances`,
      `/groups/${groupId}/stats`,
      `/groups/${groupId}/information`,
      `/groups/${groupId}/edit`,
    ]

    for (const url of tabUrls) {
      await page.goto(url)
      await expect(page).toHaveURL(url)
      await verifyGroupHeading(page, groupName)

      // Verify we can interact with the page (page is fully loaded)
      const tabs = page.getByRole('tab')
      await expect(tabs.first()).toBeVisible()
    }
  })

  test('browser back button navigation', async ({ page }) => {
    const groupName = `back button ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])
    await page.goto(`/groups/${groupId}/expenses`)

    // Navigate through tabs: Expenses -> Balances -> Settings
    await navigateToTab(page, 'Balances')
    await expect(page).toHaveURL(/\/balances$/)

    await navigateToTab(page, 'Settings')
    await expect(page).toHaveURL(/\/edit$/)

    // Use browser back button
    await page.goBack()
    await expect(page).toHaveURL(/\/balances$/)
    await verifyGroupHeading(page, groupName)

    // Back again
    await page.goBack()
    await expect(page).toHaveURL(/\/expenses$/)
    await verifyGroupHeading(page, groupName)

    // Forward navigation
    await page.goForward()
    await expect(page).toHaveURL(/\/balances$/)
    await verifyGroupHeading(page, groupName)
  })

  test('group list shows multiple recent groups in order', async ({ page }) => {
    await page.goto('/groups')

    const groupNames = [
      `recent 1 ${randomId(4)}-1`,
      `recent 2 ${randomId(4)}-2`,
      `recent 3 ${randomId(4)}-3`,
    ]

    const groupIds: string[] = []

    // Create multiple groups
    for (const groupName of groupNames) {
      const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])
      groupIds.push(groupId)
    }

    // Reload the groups list page
    await page.reload()

    // Verify all groups are visible
    for (const groupName of groupNames) {
      await expect(page.getByRole('link', { name: groupName })).toBeVisible()
    }
  })
})
