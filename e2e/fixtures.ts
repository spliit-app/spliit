import { test as base, expect } from '@playwright/test'

/**
 * Shared test fixture.
 *
 * Two things every spec needs:
 *
 * 1. The "Who are you?" dialog. It opens on a group's expenses page whenever
 *    neither `newGroup-activeUser` nor `<groupId>-activeUser` is in
 *    localStorage, and it is a modal that blocks pointer events. Creating a
 *    group through the UI happens to set the key, but navigating straight to a
 *    group URL does not -- so seed it on every navigation. 'None' is
 *    deliberate: any other value would pre-fill "Paid by" and make expense
 *    tests depend on hidden state.
 *
 * 2. The locale. Assertions are English literals and amounts are formatted by
 *    Intl, so both the app locale (NEXT_LOCALE cookie, which outranks
 *    Accept-Language in src/lib/locale.ts) and the browser locale are pinned.
 */
type Options = {
  /**
   * Seed `newGroup-activeUser` so the "Who are you?" dialog stays shut.
   * Defaults to true. Set `test.use({ seedActiveUser: false })` in the spec
   * that exercises the dialog itself.
   */
  seedActiveUser: boolean
}

export const test = base.extend<Options>({
  seedActiveUser: [true, { option: true }],

  // The second argument is Playwright's `use` callback, renamed because
  // eslint-plugin-react-hooks would otherwise read `use(...)` as React's hook.
  page: async ({ page, baseURL, seedActiveUser }, runTest) => {
    if (baseURL) {
      await page
        .context()
        .addCookies([{ name: 'NEXT_LOCALE', value: 'en-US', url: baseURL }])
    }

    if (seedActiveUser) {
      await page.addInitScript(() => {
        try {
          if (!window.localStorage.getItem('newGroup-activeUser')) {
            window.localStorage.setItem('newGroup-activeUser', 'None')
          }
        } catch (err) {
          // localStorage is unavailable on about:blank; nothing to seed there.
        }
      })
    }

    // The suite must never depend on a third-party API. useCurrencyRate only
    // calls this when the expense currency differs from the group currency,
    // which no test does -- this makes that a guarantee rather than a habit.
    await page.route('https://api.frankfurter.dev/**', (route) => route.abort())

    await runTest(page)
  },
})

export { expect }
