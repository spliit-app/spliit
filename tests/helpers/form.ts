import type { Page } from '@playwright/test'

/**
 * Selects an option from a combobox by placeholder text
 */
export async function selectComboboxOption(
  page: Page,
  placeholder: string,
  optionName: string,
): Promise<void> {
  const select = page.getByRole('combobox').filter({ hasText: placeholder })
  await select.click()
  await page.getByRole('option', { name: optionName }).click()
}

/**
 * Finds and checks a checkbox by searching for label text
 * @returns true if checkbox was found and checked, false otherwise
 */
export async function checkCheckboxByLabel(
  page: Page,
  labelSubstring: string,
): Promise<boolean> {
  const checkboxes = page.locator('input[type="checkbox"]')
  const count = await checkboxes.count()

  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i)
    const label = await checkbox.evaluate((el) => {
      return el.parentElement?.textContent?.toLowerCase() || ''
    })
    if (label.includes(labelSubstring.toLowerCase())) {
      await checkbox.check({ force: true })
      return true
    }
  }

  return false
}
