import {
  addExpense,
  createGroup,
  expectBalance,
  expenseCard,
  EXPENSES_URL,
  openExpense,
  openTab,
  reimbursementRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fieldByLabel, money, selectRadixOption } from './ui'

// Groups default to USD, so picking EUR forces a conversion. The rate is
// mocked, so 1 EUR is always exactly 1.25 USD.
test.use({ exchangeRate: 1.25 })

const PARTICIPANTS = ['Alice', 'Bob']

/** Creates a group where Bob owes Alice 50, and opens "Mark as paid". */
async function openRepaymentForm(page: Page, name: string): Promise<string> {
  const groupId = await createGroup(page, {
    name: `${name} ${uniqueSuffix()}`,
    participants: PARTICIPANTS,
  })
  await addExpense(page, groupId, {
    title: 'Hotel',
    amount: '100',
    paidBy: 'Alice',
  })

  await openTab(page, 'Balances')
  await reimbursementRow(page, 'Bob', 'Alice')
    .getByRole('link', { name: 'Mark as paid' })
    .click()
  await page.waitForURL(/\/expenses\/create\?.*reimbursement=yes/, {
    timeout: 30_000,
  })
  return groupId
}

const originalAmount = (page: Page) =>
  page.locator('input[name="originalAmount"]')

type Page = import('@playwright/test').Page

test('derives the transfer amount from the balance being settled', async ({
  page,
}) => {
  await openRepaymentForm(page, 'E2E Repayment')

  // The balance is the authoritative figure and stays in the group currency.
  await expect(page.locator('input[name="amount"]')).toHaveValue(/^50/)

  await selectRadixOption(
    page,
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
    /Euro \(EUR\)/,
  )

  // 50 USD at 1 EUR = 1.25 USD is 40 EUR, filled in without the user typing.
  // This is the reverse of the regular-expense direction, where the foreign
  // amount is what drives the group-currency one.
  await expect(originalAmount(page)).toHaveValue('40.00')
  await expect(page.getByText('Amount to transfer')).toBeVisible()
  // Derived, so it must not be editable.
  await expect(originalAmount(page)).toHaveAttribute('readonly', '')
})

test('settles the balance exactly and keeps the transferred amount', async ({
  page,
}) => {
  await openRepaymentForm(page, 'E2E Repayment Settle')

  await selectRadixOption(
    page,
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
    /Euro \(EUR\)/,
  )
  await expect(originalAmount(page)).toHaveValue('40.00')

  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  // The card carries both figures: what settles the balance and what moved.
  const card = expenseCard(page, 'Reimbursement')
  await expect(card).toContainText(money(50))
  await expect(card).toContainText(money(40, 'EUR'))

  // The point of keeping the group amount authoritative: the balance is zero,
  // not "zero apart from a rounding remainder".
  await openTab(page, 'Balances')
  await expectBalance(page, 'Alice', 0)
  await expectBalance(page, 'Bob', 0)

  // Reopening must not rewrite the stored amount at today's rate.
  await openTab(page, 'Expenses')
  await openExpense(page, 'Reimbursement')
  await expect(originalAmount(page)).toHaveValue(/^40/)
})

test('refreshing the exchange rate does not submit the form', async ({
  page,
}) => {
  const groupId = await openRepaymentForm(page, 'E2E Repayment Refresh')

  await selectRadixOption(
    page,
    fieldByLabel(page, 'Currency of expense').getByRole('combobox'),
    /Euro \(EUR\)/,
  )
  await expect(originalAmount(page)).toHaveValue('40.00')

  await page.getByRole('button', { name: 'Refresh' }).click()

  // Asserting that nothing happens, so it needs a settling period rather than
  // an immediate check: a submit navigates a second or two later, and
  // toHaveURL would match the create URL before that lands.
  await expect(
    page.waitForURL(EXPENSES_URL, { timeout: 5_000 }),
  ).rejects.toThrow()

  await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/expenses/create`))
  await expect(originalAmount(page)).toHaveValue('40.00')
})
