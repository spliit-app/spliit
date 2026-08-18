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

  /**
   * Rate returned for every api.frankfurter.dev request, so currency
   * conversion is deterministic and offline. Null (the default) aborts the
   * request instead, which is what every non-currency spec wants.
   */
  exchangeRate: number | null
}

export const test = base.extend<Options>({
  seedActiveUser: [true, { option: true }],
  exchangeRate: [null, { option: true }],

  // The second argument is Playwright's `use` callback, renamed because
  // eslint-plugin-react-hooks would otherwise read `use(...)` as React's hook.
  page: async ({ page, baseURL, seedActiveUser, exchangeRate }, runTest) => {
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

    // The suite must never depend on a third-party API. useCurrencyRate calls
    // this only when the expense currency differs from the group currency.
    await page.route('https://api.frankfurter.dev/**', (route) => {
      if (exchangeRate === null) return route.abort()

      // Request shape: /v1/<YYYY-MM-DD>?base=<CODE>. The hook turns the
      // response into a RangeError unless `date` echoes the requested date
      // exactly, so mirror it back rather than inventing one.
      const url = new URL(route.request().url())
      const date = url.pathname.split('/').pop() ?? ''
      const base = url.searchParams.get('base') ?? ''

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          base,
          date,
          rates: { USD: exchangeRate, EUR: exchangeRate, GBP: exchangeRate },
        }),
      })
    })

    // Currency and category pickers render flag images from a CDN. Nothing is
    // asserted on them and they only add latency, so keep the run hermetic.
    await page.route('https://flagcdn.com/**', (route) => route.abort())

    await runTest(page)
  },
})

export { expect }
