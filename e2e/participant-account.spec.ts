import { addExpense, createGroup, daysAgo, openTab, uniqueSuffix } from './app'
import { expect, test } from './fixtures'
import { money } from './ui'

/**
 * Linking a participant to an existing account.
 *
 * This is the difference between "Bob" as a name in a ledger and Bob as a person
 * who is told he owes something. Without it, a reminder only ever reaches
 * whoever claimed a participant themselves.
 */

type Account = { name: string; email: string; password: string }

function newAccount(): Account {
  return {
    name: 'Notified Person',
    email: `e2e-notified-${uniqueSuffix()}-${Date.now()}@example.com`,
    password: 'e2e-password-1',
  }
}

/** better-auth rate-limits sign-up; a few seconds of backoff is enough. */
async function createAccount(
  request: import('@playwright/test').APIRequestContext,
  account: Account,
) {
  let last = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await request.post('/api/auth/sign-up/email', {
      data: account,
      failOnStatusCode: false,
    })
    if (response.ok()) return
    last = `${response.status()} ${await response.text()}`
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  throw new Error(`Could not create ${account.email}: ${last}`)
}

test('the linked account gets the reminder without opening the group', async ({
  page,
  browser,
  playwright,
  baseURL,
}) => {
  const guest = newAccount()
  // A cookie-less context on purpose: the `request` fixture is signed in as the
  // group owner, and better-auth's CSRF check rejects credential changes that
  // carry a session without an Origin header. Browsers always send one, so the
  // context sends one too.
  const guestApi = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL! },
  })
  await createAccount(guestApi, guest)

  const groupId = await createGroup(page, {
    name: `E2E Linked ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'Hotel',
    amount: '100',
    paidBy: 'Alice',
  })

  // Link Bob to an existing account from the group settings.
  await openTab(page, 'Settings')
  await page.locator('input[name="participants.1.email"]').fill(guest.email)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  // The form reports the link once the server stored it; without this the next
  // steps could run against an unlinked participant.
  await expect(page.getByText(/Linked to an account/)).toBeVisible({
    timeout: 20_000,
  })

  // An overdue settle-up addressed to Bob.
  await openTab(page, 'Balances')
  const suggestion = page.locator(
    `[data-testid="reimbursement-row"][data-from="Bob"][data-to="Alice"]`,
  )
  await suggestion.getByRole('button', { name: 'Ask to settle by' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type="date"]').fill(daysAgo(1))
  await dialog.getByRole('button', { name: 'Send settle-up request' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page
      .getByTestId('payment-dues-card')
      .getByTestId('payment-due-row')
      .filter({ hasText: 'Bob' }),
  ).toBeVisible({ timeout: 20_000 })

  // A separate browser signed in as Bob's account.
  const signIn = await guestApi.post('/api/auth/sign-in/email', {
    data: { email: guest.email, password: guest.password },
  })
  expect(signIn.ok()).toBe(true)
  const context = await browser.newContext({
    baseURL,
    storageState: await guestApi.storageState(),
  })
  const guestPage = await context.newPage()

  // Deliberately the group *list*, never the group: the point is that the
  // notice arrives on its own.
  await guestPage.goto('/groups')
  const badge = guestPage.getByTestId('notifications-badge')
  await expect(badge).toHaveText('1', { timeout: 20_000 })

  await guestPage.getByTestId('notifications-bell').click()
  const item = guestPage.getByTestId('notification-item').first()
  await expect(item).toContainText('You owe Alice')
  await expect(item).toContainText(money(50))
  await expect(item).toContainText('1 day late')

  // Opening the group does not ask "Who are you?": the account already owns a
  // participant here, so the answer is server-side, not per browser.
  await guestPage.goto(`/groups/${groupId}/balances`)
  await expect(
    guestPage.getByTestId('payment-dues-card').getByTestId('payment-due-row'),
  ).toContainText('You owe Alice')
  await guestPage.goto(`/groups/${groupId}/expenses`)
  await expect(guestPage.getByRole('dialog')).toHaveCount(0)

  await context.close()
  await guestApi.dispose()
})

test('refuses an email that has no account, and says so', async ({ page }) => {
  await page.goto('/groups/create')
  await page.locator('input[name="name"]').fill(`E2E Unknown ${uniqueSuffix()}`)
  await page
    .locator('input[name="participants.0.email"]')
    .fill('nobody-has-this-address@example.test')

  await page.getByRole('button', { name: 'Create', exact: true }).click()

  // The server refuses the link, and the form shows why instead of failing
  // silently.
  await expect(page.getByText(/no account for/i)).toBeVisible({
    timeout: 20_000,
  })
  expect(page.url()).toContain('/groups/create')
})
