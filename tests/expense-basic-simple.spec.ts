import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './pom/create-group-page'
import { ExpensePage } from './pom/expense-page'
import { GroupPage } from './pom/group-page'
import { testExpenses, generateUniqueExpenseTitle } from './test-data/expenses'
import { generateUniqueGroupName } from './test-data/groups'

test('Simple expense creation', async ({ page }) => {
  const createGroupPage = new CreateGroupPage(page)
  const groupPage = new GroupPage(page)
  const expensePage = new ExpensePage(page)
  
  const groupName = generateUniqueGroupName()
  const expenseTitle = generateUniqueExpenseTitle()
  const expenseData = { ...testExpenses.simple, title: expenseTitle }

  await test.step('Set up test group', async () => {
    await createGroupPage.navigate()
    await createGroupPage.fillGroupName(groupName)
    await createGroupPage.fillCurrency('USD')
    await createGroupPage.addParticipant('Alice', 0)
    await createGroupPage.addParticipant('Bob', 1)
    await createGroupPage.submit()
    
    await expect(groupPage.title).toHaveText(groupName)
  })

  await test.step('Create new expense', async () => {
    await groupPage.createExpense()
    
    await expensePage.fillTitle(expenseData.title)
    await expensePage.fillAmount(expenseData.amount)
    await expensePage.selectPayer('Alice')
    await expensePage.submit()
  })

  await test.step('Verify expense is created and displayed', async () => {
    // Should navigate back to expenses page
    await expect(page).toHaveURL(/\/groups\/[^\/]+\/expenses$/)
    
    const expenseCard = groupPage.getExpenseCard(expenseData.title)
    await expect(expenseCard).toBeVisible()
    await expect(expenseCard.locator('[data-amount]')).toHaveText('USD4.50')
  })
})