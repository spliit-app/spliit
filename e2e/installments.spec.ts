import {
  createGroup,
  expenseCard,
  EXPENSES_URL,
  openExpense,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable, selectRadixOption } from './ui'

const PARTICIPANTS = ['Alice', 'Bob']

/** YYYY-MM-DD of the first day of the month `n` months before this one (UTC). */
function firstOfMonthsAgo(n: number): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1))
    .toISOString()
    .slice(0, 10)
}

test('records a purchase in installments, one per month', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Installments ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })

  await page.goto(`/groups/${groupId}/expenses/create`)
  const submit = page.getByRole('button', { name: 'Create', exact: true })
  await expect(submit).toBeVisible({ timeout: 30_000 })
  await fillStable(page.locator('input[name="title"]'), 'Fridge')
  // The purchase total: 100.01 in 4x is 25.01 + 25.00 + 25.00 + 25.00.
  await fillStable(page.locator('input[name="amount"]'), '100.01')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  // Started two months ago: three installments are due, the fourth is next
  // month's.
  await fillStable(page.locator('input[type="date"]'), firstOfMonthsAgo(2))
  await page.getByTestId('recurrence-mode-INSTALLMENTS').click()
  await page.getByRole('button', { name: '4x', exact: true }).click()
  await expect(page.getByTestId('installments-preview')).toContainText(
    '4x: 1st $25.01, then $25.00',
  )
  await submit.click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  await expect
    .poll(async () => await expenseCard(page, 'Fridge').count(), {
      timeout: 20_000,
    })
    .toBe(3)
  const badges = expenseCard(page, 'Fridge').getByTestId('series-badge')
  await expect(badges).toHaveText(['3/4', '2/4', '1/4'])
  await expect(expenseCard(page, 'Fridge').last()).toContainText('$25.01')
  await expect(expenseCard(page, 'Fridge').first()).toContainText('$25.00')

  // The installment plan, from its latest installment.
  await openExpense(page, 'Fridge')
  await expect(page.getByText('Installment 3 of 4')).toBeVisible()
  await expect(page.getByTestId('continue-installments')).toBeChecked()

  // The monthly report only counts this month's installment, and expects the
  // last one next month.
  await page.goto(`/groups/${groupId}/monthly`)
  await expect(page.getByTestId('total-installment')).toHaveText('$25.00')
  await expect(page.getByTestId('installment-plans')).toContainText('Fridge')
  await page.getByTestId('next-month').click()
  const expected = page
    .getByTestId('entries-installment')
    .getByTestId('report-entry')
  await expect(expected).toHaveCount(1)
  await expect(expected).toHaveAttribute('data-expected', 'true')
  await expect(expected.getByTestId('series-badge')).toHaveText('4/4')
})
