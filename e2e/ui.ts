import { expect, Locator, Page } from '@playwright/test'

/**
 * Generic UI primitives. These exist to absorb three recurring hazards in this
 * app: React hydration racing the first interaction, Radix rendering its
 * options/dialogs in a portal, and Intl emitting glyphs that vary by ICU build.
 */

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Formats an amount exactly as the app does -- see formatCurrency in
 * src/lib/utils.ts, which builds an Intl.NumberFormat with the group currency.
 * Never hardcode '$30.00' in a spec; call money(30).
 */
export function money(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Folds glyph variants (NBSP, narrow NBSP, U+2212 minus) to their ASCII form. */
export function normalizeMoney(value: string): string {
  return value.replace(/[  ]/g, ' ').replace(/−/g, '-').trim()
}

/**
 * Fills a react-hook-form input and proves the value stuck.
 *
 * Every form field here is controlled by RHF inside a client component that is
 * server-rendered with identical markup, so there is no visual signal for
 * "hydrated". A fill that lands too early is silently reverted to ''. Retrying
 * until the value survives is the only reliable approach.
 */
export async function fillStable(input: Locator, value: string): Promise<void> {
  await expect(async () => {
    await input.fill(value)
    await expect(input).toHaveValue(value, { timeout: 1000 })
  }).toPass({ timeout: 20_000 })
}

/**
 * Picks an option from a Radix Select.
 *
 * Options are portalled to document.body, and the trigger may not respond
 * before hydration. Re-opening on each attempt handles both. Pass a regex for
 * any label containing a non-ASCII glyph (the split modes use an en dash).
 */
export async function selectRadixOption(
  page: Page,
  trigger: Locator,
  option: string | RegExp,
): Promise<void> {
  await expect(async () => {
    const choice = page.getByRole('option', { name: option }).first()
    const alreadyOpen = await choice.isVisible().catch(() => false)
    if (!alreadyOpen) await trigger.click({ timeout: 5_000 })
    await choice.click({ timeout: 5_000 })
  }).toPass({ timeout: 20_000 })
}

/**
 * Sets a Radix Checkbox, which is a <button role="checkbox"> driven by
 * aria-checked rather than an <input>. Playwright's check() is more brittle
 * against it than simply reading state and clicking when it differs.
 */
export async function setChecked(
  checkbox: Locator,
  checked: boolean,
): Promise<void> {
  await expect(async () => {
    const state = await checkbox.getAttribute('aria-checked')
    if ((state === 'true') !== checked) await checkbox.click({ timeout: 5_000 })
    expect(await checkbox.getAttribute('aria-checked')).toBe(String(checked))
  }).toPass({ timeout: 15_000 })
}

/**
 * The <Card> whose CardTitle (an h3) is `title`. Balances and Suggested
 * reimbursements are two structurally identical, unlabelled cards, so
 * assertions have to be scoped to one of them.
 */
export function cardByTitle(page: Page, title: string): Locator {
  return page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=../..')
}

/**
 * The FormItem <div> wrapping the <label> with this exact text. Needed because
 * several Radix Select triggers in expense-form.tsx are not wrapped in
 * FormControl, so their FormLabel's htmlFor points at an element that does not
 * exist and getByLabel() cannot reach them.
 */
export function fieldByLabel(page: Page, label: string): Locator {
  return page
    .locator('label')
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })
    .locator('xpath=..')
}

/** Retries `action` until `settled` succeeds -- for clicks that precede hydration. */
export async function clickUntil(
  action: () => Promise<void>,
  settled: () => Promise<void>,
): Promise<void> {
  await expect(async () => {
    await action()
    await settled()
  }).toPass({ timeout: 20_000 })
}
