import { AUTH_STATE_PATH, E2E_USER, SIGNED_OUT_STATE } from './auth-state'
import { expect, test } from './fixtures'

/**
 * The login wall: what an anonymous visitor can and cannot reach, and whether a
 * group link survives the sign-in round-trip. Losing `?next=` would make every
 * shared link useless, which is the main risk of putting a wall in front of an
 * app that used to be reachable by URL alone.
 */
test.use({ storageState: SIGNED_OUT_STATE })

test('sends an anonymous group visitor to login, then back to the group', async ({
  page,
}) => {
  // A group id that does not exist: the point is the redirect and the return
  // path, and this keeps the spec independent of seeding.
  const target = '/groups/this-group-does-not-exist/balances'

  await page.goto(target)
  await expect(page).toHaveURL(/\/login\?next=/)
  expect(new URL(page.url()).searchParams.get('next')).toBe(target)

  await page.locator('input[name="email"]').fill(E2E_USER.email)
  await page.locator('input[name="password"]').fill(E2E_USER.password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()

  // Back where they were going, not on the group list.
  await page.waitForURL(new RegExp(target.replace(/\//g, '\\/')), {
    timeout: 30_000,
  })
})

test('refuses the API and the exports without a session', async ({
  page,
  request,
}) => {
  // tRPC: every groups.* procedure is protected, so no ledger data leaks.
  const query = await request.get(
    `/api/trpc/groups.get?input=${encodeURIComponent(
      JSON.stringify({ json: { groupId: 'any' } }),
    )}`,
  )
  expect(query.status()).toBe(401)

  // Route handlers are outside the layout, so the wall has to catch them too.
  const csv = await request.get('/groups/any/expenses/export/csv', {
    maxRedirects: 0,
  })
  expect([307, 401]).toContain(csv.status())

  // And the pages themselves.
  await page.goto('/groups')
  await expect(page).toHaveURL(/\/login\?next=%2Fgroups$/)
})

test('keeps a signed-in visitor away from the auth pages', async ({
  page,
  browser,
  baseURL,
}) => {
  // This spec as a whole runs signed out: no session cookie, only the locale.
  const state = await page.context().storageState()
  expect(
    state.cookies.some(({ name }) => name === 'spliit.session_token'),
  ).toBe(false)

  // A second, signed-in context: `use.storageState` applies to the fixture's
  // context only, so this is the way to get both states in one test.
  const signedIn = await browser.newContext({
    baseURL,
    storageState: AUTH_STATE_PATH,
  })
  const signedInPage = await signedIn.newPage()

  await signedInPage.goto('/login')
  await expect(signedInPage).toHaveURL(/\/groups$/)

  await signedIn.close()
})

test.describe('signed in', () => {
  // Its own session: signing out revokes the session row in the database, and
  // this suite shares one stored session between every other spec.
  test.use({ storageState: SIGNED_OUT_STATE })

  test('logs out from the account menu, and the wall closes again', async ({
    page,
    browser,
    request,
    baseURL,
  }) => {
    const signIn = await request.post('/api/auth/sign-in/email', {
      data: { email: E2E_USER.email, password: E2E_USER.password },
    })
    expect(signIn.ok()).toBe(true)
    const state = await request.storageState()

    const context = await browser.newContext({ baseURL, storageState: state })
    const signedInPage = await context.newPage()

    await signedInPage.goto('/groups')
    await expect(signedInPage.getByTestId('account-menu')).toBeVisible({
      timeout: 20_000,
    })

    await signedInPage.getByTestId('account-menu').click()
    await signedInPage.getByRole('menuitem', { name: 'Log out' }).click()

    // The header flips to the signed-out state…
    await expect(signedInPage.getByTestId('account-menu')).toHaveCount(0)
    await expect(
      signedInPage.getByRole('link', { name: 'Log in' }),
    ).toBeVisible()

    // …and the wall is back on the next navigation.
    await signedInPage.goto('/groups')
    await expect(signedInPage).toHaveURL(/\/login\?next=/)

    await context.close()
  })
})
