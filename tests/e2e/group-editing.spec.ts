import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import {
  clickSave,
  countProtectedParticipants,
  getParticipantNames,
  navigateToTab,
  removeParticipant,
  verifyGroupHeading,
  verifyParticipantsOnBalancesTab,
} from '../helpers'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'

test.describe('Group Editing', () => {
  test('update group name and information', async ({ page }) => {
    const initialGroupName = `edit ${randomId(4)}`
    const newGroupName = `Renamed ${randomId(4)}`
    const newGroupInfo = `Updated info ${randomId(4)}`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, initialGroupName, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToTab(page, 'Settings')

    // Verify initial values in the form
    const groupNameInput = page.getByLabel('Group name')
    await expect(groupNameInput).toHaveValue(initialGroupName)

    // Update group name
    await groupNameInput.clear()
    await groupNameInput.fill(newGroupName)
    await expect(groupNameInput).toHaveValue(newGroupName)

    // Update group information
    const groupInfoInput = page.getByLabel('Group information')
    await groupInfoInput.fill(newGroupInfo)
    await expect(groupInfoInput).toHaveValue(newGroupInfo)

    // Save changes
    await clickSave(page)

    // Navigate to Information tab to verify changes persisted
    await navigateToTab(page, 'Information')

    // Verify updated name in heading
    await verifyGroupHeading(page, newGroupName)

    // Verify updated information text is visible
    await expect(page.getByText(newGroupInfo, { exact: true })).toBeVisible()

    // Verify group name is also updated in the Information section
    await expect(page.getByText(newGroupName, { exact: true })).toBeVisible()
  })

  test('add participant to existing group', async ({ page }) => {
    const groupName = `add participant ${randomId(4)}`
    const initialParticipants = ['Alice', 'Bob', 'Charlie']
    const newParticipant = 'Dave'

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      groupName,
      initialParticipants,
    )

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToTab(page, 'Settings')

    // Verify initial participant count
    const participantInputs = page.getByRole('textbox', { name: 'New' })
    await expect(participantInputs).toHaveCount(initialParticipants.length)

    // Verify initial participant names
    const initialNames = await getParticipantNames(page)
    expect(initialNames).toEqual(initialParticipants)

    // Add new participant
    await page.getByRole('button', { name: 'Add participant' }).click()
    await expect(participantInputs).toHaveCount(initialParticipants.length + 1)

    // Fill new participant name
    const newParticipantInput = participantInputs.nth(
      initialParticipants.length,
    )
    await newParticipantInput.fill(newParticipant)
    await expect(newParticipantInput).toHaveValue(newParticipant)

    // Save changes
    await clickSave(page)

    // Verify new participant appears in Balances tab
    await navigateToTab(page, 'Balances')
    await verifyParticipantsOnBalancesTab(page, [
      ...initialParticipants,
      newParticipant,
    ])

    // Verify participant count in settings
    await navigateToTab(page, 'Settings')
    const updatedNames = await getParticipantNames(page)
    expect(updatedNames).toEqual(
      expect.arrayContaining([...initialParticipants, newParticipant]),
    )
  })

  test('remove unprotected participant', async ({ page }) => {
    const groupName = `remove participant ${randomId(4)}`
    const participants = ['Alice', 'Bob', 'Charlie', 'Dave']
    const participantToRemove = 'Dave'

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, participants)

    // Create an expense with Alice as payer, excluding Dave from the split
    // This protects Alice, Bob, and Charlie (they're involved in the expense)
    // but leaves Dave unprotected (not involved in the expense)
    await createExpenseViaAPI(page, groupId, {
      title: 'Protection seed',
      amount: 1000, // 10.00 in cents
      payerName: 'Alice',
      excludeParticipants: ['Dave'], // Exclude Dave from the expense split
    })

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToTab(page, 'Settings')

    // Verify all 4 participants are present
    await expect(page.getByRole('textbox', { name: 'New' })).toHaveCount(4)

    // Verify 3 protected participants (Alice, Bob, Charlie)
    const protectedCount = await countProtectedParticipants(page)
    expect(protectedCount).toBe(3)

    // Remove Dave (unprotected participant)
    const removed = await removeParticipant(page, participantToRemove)
    expect(removed).toBe(true)

    // Save changes
    await clickSave(page)

    // Verify Dave is removed from Balances tab
    await navigateToTab(page, 'Balances')
    await expect(page.getByText('Dave', { exact: true })).not.toBeVisible()

    // Verify only 3 participants remain
    await verifyParticipantsOnBalancesTab(page, ['Alice', 'Bob', 'Charlie'])

    // Verify in settings that only 3 participants exist
    await navigateToTab(page, 'Settings')
    const remainingNames = await getParticipantNames(page)
    expect(remainingNames).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  test('cannot remove protected participant', async ({ page }) => {
    const groupName = `protected participant ${randomId(4)}`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    // Create an expense with Alice as payer, excluding Bob from the split
    // This makes only Alice protected (she's the payer and sole participant in the expense)
    await createExpenseViaAPI(page, groupId, {
      title: 'Protection expense',
      amount: 2500, // 25.00 in cents
      payerName: 'Alice',
      excludeParticipants: ['Bob'], // Exclude Bob from the expense split
    })

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToTab(page, 'Settings')

    // Verify Alice's remove button is disabled (she's protected)
    const aliceInput = page.locator('input[value="Alice"]')
    await expect(aliceInput).toBeVisible()

    const aliceContainer = aliceInput.locator(
      'xpath=ancestor::div[contains(@class,"flex")][1]',
    )
    const aliceRemoveButton = aliceContainer
      .locator('button svg.lucide-trash-2')
      .first()
    const disabledButton = aliceRemoveButton.locator(
      'xpath=ancestor::button[@disabled]',
    )

    // Verify the remove button is disabled
    await expect(disabledButton).toBeVisible()

    // Verify only Alice is protected (Bob can be removed)
    const protectedCount = await countProtectedParticipants(page)
    expect(protectedCount).toBe(1)

    // Verify Bob's remove button is enabled
    const bobInput = page.locator('input[value="Bob"]')
    await expect(bobInput).toBeVisible()
    const bobContainer = bobInput.locator(
      'xpath=ancestor::div[contains(@class,"flex")][1]',
    )
    const bobRemoveButton = bobContainer
      .locator('button:not([disabled])')
      .first()
    await expect(bobRemoveButton).toBeVisible()
  })

  test('edit group with empty information field', async ({ page }) => {
    const groupName = `empty info ${randomId(4)}`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, ['Alice', 'Bob'])

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToTab(page, 'Settings')

    // Verify information field is initially empty
    const groupInfoInput = page.getByLabel('Group information')
    await expect(groupInfoInput).toHaveValue('')

    // Add some information
    const testInfo = 'Test information'
    await groupInfoInput.fill(testInfo)
    await clickSave(page)

    // Verify information appears
    await navigateToTab(page, 'Information')
    await expect(page.getByText(testInfo, { exact: true })).toBeVisible()

    // Now remove the information
    await navigateToTab(page, 'Settings')
    await groupInfoInput.clear()
    await expect(groupInfoInput).toHaveValue('')
    await clickSave(page)

    // Verify information is cleared
    await navigateToTab(page, 'Information')
    await expect(page.getByText(testInfo, { exact: true })).not.toBeVisible()
  })

  test('cannot create duplicate participant names when editing', async ({
    page,
  }) => {
    const groupName = `duplicate edit ${randomId(4)}`

    // Setup via API
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, groupName, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    await page.goto(`/groups/${groupId}/expenses`)
    await navigateToTab(page, 'Settings')

    // Try to rename Bob to Alice (duplicate)
    const participantInputs = page.getByRole('textbox', { name: 'New' })
    const bobInput = participantInputs.nth(1)

    await bobInput.clear()
    await bobInput.fill('Alice')

    // Save changes
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify duplicate error message appears
    await expect(
      page.getByText('Another participant already has this name.'),
    ).toBeVisible()

    // Verify we're still on settings page (save failed)
    await expect(page).toHaveURL(/\/groups\/[^/]+\/edit$/)
  })
})
