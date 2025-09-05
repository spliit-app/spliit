import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './pom/create-group-page'
import { ExpensePage } from './pom/expense-page'
import { GroupPage } from './pom/group-page'
import { testExpenses, generateUniqueExpenseTitle } from './test-data/expenses'
import { generateUniqueGroupName } from './test-data/groups'

test.describe('Basic Expense Management', () => {
  test('Create, view, edit, and delete expense', async ({ page }) => {
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
      const expenseCard = groupPage.getExpenseCard(expenseData.title)
      await expect(expenseCard).toBeVisible()
      await expect(expenseCard.locator('[data-amount]')).toHaveText('USD4.50')
    })

    await test.step('Edit the expense', async () => {
      const expenseCard = groupPage.getExpenseCard(expenseData.title)
      await expenseCard.click()
      
      // Should navigate to expense edit page
      await expect(page).toHaveURL(/\/expenses\/[^\/]+\/edit$/)
      
      // Update the expense
      const newTitle = `${expenseData.title} - Updated`
      const newAmount = '6.75'
      
      await expensePage.fillTitle(newTitle)
      await expensePage.fillAmount(newAmount)
      await expensePage.submit()
      
      // Verify we're back to the group expenses page
      await expect(page).toHaveURL(/\/groups\/[^\/]+\/expenses$/)
    })

    await test.step('Verify expense was updated', async () => {
      const updatedExpenseCard = groupPage.getExpenseCard(`${expenseData.title} - Updated`)
      await expect(updatedExpenseCard).toBeVisible()
      await expect(updatedExpenseCard.locator('[data-amount]')).toHaveText('USD6.75')
    })

    await test.step('Delete the expense', async () => {
      const expenseCard = groupPage.getExpenseCard(`${expenseData.title} - Updated`)
      await expenseCard.click()
      
      // Should be on edit page
      await expect(page).toHaveURL(/\/expenses\/[^\/]+\/edit$/)
      
      // Click delete button
      await page.getByTestId('delete-expense-button').click()
      
      // Confirm deletion
      await page.getByTestId('confirm-delete-button').click()
      
      // Should be back to group expenses page
      await expect(page).toHaveURL(/\/groups\/[^\/]+\/expenses$/)
    })

    await test.step('Verify expense was deleted', async () => {
      // The expense should no longer be visible
      const expenseCard = groupPage.getExpenseCard(`${expenseData.title} - Updated`)
      await expect(expenseCard).not.toBeVisible()
    })
  })

  test('Create expense with notes', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const expensePage = new ExpensePage(page)
    
    const groupName = generateUniqueGroupName()
    const expenseTitle = generateUniqueExpenseTitle()
    const expenseData = { ...testExpenses.restaurant, title: expenseTitle }

    await test.step('Set up test group', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupName)
      await createGroupPage.fillCurrency('USD')
      await createGroupPage.addParticipant('John', 0)
      await createGroupPage.addParticipant('Jane', 1)
      await createGroupPage.submit()
    })

    await test.step('Create expense with notes', async () => {
      await groupPage.createExpense()
      
      await expensePage.fillTitle(expenseData.title)
      await expensePage.fillAmount(expenseData.amount)
      await expensePage.selectPayer('John')
      
      // Add notes if the field exists
      const notesField = page.getByTestId('expense-notes-input')
      if (await notesField.isVisible()) {
        await notesField.fill(expenseData.notes)
      }
      
      await expensePage.submit()
    })

    await test.step('Verify expense with notes is created', async () => {
      const expenseCard = groupPage.getExpenseCard(expenseData.title)
      await expect(expenseCard).toBeVisible()
      await expect(expenseCard.locator('[data-amount]')).toHaveText('USD85.20')
    })
  })

  test('Create multiple expenses and verify list', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const expensePage = new ExpensePage(page)
    
    const groupName = generateUniqueGroupName()
    const expenses = [
      { ...testExpenses.coffee, title: `Coffee ${Date.now()}` },
      { ...testExpenses.transport, title: `Transport ${Date.now() + 1}` },
      { ...testExpenses.grocery, title: `Grocery ${Date.now() + 2}` }
    ]

    await test.step('Set up test group', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupName)
      await createGroupPage.fillCurrency('USD')
      await createGroupPage.addParticipant('User1', 0)
      await createGroupPage.addParticipant('User2', 1)
      await createGroupPage.submit()
    })

    await test.step('Create multiple expenses', async () => {
      for (const expense of expenses) {
        await groupPage.createExpense()
        
        await expensePage.fillTitle(expense.title)
        await expensePage.fillAmount(expense.amount)
        await expensePage.selectPayer('User1')
        await expensePage.submit()
        
        // Wait for navigation back to group expenses page
        await expect(page).toHaveURL(/\/groups\/[^\/]+\/expenses$/)
      }
    })

    await test.step('Verify all expenses are listed', async () => {
      for (const expense of expenses) {
        const expenseCard = groupPage.getExpenseCard(expense.title)
        await expect(expenseCard).toBeVisible()
      }
    })
  })
})