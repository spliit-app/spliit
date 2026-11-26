import { createGroup, uniqueSuffix } from './app'
import { E2E_USER } from './auth-state'
import { expect, test } from './fixtures'

/**
 * Which groups a person sees is an account fact.
 *
 * It used to be a browser fact: the list lived in `localStorage['recentGroups']`
 * with no account attached, so signing up as somebody else in the same browser
 * showed them the previous person's groups. This spec reproduces exactly that.
 */

type Account = { name: string; email: string; password: string }

function newAccount(): Account {
  return {
    name: 'Second Account',
    email: `e2e-switch-${uniqueSuffix()}-${Date.now()}@example.com`,
    password: 'e2e-password-1',
  }
}

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

test('a second account in the same browser does not inherit groups', async ({
  playwright,
  browser,
  baseURL,
}) => {
  // Its own session for the first account: logging out revokes the session row,
  // and the suite shares one stored session between all the other specs.
  const ownerApi = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL! },
  })
  const ownerSignIn = await ownerApi.post('/api/auth/sign-in/email', {
    data: { email: E2E_USER.email, password: E2E_USER.password },
  })
  expect(ownerSignIn.ok()).toBe(true)

  const context = await browser.newContext({
    baseURL,
    storageState: await ownerApi.storageState(),
  })
  const page = await context.newPage()

  const other = newAccount()
  const guestApi = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL! },
  })
  await createAccount(guestApi, other)

  // The first account (the suite's session) creates a group.
  const groupName = `E2E Owned ${uniqueSuffix()}`
  await createGroup(page, { name: groupName, participants: ['Alice', 'Bob'] })

  // The reference is in this browser's localStorage, exactly like the reported
  // case: the next account shares the same storage.
  const stored = await page.evaluate(
    () =>
      JSON.parse(window.localStorage.getItem('recentGroups') ?? '[]') as {
        name: string
      }[],
  )
  expect(stored.map((group) => group.name)).toContain(groupName)

  // Switch accounts in the *same* browser.
  await page.goto('/groups')
  await page.getByTestId('account-menu').click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  // Sign-out is a request; navigating before it settles can race the session.
  await expect(page.getByTestId('account-menu')).toHaveCount(0)
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(other.email)
  await page.locator('input[name="password"]').fill(other.password)
  const [signIn] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/auth/sign-in/email'),
    ),
    page.getByRole('button', { name: 'Log in', exact: true }).click(),
  ])
  // Report the server's reason instead of a bare navigation timeout.
  if (!signIn.ok()) {
    throw new Error(`Sign-in failed: ${signIn.status()} ${await signIn.text()}`)
  }
  await page.waitForURL(/\/groups(\?|$)/, { timeout: 30_000 })

  // Local storage still holds the other account's group…
  const stillStored = await page.evaluate(
    () =>
      JSON.parse(window.localStorage.getItem('recentGroups') ?? '[]') as {
        name: string
      }[],
  )
  expect(stillStored.map((group) => group.name)).toContain(groupName)

  // …but the list is the new account's, which is empty.
  await expect(
    page.getByText('You have not visited any group recently.'),
  ).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(groupName)).toHaveCount(0)

  await context.close()
  await guestApi.dispose()
  await ownerApi.dispose()
})
