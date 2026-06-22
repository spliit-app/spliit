import { expect, test } from '@playwright/test'
import { fillParticipants, verifyGroupHeading } from '../helpers'
import { randomId } from '@/lib/api'

test.describe('Group Creation', () => {
  test('create group with custom currency', async ({ page }) => {
    const groupName = `custom currency ${randomId(4)}`

    await page.goto('/groups')
    await page.getByRole('link', { name: 'Create' }).first().click()

    // Verify we're on the creation page
    await expect(page).toHaveURL('/groups/create')

    await page.getByLabel('Group name').fill(groupName)

    // Select "Custom" currency (empty code)
    await page.locator('[role="combobox"]').first().click()
    await page.getByRole('option', { name: 'Custom' }).click()

    // Verify currency symbol input is visible and fill it
    const currencySymbolInput = page.getByLabel('Currency symbol')
    await expect(currencySymbolInput).toBeVisible()
    await currencySymbolInput.fill('$')

    // Verify the currency symbol has the expected value
    await expect(currencySymbolInput).toHaveValue('$')

    await fillParticipants(page, ['Alice', 'Bob', 'Charlie'])

    await page.getByRole('button', { name: 'Create' }).click()

    // Verify redirect to group expenses page with correct URL pattern
    await expect(page).toHaveURL(/\/groups\/[a-zA-Z0-9_-]+\/expenses$/)

    // Verify group was created with the correct name
    await verifyGroupHeading(page, groupName)

    // Verify the expenses tab is active
    await expect(page.getByRole('tab', { name: 'Expenses' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('validate group creation form', async ({ page }) => {
    await page.goto('/groups')
    await page.getByRole('link', { name: 'Create' }).first().click()

    // Test: Submit empty form should show validation errors
    await page.getByRole('button', { name: 'Create' }).click()

    // Verify group name validation (requires min 2 characters)
    const groupNameErrors = page.getByText('Enter at least two characters.')
    await expect(groupNameErrors.first()).toBeVisible()

    // Test: Group name with 1 character should fail
    await page.getByLabel('Group name').fill('A')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(groupNameErrors.first()).toBeVisible()

    // Test: Valid group name with 2 characters should pass name validation
    const validName = `validation ${randomId(4)}`
    await page.getByLabel('Group name').fill(validName)

    // Test: Participant name with 1 character should fail
    const participantInputs = page.getByRole('textbox', { name: 'New' })
    await expect(participantInputs).toHaveCount(3)

    await participantInputs.nth(0).fill('A')
    await page.getByRole('button', { name: 'Create' }).click()

    // Verify participant name validation
    await expect(
      page.getByText('Enter at least two characters.').first(),
    ).toBeVisible()

    // Test: Duplicate participant names should fail
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Alice')
    await participantInputs.nth(2).fill('Bob')

    await page.getByRole('button', { name: 'Create' }).click()

    // Verify duplicate name error
    const duplicateError = page.getByText(
      'Another participant already has this name.',
    )
    await expect(duplicateError.first()).toBeVisible()

    // Test: Valid form should succeed
    await participantInputs.nth(0).fill('Alice')
    await participantInputs.nth(1).fill('Bob')
    await participantInputs.nth(2).fill('Charlie')

    await page.getByRole('button', { name: 'Create' }).click()

    // Verify successful creation
    await expect(page).toHaveURL(/\/groups\/[a-zA-Z0-9_-]+\/expenses$/)
    await verifyGroupHeading(page, validName)
  })

  test('create group with default currency', async ({ page }) => {
    const groupName = `default currency ${randomId(4)}`

    await page.goto('/groups')
    await page.getByRole('link', { name: 'Create' }).first().click()

    await page.getByLabel('Group name').fill(groupName)

    // Verify default currency is pre-selected (should be EUR or USD typically)
    const currencyCombobox = page.locator('[role="combobox"]').first()
    const currencyText = await currencyCombobox.textContent()
    expect(currencyText).toBeTruthy()
    expect(currencyText?.length).toBeGreaterThan(0)

    await fillParticipants(page, ['Alice', 'Bob'])

    await page.getByRole('button', { name: 'Create' }).click()

    // Verify successful creation
    await expect(page).toHaveURL(/\/groups\/[a-zA-Z0-9_-]+\/expenses$/)
    await verifyGroupHeading(page, groupName)
  })

  test('create group with many participants', async ({ page }) => {
    const groupName = `many participants ${randomId(4)}`

    await page.goto('/groups')
    await page.getByRole('link', { name: 'Create' }).first().click()

    await page.getByLabel('Group name').fill(groupName)

    // Add 5 participants by using the add button
    const participants = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve']
    await fillParticipants(page, participants)

    // Verify we have 5 participant inputs
    const participantInputs = page.getByRole('textbox', { name: 'New' })
    await expect(participantInputs).toHaveCount(5)

    await page.getByRole('button', { name: 'Create' }).click()

    // Verify successful creation
    await verifyGroupHeading(page, groupName)
  })
})
