import { expect, Locator, Page } from '@playwright/test'
import {
  clickUntil,
  escapeRegExp,
  fieldByLabel,
  fillStable,
  money,
  selectRadixOption,
  setChecked,
} from './ui'

export type SplitMode = 'EVENLY' | 'BY_SHARES' | 'BY_PERCENTAGE' | 'BY_AMOUNT'

export type Recurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly'

export type GroupTab =
  'Expenses' | 'Balances' | 'Information' | 'Stats' | 'Activity' | 'Settings'

const TAB_PATHS: Record<GroupTab, string> = {
  Expenses: 'expenses',
  Balances: 'balances',
  Information: 'information',
  Stats: 'stats',
  Activity: 'activity',
  Settings: 'edit',
}

// Regexes, not literals: the labels are "Unevenly – By shares" with an en dash.
const SPLIT_MODE_LABELS: Record<SplitMode, RegExp> = {
  EVENLY: /^Evenly$/,
  BY_SHARES: /By shares/,
  BY_PERCENTAGE: /By percentage/,
  BY_AMOUNT: /By amount/,
}

/** GroupForm ships with three participant rows pre-filled (John / Jane / Jack). */
const PREFILLED_PARTICIPANTS = 3

/**
 * The expenses list URL.
 *
 * Anchored deliberately: an unanchored /groups/<id>/expenses also matches
 * /groups/<id>/expenses/create, so waiting on it would return instantly while
 * still sitting on the form and let assertions run before the write landed.
 */
export const EXPENSES_URL = /\/groups\/[^/]+\/expenses(\?|$)/

/** Short random suffix so group names are unique on the shared database. */
export function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

export async function createGroup(
  page: Page,
  opts: { name: string; participants: string[] },
): Promise<string> {
  await page.goto('/groups/create')

  // fillStable doubles as the hydration gate: once RHF keeps a value, React is
  // live and later clicks are safe.
  await fillStable(page.locator('input[name="name"]'), opts.name)

  for (let i = PREFILLED_PARTICIPANTS; i < opts.participants.length; i++) {
    await page.getByRole('button', { name: 'Add participant' }).click()
    await expect(
      page.locator(`input[name="participants.${i}.name"]`),
    ).toBeVisible()
  }

  // Drop surplus rows from the end, so the remaining indices never shift.
  for (let i = PREFILLED_PARTICIPANTS - 1; i >= opts.participants.length; i--) {
    const row = page
      .locator('li')
      .filter({ has: page.locator(`input[name="participants.${i}.name"]`) })
    await row.getByRole('button').click()
    await expect(
      page.locator(`input[name="participants.${i}.name"]`),
    ).toHaveCount(0)
  }

  for (let i = 0; i < opts.participants.length; i++) {
    await fillStable(
      page.locator(`input[name="participants.${i}.name"]`),
      opts.participants[i],
    )
  }

  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  const groupId = /\/groups\/([^/]+)\/expenses/.exec(page.url())
  if (!groupId) throw new Error(`Could not read group id from ${page.url()}`)
  return groupId[1]
}

export async function addExpense(
  page: Page,
  groupId: string,
  expense: {
    title: string
    /** As typed, e.g. '90' or '12.34'. */
    amount: string
    /** Participant name. */
    paidBy: string
    /** Participant names. Omit to leave every participant checked. */
    paidFor?: string[]
    splitMode?: SplitMode
    /** Participant name -> share value. Set one for every checked participant. */
    shares?: Record<string, string>
    /** YYYY-MM-DD. Defaults to today. */
    date?: string
    /** Visible category name, e.g. 'Groceries'. Defaults to General. */
    category?: string
    /** Visible label: 'None' | 'Daily' | 'Weekly' | 'Monthly'. Defaults to None. */
    recurrence?: Recurrence
  },
): Promise<void> {
  await page.goto(`/groups/${groupId}/expenses/create`)

  // CreateExpenseForm returns null until its tRPC queries resolve, so the
  // submit button appearing means both hydrated and data-ready.
  const submit = page.getByRole('button', { name: 'Create', exact: true })
  await expect(submit).toBeVisible({ timeout: 30_000 })

  await fillStable(page.locator('input[name="title"]'), expense.title)
  // Amount before split mode: BY_AMOUNT re-distributes shares whenever the
  // amount changes, which would wipe values set beforehand.
  await fillStable(page.locator('input[name="amount"]'), expense.amount)
  await selectRadixOption(page, page.getByTestId('paid-by'), expense.paidBy)

  if (expense.date) {
    // The date input spreads no RHF field, so it has no name attribute.
    await fillStable(page.locator('input[type="date"]'), expense.date)
  }

  if (expense.category) {
    // A cmdk Command in a Popover, not a Radix Select, but the trigger is still
    // role=combobox and the items are still role=option.
    await selectRadixOption(
      page,
      fieldByLabel(page, 'Category').getByRole('combobox'),
      expense.category,
    )
  }

  if (expense.recurrence) {
    await selectRadixOption(
      page,
      fieldByLabel(page, 'Expense Recurrence').getByRole('combobox'),
      expense.recurrence,
    )
  }

  if (expense.paidFor) {
    const wanted = expense.paidFor
    const rows = await page.locator('[data-id]').all()
    for (const row of rows) {
      const label = (await row.innerText()).split('\n')[0].trim()
      const name = label.replace(/\s*\(.*\)$/, '')
      await setChecked(row.getByRole('checkbox'), wanted.indexOf(name) !== -1)
    }
  }

  const splitMode = expense.splitMode ?? 'EVENLY'
  if (splitMode !== 'EVENLY') {
    // Radix Collapsible unmounts its content, so the Split mode select does
    // not exist in the DOM until this is opened.
    await page
      .getByRole('button', { name: /Advanced splitting options/ })
      .click()
    await selectRadixOption(
      page,
      page.getByTestId('split-mode'),
      SPLIT_MODE_LABELS[splitMode],
    )
  }

  if (expense.shares) {
    // Set every participant's share, not just the ones being changed: under
    // BY_AMOUNT the form auto-distributes to whoever has not been edited yet.
    const shares = expense.shares
    const names = Object.keys(shares)
    for (const name of names) {
      await fillStable(
        paidForRow(page, name).getByRole('textbox'),
        shares[name],
      )
    }
  }

  await submit.click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })
}

export async function openTab(page: Page, tab: GroupTab): Promise<void> {
  const path = new RegExp(`/groups/[^/]+/${TAB_PATHS[tab]}(\\?|$)`)
  await clickUntil(
    () => page.getByRole('tab', { name: tab, exact: true }).click(),
    () => page.waitForURL(path, { timeout: 5_000 }),
  )
}

/** Opens an expense for editing. The card is a div with onClick, not a link. */
export async function openExpense(page: Page, title: string): Promise<void> {
  await clickUntil(
    () =>
      page
        .getByTestId('expense-card')
        .filter({ hasText: title })
        .first()
        .click(),
    () => page.waitForURL(/\/expenses\/[^/]+\/edit/, { timeout: 5_000 }),
  )
}

/**
 * A "Paid for" row on the expense form. Scoped by the checkbox's accessible
 * name because the share inputs inside these rows share a duplicated id and
 * carry no name attribute -- the row is the only way to tell them apart.
 */
export function paidForRow(page: Page, participant: string): Locator {
  return page.locator('[data-id]').filter({
    has: page.getByRole('checkbox', {
      name: new RegExp(`^${escapeRegExp(participant)}\\b`),
    }),
  })
}

/**
 * Makes `name` the active user for this group.
 *
 * Goes through the app's own migration path rather than writing the id
 * directly: ExpenseList resolves `newGroup-activeUser` from a participant name
 * to an id on mount. Writing `<groupId>-activeUser` by hand would not survive,
 * because the shared fixture re-seeds `newGroup-activeUser` on every
 * navigation and that migration always wins.
 */
export async function setActiveUser(
  page: Page,
  groupId: string,
  name: string,
): Promise<void> {
  await page.addInitScript((participantName) => {
    window.localStorage.setItem('newGroup-activeUser', participantName)
  }, name)

  await page.goto(`/groups/${groupId}/expenses`)

  await expect
    .poll(
      () =>
        page.evaluate(
          (id) => window.localStorage.getItem(`${id}-activeUser`) ?? '',
          groupId,
        ),
      { timeout: 20_000 },
    )
    .not.toMatch(/^(|None)$/)
}

/** An expense row in the list. */
export function expenseCard(page: Page, title: string): Locator {
  return page.getByTestId('expense-card').filter({ hasText: title })
}

/** YYYY-MM-DD, n days before today. The suite pins the timezone to UTC. */
export function daysAgo(n: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - n)
  return date.toISOString().slice(0, 10)
}

export function balanceRow(page: Page, participant: string): Locator {
  return page.locator(
    `[data-testid="balance-row"][data-participant="${participant}"]`,
  )
}

export async function expectBalance(
  page: Page,
  participant: string,
  amount: number,
): Promise<void> {
  await expect(balanceRow(page, participant)).toContainText(money(amount))
}

export function reimbursementRow(
  page: Page,
  from: string,
  to: string,
): Locator {
  return page.locator(
    `[data-testid="reimbursement-row"][data-from="${from}"][data-to="${to}"]`,
  )
}
