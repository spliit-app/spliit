import { expect, type Page } from '@playwright/test'

/**
 * Creates a group with the specified name and participants
 * @returns The groupId extracted from the URL
 */
export async function createGroup({
  page,
  groupName,
  participants,
  suppressActiveUserModal = true,
}: {
  page: Page
  groupName: string
  participants: string[]
  suppressActiveUserModal?: boolean
}): Promise<string> {
  await page.goto('/groups')
  await page.getByRole('link', { name: 'Create' }).first().click()

  await page.getByLabel('Group name').fill(groupName)

  await fillParticipants(page, participants)

  await page.getByRole('button', { name: 'Create' }).click()
  // Wait for the redirect to complete - webkit needs explicit URL match
  await page.waitForURL(/.*\/groups\/\S+\/expenses$/)

  const groupId = extractGroupId(page.url())

  if (suppressActiveUserModal) {
    await page.evaluate((gId) => {
      localStorage.setItem(`${gId}-activeUser`, 'None')
    }, groupId)
  }

  return groupId
}

/**
 * Fills in participant inputs, adding more if needed, and removes excess ones
 */
export async function fillParticipants(
  page: Page,
  participants: string[],
): Promise<void> {
  const participantInputs = page.getByRole('textbox', { name: 'New' })
  const initialCount = await participantInputs.count()

  // Fill needed participants
  for (let i = 0; i < participants.length; i++) {
    if (i >= initialCount) {
      await page.getByRole('button', { name: 'Add participant' }).click()
      await expect(participantInputs).toHaveCount(i + 1)
    }

    await participantInputs.nth(i).fill(participants[i]!)
  }

  // Remove excess participant inputs if we have fewer than the default (usually 3)
  if (participants.length < initialCount) {
    for (let i = initialCount - 1; i >= participants.length; i--) {
      // Find the remove button for this participant input
      const input = participantInputs.nth(i)
      const container = input.locator(
        'xpath=ancestor::div[contains(@class,"flex")][1]',
      )
      const removeButton = container.locator('button').first()

      if (await removeButton.isVisible()) {
        await removeButton.click()
      }
    }

    // Verify we have the correct count
    await expect(participantInputs).toHaveCount(participants.length)
  }
}

/**
 * Extracts the groupId from a group URL
 * @throws Error if groupId cannot be extracted
 */
export function extractGroupId(url: string): string {
  const groupId = url.match(/\/groups\/([^/]+)(?:\/expenses)?$/)?.[1]
  if (!groupId || groupId === 'create') {
    throw new Error(`Failed to extract groupId from URL: ${url}`)
  }
  return groupId
}

/**
 * Verifies that a group with the specified name exists on the page
 */
export async function verifyGroupHeading(
  page: Page,
  expectedName: string,
): Promise<void> {
  await expect(page.getByRole('heading', { name: expectedName })).toBeVisible()
}

/**
 * Gets the list of participant names from the settings page
 */
export async function getParticipantNames(page: Page): Promise<string[]> {
  const participantInputs = page.getByRole('textbox', { name: 'New' })
  const count = await participantInputs.count()
  const names: string[] = []

  for (let i = 0; i < count; i++) {
    const value = await participantInputs.nth(i).inputValue()
    names.push(value)
  }

  return names
}

/**
 * Verifies participants exist on the Balances tab
 */
export async function verifyParticipantsOnBalancesTab(
  page: Page,
  expectedParticipants: string[],
): Promise<void> {
  for (const participant of expectedParticipants) {
    await expect(page.getByTestId(`balance-row-${participant}`)).toBeVisible()
  }
}

/**
 * Gets the current group info text from the Information tab
 */
export async function getGroupInfo(page: Page): Promise<string | null> {
  const infoElement = page.locator('text=/Info/').first()
  if (!(await infoElement.isVisible())) {
    return null
  }
  return await infoElement.textContent()
}

/**
 * Removes a participant by name from the settings page
 * @returns true if participant was found and removed, false otherwise
 */
export async function removeParticipant(
  page: Page,
  participantName: string,
): Promise<boolean> {
  const participantInput = page.locator(`input[value="${participantName}"]`)

  if (!(await participantInput.isVisible())) {
    return false
  }

  const container = participantInput.locator(
    'xpath=ancestor::div[contains(@class,"flex")][1]',
  )
  const removeButton = container.locator('button:not([disabled])').first()

  if (!(await removeButton.isVisible())) {
    return false
  }

  await removeButton.click()
  return true
}

/**
 * Counts disabled remove buttons (protected participants) on settings page
 */
export async function countProtectedParticipants(page: Page): Promise<number> {
  const disabledRemoveButtons = page.locator(
    'button[disabled] svg.lucide-trash-2',
  )
  return await disabledRemoveButtons.count()
}
