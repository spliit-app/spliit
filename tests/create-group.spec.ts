import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './pom/create-group-page'
import { ExpensePage } from './pom/expense-page'
import { GroupPage } from './pom/group-page'

test('Create a new group and add an expense', async ({ page }) => {
  const createGroupPage = new CreateGroupPage(page)
  const groupPage = new GroupPage(page)
  const expensePage = new ExpensePage(page)

  await test.step('Create a new group', async () => {
    await createGroupPage.navigate()
    await createGroupPage.fillGroupName('New Test Group')
    await createGroupPage.fillCurrency('USD')
    await createGroupPage.fillAdditionalInfo('This is a test group.')
    await createGroupPage.addParticipant('John', 0)
    await createGroupPage.addParticipant('Jane', 1)
    await createGroupPage.submit()
  })

  await test.step('Check that the group is created', async () => {
    await expect(groupPage.title).toHaveText('New Test Group')
  })

  await test.step('Create an expense', async () => {
    await groupPage.createExpense()
    await expensePage.fillTitle('Coffee')
    await expensePage.fillAmount('4.5')
    await expensePage.selectPayer('John')
    await expensePage.submit()
  })

  await test.step('Check that the expense is created', async () => {
    const expenseCard = groupPage.getExpenseCard('Coffee')
    await expect(expenseCard).toBeVisible()
    await expect(expenseCard.locator('[data-amount]')).toHaveText('USD4.50')
  })
})
