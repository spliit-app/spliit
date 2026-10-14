import {
  addExpense,
  createGroup,
  expectBalance,
  openTab,
  reimbursementRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { money } from './ui'

test('creates a group, records expenses and computes balances', async ({
  page,
}) => {
  const name = `E2E Core ${uniqueSuffix()}`

  const groupId = await createGroup(page, {
    name,
    participants: ['Alice', 'Bob', 'Carol'],
  })

  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(page.getByText(/doesn.t contain any expense yet/)).toBeVisible()

  // Alice pays 90, Bob pays 30. Split evenly, so each owes 40.
  await addExpense(page, groupId, {
    title: 'Dinner',
    amount: '90',
    paidBy: 'Alice',
  })
  await addExpense(page, groupId, {
    title: 'Taxi',
    amount: '30',
    paidBy: 'Bob',
  })

  const dinner = page.getByTestId('expense-card').filter({ hasText: 'Dinner' })
  await expect(dinner).toBeVisible()
  await expect(dinner).toContainText(money(90))
  await expect(dinner).toContainText('Paid by Alice')

  const taxi = page.getByTestId('expense-card').filter({ hasText: 'Taxi' })
  await expect(taxi).toContainText(money(30))
  await expect(taxi).toContainText('Paid by Bob')

  await openTab(page, 'Balances')

  // Alice 90 - 40, Bob 30 - 40, Carol 0 - 40. Sums to zero.
  await expectBalance(page, 'Alice', 50)
  await expectBalance(page, 'Bob', -10)
  await expectBalance(page, 'Carol', -40)

  await expect(reimbursementRow(page, 'Carol', 'Alice')).toContainText(
    money(40),
  )
  await expect(reimbursementRow(page, 'Bob', 'Alice')).toContainText(money(10))
})
