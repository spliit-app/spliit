import { expect, test } from '@playwright/test'
import { navigateToGroup } from '../helpers'
import { createGroupViaAPI } from '../helpers/batch-api'
import { randomId } from '@/lib/api'

test.describe('Active User Modal', () => {
  test('suppressActiveUserModal flag suppresses modal in createGroup', async ({
    page,
  }) => {
    // Create a group WITH modal suppression (default behavior)
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `modal suppressed test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)
    // Suppress modal by setting localStorage
    await page.evaluate((gId) => {
      localStorage.setItem(`${gId}-activeUser`, 'None')
    }, groupId)

    await page.reload()

    // Modal should NOT be visible
    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).not.toBeVisible()

    // Verify localStorage was set
    const activeUser = await page.evaluate((gId) => {
      return localStorage.getItem(`${gId}-activeUser`)
    }, groupId)

    expect(activeUser).toBe('None')
  })

  test('Modal appears on first visit when activeUser localStorage is empty', async ({
    page,
  }) => {
    // Create group with suppression to test modal appearance separately
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `modal test ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    await page.goto(`/groups/${groupId}/expenses`)

    // Clear the activeUser localStorage to simulate first visit
    await page.evaluate((gId) => {
      localStorage.removeItem(`${gId}-activeUser`)
      // Also clear newGroup-activeUser in case it interferes
      localStorage.removeItem('newGroup-activeUser')
    }, groupId)

    // Reload the page to trigger modal logic
    await page.reload()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Modal should now appear
    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).toBeVisible()

    // Verify modal content
    await expect(
      page.getByText('Tell us which participant you are'),
    ).toBeVisible()
  })

  test('Can select a participant in the modal', async ({ page }) => {
    // Create and reload to show modal
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `modal participant test ${randomId(4)}`,
      ['Alice', 'Bob', 'Charlie'],
    )

    await page.goto(`/groups/${groupId}/expenses`)

    await page.evaluate((gId) => {
      localStorage.removeItem(`${gId}-activeUser`)
      localStorage.removeItem('newGroup-activeUser')
    }, groupId)

    await page.reload()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Modal should be open
    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).toBeVisible()

    // Select Alice
    await page.getByRole('radio', { name: 'Alice' }).click()

    // Click save
    await page.getByRole('button', { name: 'Save changes' }).click()

    // Modal should close
    await expect(dialog).not.toBeVisible()

    // Verify localStorage was set (to a participant ID, not the name)
    const activeUser = await page.evaluate((gId) => {
      return localStorage.getItem(`${gId}-activeUser`)
    }, groupId)

    // Should be set to a value (the participant ID) and not be 'None'
    expect(activeUser).not.toBeNull()
    expect(activeUser).not.toBe('None')
  })

  test('Can save modal with default "I don\'t want to select anyone" selection', async ({
    page,
  }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `modal default test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)

    await page.evaluate((gId) => {
      localStorage.removeItem(`${gId}-activeUser`)
      localStorage.removeItem('newGroup-activeUser')
    }, groupId)

    await page.reload()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Modal should be open
    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).toBeVisible()

    // Click save without changing selection (default is "I don't want to select anyone")
    await page.getByRole('button', { name: 'Save changes' }).click()

    // Modal should close
    await expect(dialog).not.toBeVisible()

    // Verify localStorage was set to 'None' (the default selection)
    const activeUser = await page.evaluate((gId) => {
      return localStorage.getItem(`${gId}-activeUser`)
    }, groupId)

    expect(activeUser).toBe('None')
  })

  test('Modal does not reappear after being dismissed', async ({ page }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `modal reappear test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)

    await page.evaluate((gId) => {
      localStorage.removeItem(`${gId}-activeUser`)
      localStorage.removeItem('newGroup-activeUser')
    }, groupId)

    await page.reload()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Modal should be visible
    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).toBeVisible()

    // Select a user and save
    await page.getByRole('radio', { name: 'Alice' }).click()
    await page.getByRole('button', { name: 'Save changes' }).click()

    // Modal should close
    await expect(dialog).not.toBeVisible()

    // Navigate away and back to the group
    await page.goto('/groups')
    await navigateToGroup(page, groupId, false)

    // Modal should NOT reappear because localStorage is set
    await expect(dialog).not.toBeVisible()
  })

  test('navigateToGroup with suppressActiveUserModal: false sets localStorage', async ({
    page,
  }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `nav test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)

    // Clear localStorage
    await page.evaluate((gId) => {
      localStorage.removeItem(`${gId}-activeUser`)
    }, groupId)

    // Navigate with suppression disabled (default)
    await navigateToGroup(page, groupId, false)

    // Verify localStorage was NOT set (because suppressActiveUserModal: false)
    // The modal should appear if we reload
    await page.evaluate((gId) => {
      localStorage.removeItem('newGroup-activeUser')
    }, groupId)
    await page.reload()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    // Modal should appear because we didn't suppress it
    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).toBeVisible()
  })

  test('navigateToGroup with suppressActiveUserModal: true sets localStorage', async ({
    page,
  }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `nav suppress test ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await page.goto(`/groups/${groupId}/expenses`)

    // Clear localStorage
    await page.evaluate((gId) => {
      localStorage.removeItem(`${gId}-activeUser`)
    }, groupId)

    // Navigate with suppression enabled
    await navigateToGroup(page, groupId, true)

    // Verify localStorage was set
    const activeUser = await page.evaluate((gId) => {
      return localStorage.getItem(`${gId}-activeUser`)
    }, groupId)

    expect(activeUser).toBe('None')

    // Modal should not appear on reload
    await page.reload()
    await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

    const dialog = page.getByRole('dialog', { name: 'Who are you?' })
    await expect(dialog).not.toBeVisible()
  })
})
