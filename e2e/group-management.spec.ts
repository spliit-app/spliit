import {
  addExpense,
  createGroup,
  expectBalance,
  openTab,
  paidForRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable } from './ui'

test('renames a group and adds a participant afterwards', async ({ page }) => {
  const original = `E2E Settings ${uniqueSuffix()}`
  const groupId = await createGroup(page, {
    name: original,
    participants: ['Alice', 'Bob', 'Carol'],
  })

  await addExpense(page, groupId, {
    title: 'Brunch',
    amount: '60',
    paidBy: 'Alice',
  })

  await openTab(page, 'Settings')

  const renamed = `${original} renamed`
  await fillStable(page.locator('input[name="name"]'), renamed)

  // A participant already involved in an expense cannot be removed.
  const aliceRow = page
    .locator('li')
    .filter({ has: page.locator('input[name="participants.0.name"]') })
  await expect(aliceRow.getByRole('button')).toBeDisabled()

  await page.getByRole('button', { name: 'Add participant' }).click()
  await fillStable(page.locator('input[name="participants.3.name"]'), 'Dave')

  // EditGroup saves in place rather than navigating.
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: renamed, exact: true }),
  ).toBeVisible({ timeout: 30_000 })

  // The new participant must be usable straight away.
  await addExpense(page, groupId, {
    title: 'Drinks',
    amount: '80',
    paidBy: 'Dave',
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(paidForRow(page, 'Dave')).toBeVisible()

  await page.goto(`/groups/${groupId}/balances`)
  // Brunch: 60 over 3 (Dave did not exist yet). Drinks: 80 over 4 = 20 each.
  await expectBalance(page, 'Dave', 60)
})

test('lists visited groups under Recent groups', async ({ page }) => {
  const first = `E2E Recent A ${uniqueSuffix()}`
  const second = `E2E Recent B ${uniqueSuffix()}`

  await createGroup(page, { name: first, participants: ['Alice', 'Bob'] })
  await createGroup(page, { name: second, participants: ['Alice', 'Bob'] })

  await page.goto('/groups')
  await expect(
    page.getByRole('heading', { name: 'Recent groups' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: first })).toBeVisible()
  await expect(page.getByRole('link', { name: second })).toBeVisible()
})

test('shows no recent groups in a fresh browser profile', async ({ page }) => {
  // Recent groups live in localStorage, so a new context must start empty even
  // though other tests have created groups on the same database.
  await page.goto('/groups')
  await expect(
    page.getByText('You have not visited any group recently.'),
  ).toBeVisible()
})

test('records group and expense changes in the activity log', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Activity ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })

  await addExpense(page, groupId, {
    title: 'Cinema',
    amount: '20',
    paidBy: 'Alice',
  })

  await openTab(page, 'Activity')

  const activity = page.getByText(/Expense .*Cinema.* created by/)
  await expect(activity).toBeVisible()
  // The active user is 'None', so the actor renders as the generic fallback.
  await expect(activity).toContainText('Someone')
})

test('exports the expenses as JSON', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E ExportJson ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })

  await addExpense(page, groupId, {
    title: 'Ferry',
    amount: '18',
    paidBy: 'Bob',
  })

  const response = await page.request.get(
    `/groups/${groupId}/expenses/export/json`,
  )
  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(JSON.stringify(body)).toContain('Ferry')
})

test('exports the expenses as CSV', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E Export ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })

  await addExpense(page, groupId, {
    title: 'Parking',
    amount: '12',
    paidBy: 'Alice',
  })

  const response = await page.request.get(
    `/groups/${groupId}/expenses/export/csv`,
  )
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('Parking')
})
