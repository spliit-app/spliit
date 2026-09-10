import { addExpense, createGroup, setActiveUser, uniqueSuffix } from './app'
import { expect, test } from './fixtures'
import { cardByTitle, money } from './ui'

const CARD_TITLE = 'Your total balance'

/**
 * The card reads `<groupId>-activeUser` for every group in the recent list,
 * which lives in localStorage -- so each test's browser context sees only the
 * groups that test visited, even though the whole suite shares one database.
 */

test('sums balances across groups once you are identified in them', async ({
  page,
}) => {
  const first = await createGroup(page, {
    name: `E2E Global A ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  // Alice pays 100 split evenly, so she is owed 50.
  await addExpense(page, first, {
    title: 'Hotel',
    amount: '100',
    paidBy: 'Alice',
  })

  const second = await createGroup(page, {
    name: `E2E Global B ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  // Alice pays 60 split evenly, so she is owed 30.
  await addExpense(page, second, {
    title: 'Train',
    amount: '60',
    paidBy: 'Alice',
  })

  await setActiveUser(page, first, 'Alice')
  await setActiveUser(page, second, 'Alice')

  await page.goto('/groups')

  const card = cardByTitle(page, CARD_TITLE)
  await expect(card).toBeVisible()
  await expect(card).toContainText('You are owed')
  await expect(card).toContainText(money(80))
})

test('reports being settled up when every balance is zero', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Global Settled ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  // Alice pays and is the only participant charged, so nobody owes anybody.
  await addExpense(page, groupId, {
    title: 'Coffee',
    amount: '10',
    paidBy: 'Alice',
    paidFor: ['Alice'],
  })

  await setActiveUser(page, groupId, 'Alice')

  await page.goto('/groups')

  const card = cardByTitle(page, CARD_TITLE)
  await expect(card).toBeVisible()
  await expect(card).toContainText('You are all settled up across your groups.')
})

test('stays hidden until you say who you are', async ({ page }) => {
  // A visited group with no active user: there is nobody to aggregate for, so
  // the card must not appear at all rather than render an empty shell.
  const groupId = await createGroup(page, {
    name: `E2E Global Anonymous ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'Lunch',
    amount: '40',
    paidBy: 'Alice',
  })

  await page.goto('/groups')

  await expect(
    page.getByRole('link', { name: /E2E Global Anonymous/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: CARD_TITLE, exact: true }),
  ).toHaveCount(0)
})
