import {
  createGroup,
  expectBalance,
  expenseCard,
  EXPENSES_URL,
  openExpense,
  openTab,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fieldByLabel, fillStable, money, selectRadixOption } from './ui'

// Groups default to USD, so picking EUR for an expense forces a conversion.
// The rate is mocked, so 80 EUR is always exactly 100 USD.
test.use({ exchangeRate: 1.25 })

const PARTICIPANTS = ['Alice', 'Bob']

type Page = import('@playwright/test').Page

async function openExpenseForm(page: Page, id: string) {
  await page.goto(`/groups/${id}/expenses/create`)
  await expect(
    page.getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible({ timeout: 30_000 })
}

/**
 * Types the foreign amount and blurs it.
 *
 * The blur is load-bearing: expense-form.tsx only recomputes the group-currency
 * amount once `getFieldState('originalAmount').isTouched` is true, and
 * react-hook-form flips that on blur. fill() alone leaves the amount at 0.
 */
async function setOriginalAmount(page: Page, value: string) {
  const input = page.locator('input[name="originalAmount"]')
  await fillStable(input, value)
  await input.blur()
}

test('converts a foreign-currency expense into the group currency', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Currency ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await openExpenseForm(page, groupId)

  // While the expense is in the group's own currency there is nothing to
  // convert, and the conversion fields are present but hidden.
  await expect(page.locator('input[name="originalAmount"]')).toBeHidden()

  await fillStable(page.locator('input[name="title"]'), 'Paris hotel')
  await selectRadixOption(
    page,
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
    /Euro \(EUR\)/,
  )

  await expect(page.locator('input[name="originalAmount"]')).toBeVisible()

  // Typing the foreign amount drives the group-currency amount: 80 x 1.25.
  await setOriginalAmount(page, '80')
  await expect(page.locator('input[name="amount"]')).toHaveValue('100')

  // The fetched rate is surfaced to the user (with non-breaking spaces).
  await expect(page.getByText(/EUR\s*1\s*=\s*USD\s*1\.25/)).toBeVisible()

  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  // The list and the balances are all in the group currency.
  await expect(expenseCard(page, 'Paris hotel')).toContainText(money(100))
  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -50)

  // The original amount and currency survive the round trip.
  await openTab(page, 'Expenses')
  await openExpense(page, 'Paris hotel')
  await expect(page.locator('input[name="originalAmount"]')).toHaveValue(/^80/)
  await expect(
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
  ).toContainText('EUR')
  await expect(page.locator('input[name="amount"]')).toHaveValue(/^100/)
})

test('lets a custom rate override the fetched one', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E CustomRate ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await openExpenseForm(page, groupId)

  await fillStable(page.locator('input[name="title"]'), 'Berlin train')
  await selectRadixOption(
    page,
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
    /Euro \(EUR\)/,
  )
  await setOriginalAmount(page, '80')
  await expect(page.locator('input[name="amount"]')).toHaveValue('100')

  // Opening the custom-rate collapsible stops the API rate being applied.
  await page.getByRole('button', { name: 'Use custom rate' }).click()
  await fillStable(page.locator('input[name="conversionRate"]'), '2')
  await expect(page.locator('input[name="amount"]')).toHaveValue('160')

  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  await expect(expenseCard(page, 'Berlin train')).toContainText(money(160))
  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 80)
  await expectBalance(page, 'Bob', -80)
})

test('exports the original currency and rate to CSV', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E CurrencyExport ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await openExpenseForm(page, groupId)
  await fillStable(page.locator('input[name="title"]'), 'Rome dinner')
  await selectRadixOption(
    page,
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
    /Euro \(EUR\)/,
  )
  await setOriginalAmount(page, '80')
  await expect(page.locator('input[name="amount"]')).toHaveValue('100')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  const response = await page.request.get(
    `/groups/${groupId}/expenses/export/csv`,
  )
  expect(response.status()).toBe(200)

  const csv = await response.text()
  expect(csv).toContain('Rome dinner')
  // Original cost, original currency and conversion rate are dedicated
  // columns, and are only populated for converted expenses.
  expect(csv).toContain('EUR')
  expect(csv).toContain('1.25')
})
