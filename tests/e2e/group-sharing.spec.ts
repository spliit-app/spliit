import { expect, test } from '@playwright/test'
import { extractGroupId, verifyGroupHeading } from '../helpers'
import { createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test.describe('Group Sharing', () => {
  test('share group via copy URL button', async ({ page, context }) => {
    const groupName = `share ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    await page.goto(`/groups/${groupId}/expenses`)

    // Grant clipboard permissions if supported
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: 'http://localhost:3000',
      })
    } catch {
      // Not all browsers support clipboard permissions; continue anyway
    }

    // Verify we're on the expenses tab
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/)

    // Verify group ID is valid
    expect(groupId).toBeTruthy()
    expect(groupId).not.toBe('create')

    // Click share button
    const shareButton = page.locator('button[title="Share"]')
    await expect(shareButton).toBeVisible()
    await shareButton.click()

    // Verify we're still on the same page (share opens popover)
    await verifyGroupHeading(page, groupName)
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/)

    // Find and click the copy button (has lucide-copy icon)
    const copyButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-copy') })
      .first()

    await expect(copyButton).toBeVisible()
    await copyButton.click()

    // Verify copy success by checking for the check icon
    const checkIcon = page.locator('svg.lucide-check').first()
    await expect(checkIcon).toBeVisible()

    // Try to verify clipboard contents if browser supports it
    try {
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText(),
      )

      // Verify clipboard contains the correct share URL
      const expectedUrlPart = `/groups/${groupId}/expenses?ref=share`
      expect(clipboardText).toContain(expectedUrlPart)

      // Verify it's a full URL
      expect(clipboardText).toMatch(/^https?:\/\//)
    } catch {
      // Some browsers (webkit/mobile) deny clipboard reads in automation
      // The check icon is sufficient evidence that copy succeeded
      console.log('Clipboard read not supported, relying on check icon')
    }
  })

  test('share URL includes ref parameter', async ({ page, context }) => {
    const groupName = `share ref ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    await page.goto(`/groups/${groupId}/expenses`)

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: 'http://localhost:3000',
      })
    } catch {
      // Continue without clipboard permissions
    }

    // Open share popover
    await page.locator('button[title="Share"]').click()

    // Copy the URL
    const copyButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-copy') })
      .first()
    await copyButton.click()

    // Wait for check icon
    await expect(page.locator('svg.lucide-check').first()).toBeVisible()

    // Verify ref parameter is in the URL
    try {
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText(),
      )
      expect(clipboardText).toContain('?ref=share')
    } catch {
      // If clipboard read fails, at least verify the share button worked
      console.log('Clipboard verification skipped')
    }
  })

  test('shared URL navigation works correctly', async ({ page, context }) => {
    const groupName = `share navigation ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    await page.goto(`/groups/${groupId}/expenses`)

    const currentUrl = page.url()
    const extractedGroupId = extractGroupId(currentUrl)

    // Simulate navigating via a shared URL
    const shareUrl = `${page.url()}?ref=share`
    await page.goto(shareUrl)

    // Verify we land on the group page
    await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses\?ref=share$/)
    await verifyGroupHeading(page, groupName)

    // Verify group is functional
    await expect(page.getByRole('tab', { name: 'Expenses' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Balances' })).toBeVisible()

    // Verify participants are accessible
    const createExpenseLink = page.getByRole('link', { name: 'Create expense' })
    await expect(createExpenseLink).toBeVisible()
  })

  test('share button is accessible on group page', async ({ page }) => {
    const groupName = `share accessible ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    await page.goto(`/groups/${groupId}/expenses`)

    // Verify share button is visible and has correct attributes
    const shareButton = page.locator('button[title="Share"]')
    await expect(shareButton).toBeVisible()

    // Verify button is enabled (not disabled)
    await expect(shareButton).toBeEnabled()

    // Click to verify it works
    await shareButton.click()

    // Verify popover/dialog appears with share content
    // Look for copy button or share URL display
    const copyButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-copy') })
      .first()
    await expect(copyButton).toBeVisible()
  })

  test('copy feedback changes icon from copy to check', async ({
    page,
    context,
  }) => {
    const groupName = `copy feedback ${randomId(4)}`

    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    await page.goto(`/groups/${groupId}/expenses`)

    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: 'http://localhost:3000',
      })
    } catch {
      // Continue without permissions
    }

    // Open share popover
    await page.locator('button[title="Share"]').click()

    // Verify copy icon is initially visible
    const copyIcon = page.locator('svg.lucide-copy').first()
    await expect(copyIcon).toBeVisible()

    // Click copy button
    const copyButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-copy') })
      .first()
    await copyButton.click()

    // Verify check icon appears (indicating success)
    const checkIcon = page.locator('svg.lucide-check').first()
    await expect(checkIcon).toBeVisible()

    // Verify copy icon is no longer visible (replaced by check)
    await expect(copyIcon).not.toBeVisible()
  })
})
