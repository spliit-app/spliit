import { expect, type Page } from '@playwright/test'

export type GroupTab =
  | 'Expenses'
  | 'Balances'
  | 'Stats'
  | 'Settings'
  | 'Information'
  | 'Activity'

const TAB_URL_PATTERNS: Record<GroupTab, RegExp> = {
  Expenses: /\/groups\/[^/]+\/expenses$/,
  Balances: /\/groups\/[^/]+\/balances$/,
  Stats: /\/groups\/[^/]+\/stats$/,
  Settings: /\/groups\/[^/]+\/edit$/,
  Information: /\/groups\/[^/]+\/information$/,
  Activity: /\/groups\/[^/]+\/activity$/,
}

/**
 * Navigates to a group's expenses page with proper handling of redirects.
 * The /groups/{id} page redirects to /groups/{id}/expenses, so we navigate
 * directly to the final URL to avoid timing issues in webkit.
 */
export async function navigateToGroup(
  page: Page,
  groupId: string,
  suppressActiveUserModal = true,
): Promise<void> {
  await page.goto(`/groups/${groupId}/expenses`)
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/)

  if (suppressActiveUserModal) {
    await page.evaluate((gId) => {
      localStorage.setItem(`${gId}-activeUser`, 'None')
    }, groupId)
  }
}

/**
 * Navigates to a specific tab in the group view
 */
export async function navigateToTab(page: Page, tab: GroupTab): Promise<void> {
  const tabButton = page.getByRole('tab', { name: tab })
  await tabButton.waitFor({ state: 'visible' })
  await tabButton.click()
  await page.waitForURL(TAB_URL_PATTERNS[tab])
}

/**
 * Switches the application locale/language
 */
export async function switchLocale(
  page: Page,
  localeName: string,
): Promise<void> {
  // Click the current locale button to open menu
  const localeButton = page
    .getByRole('button')
    .filter({ hasText: /English|Español|Français|Deutsch/ })
  await localeButton.click()

  // Select the desired locale
  const localeOption = page.getByRole('menuitem', { name: localeName })
  await localeOption.click()
  await expect(localeButton).toHaveText(localeName)
}

/**
 * Sets the active user in group settings
 */
export async function setActiveUser(
  page: Page,
  userName: string,
): Promise<void> {
  await navigateToTab(page, 'Settings')

  // Open the active user selector
  const activeUserSelector = page.getByTestId('active-user-selector')
  await activeUserSelector.click()

  // Select the user
  await page.getByRole('option', { name: userName }).click()

  // Save the settings
  await clickSave(page)
}

export async function clickSave(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(
    page.getByRole('main').locator('div').filter({ hasText: 'Saving…' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
}
