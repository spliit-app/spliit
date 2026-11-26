import { addExpense, createGroup, daysAgo, uniqueSuffix } from './app'
import { E2E_USER, SIGNED_OUT_STATE } from './auth-state'
import { expect, test } from './fixtures'

/**
 * Accounts: sign-up, and the header bell that only becomes possible once the app
 * knows who you are.
 *
 * `seedActiveUser: false` so the "Who are you?" dialog can be used the way a
 * first-time visitor sees it -- that answer is what links a ledger identity to
 * the account, and therefore what makes the reminder appear.
 */
test.use({ seedActiveUser: false, storageState: SIGNED_OUT_STATE })

test('registers, links a participant and gets the reminder in the header', async ({
  page,
}) => {
  const email = `e2e-${uniqueSuffix()}-${Date.now()}@example.com`
  const password = 'e2e-password-1'

  await page.goto('/register')
  await page.locator('input[name="name"]').fill('E2E Bob')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL(/\/groups(\?|$)/, { timeout: 30_000 })

  await expect(page.getByTestId('account-menu')).toBeVisible()
  await expect(page.getByTestId('notifications-bell')).toBeVisible()

  const groupId = await createGroup(page, {
    name: `E2E Account ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'Hotel',
    amount: '100',
    paidBy: 'Alice',
  })

  // Force the "Who are you?" dialog and answer as Bob: choosing a name is what
  // claims the participant for the signed-in account.
  await page.evaluate((id) => {
    window.localStorage.removeItem('newGroup-activeUser')
    window.localStorage.removeItem(`${id}-activeUser`)
  }, groupId)
  await page.goto(`/groups/${groupId}/expenses`)
  const dialog = page.getByRole('dialog', { name: /Who are you/ })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('radio', { name: 'Bob' }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()

  // An overdue settle-up, so the reminder is deterministic.
  await page.goto(`/groups/${groupId}/balances`)
  const suggestion = page.locator(
    `[data-testid="reimbursement-row"][data-from="Bob"][data-to="Alice"]`,
  )
  await suggestion.getByRole('button', { name: 'Ask to settle by' }).click()
  const settleDialog = page.getByRole('dialog')
  await settleDialog.locator('input[type="date"]').fill(daysAgo(1))
  await settleDialog
    .getByRole('button', { name: 'Send settle-up request' })
    .click()
  await expect(settleDialog).toBeHidden()

  // The claim and the obligation reach the header without a reload.
  const badge = page.getByTestId('notifications-badge')
  await expect(badge).toHaveText('1', { timeout: 20_000 })

  await page.getByTestId('notifications-bell').click()
  const item = page.getByTestId('notification-item').first()
  await expect(item).toContainText('You owe Alice')
  await expect(item).toContainText('$50.00')
  await expect(item).toContainText('1 day late')

  await item.click()
  await page.waitForURL(new RegExp(`/groups/${groupId}/balances`))
})

test('rejects a wrong password without signing in', async ({ page }) => {
  // The shared account, so this costs no extra registration: better-auth
  // rate-limits sign-up too, and the suite should not spend that budget here.
  const email = E2E_USER.email

  await page.goto('/login')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('not-the-password')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()

  await expect(page.getByText('Invalid email or password')).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByTestId('account-menu')).toHaveCount(0)
})
