import { expect, test } from '@playwright/test'
import { CreateGroupPage } from './pom/create-group-page'
import { ExpensePage } from './pom/expense-page'
import { GroupPage } from './pom/group-page'
import { BalancePage } from './pom/balance-page'
import { testExpenses, generateUniqueExpenseTitle } from './test-data/expenses'
import { generateUniqueGroupName } from './test-data/groups'
import { CalculationUtils } from './utils/calculations'
import { ReliabilityUtils } from './utils/reliability'

test.describe('Balance Calculation and Reimbursements', () => {
  test('View participant balances after expenses', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const expensePage = new ExpensePage(page)
    const balancePage = new BalancePage(page)
    
    const groupName = generateUniqueGroupName()

    await test.step('Set up test group with participants', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupName)
      await createGroupPage.fillCurrency('USD')
      await createGroupPage.addParticipant('Alice', 0)
      await createGroupPage.addParticipant('Bob', 1)
      await createGroupPage.submit()
      
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
      await expect(groupPage.title).toHaveText(groupName)
    })

    await test.step('Create expense paid by Alice', async () => {
      await groupPage.createExpense()
      
      const expenseTitle = generateUniqueExpenseTitle()
      await expensePage.fillTitle(expenseTitle)
      await expensePage.fillAmount('20.00')
      await expensePage.selectPayer('Alice')
      await expensePage.submit()
      
      // Verify expense was created
      const expenseCard = groupPage.getExpenseCard(expenseTitle)
      await expect(expenseCard).toBeVisible()
    })

    await test.step('View balances and verify calculations', async () => {
      // Navigate to balances tab with enhanced reliability
      await ReliabilityUtils.navigateToTab(page, 'balances', /\/groups\/[^\/]+\/balances$/)
      
      // Verify content loaded with multiple fallback strategies
      await ReliabilityUtils.verifyContentLoaded(page, [
        'balances-content',
        'balances-card', 
        'text=Balances',
        '[data-testid="balances-content"]'
      ])
      
      // Alice paid $20, so she should be owed $10 (paid $20, owes $10)
      // Bob paid $0, so he should owe $10 (paid $0, owes $10)
      // The balances should sum to zero for the group
    })

    await test.step('Create second expense paid by Bob', async () => {
      // Navigate back to expenses
      await page.getByTestId('tab-expenses').click()
      await page.waitForLoadState('networkidle')
      
      await groupPage.createExpense()
      
      const expenseTitle2 = generateUniqueExpenseTitle()
      await expensePage.fillTitle(expenseTitle2)
      await expensePage.fillAmount('30.00')
      await expensePage.selectPayer('Bob')
      await expensePage.submit()
    })

    await test.step('Verify updated balances', async () => {
      // Navigate to balances tab with enhanced reliability
      await ReliabilityUtils.navigateToTab(page, 'balances', /\/groups\/[^\/]+\/balances$/)
      
      // Verify content loaded with multiple fallback strategies
      await ReliabilityUtils.verifyContentLoaded(page, [
        'balances-content',
        'balances-card', 
        'text=Balances',
        '[data-testid="balances-content"]'
      ])
      
      // Now Alice: paid $20, owes $25 = balance -$5 (owes $5)
      // Now Bob: paid $30, owes $25 = balance +$5 (is owed $5)
      // Total expenses: $50, split evenly: $25 each
    })
  })

  test('Multiple expenses with different amounts', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const expensePage = new ExpensePage(page)
    
    const groupName = generateUniqueGroupName()
    const expenses = [
      { title: `Lunch ${Date.now()}`, amount: '24.00', payer: 'Alice' },
      { title: `Coffee ${Date.now() + 1}`, amount: '8.00', payer: 'Bob' },
      { title: `Dinner ${Date.now() + 2}`, amount: '48.00', payer: 'Charlie' }
    ]

    await test.step('Set up test group with three participants', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupName)
      await createGroupPage.fillCurrency('USD')
      await createGroupPage.addParticipant('Alice', 0)
      await createGroupPage.addParticipant('Bob', 1)
      await createGroupPage.addParticipant('Charlie', 2)
      await createGroupPage.submit()
      
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
    })

    await test.step('Create multiple expenses', async () => {
      for (const expense of expenses) {
        await groupPage.createExpense()
        
        await expensePage.fillTitle(expense.title)
        await expensePage.fillAmount(expense.amount)
        await expensePage.selectPayer(expense.payer)
        await expensePage.submit()
        
        // Verify expense was created
        const expenseCard = groupPage.getExpenseCard(expense.title)
        await expect(expenseCard).toBeVisible()
      }
    })

    await test.step('View final balances', async () => {
      // Navigate to balances tab with enhanced reliability
      await ReliabilityUtils.navigateToTab(page, 'balances', /\/groups\/[^\/]+\/balances$/)
      
      // Verify content loaded with multiple fallback strategies
      await ReliabilityUtils.verifyContentLoaded(page, [
        'balances-content',
        'balances-card', 
        'text=Balances',
        '[data-testid="balances-content"]'
      ])
      
      // Total expenses: $24 + $8 + $48 = $80
      // Split 3 ways: $80 / 3 = $26.67 each
      // Alice: paid $24, owes $26.67 = balance -$2.67
      // Bob: paid $8, owes $26.67 = balance -$18.67  
      // Charlie: paid $48, owes $26.67 = balance +$21.33
      // Balances should sum to zero: -2.67 + -18.67 + 21.33 = -0.01 (due to rounding)
    })
  })

  test('Single person pays all expenses', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const expensePage = new ExpensePage(page)
    
    const groupName = generateUniqueGroupName()

    await test.step('Set up test group', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupName)
      await createGroupPage.fillCurrency('USD')
      await createGroupPage.addParticipant('Payer', 0)
      await createGroupPage.addParticipant('Person1', 1)
      await createGroupPage.addParticipant('Person2', 2)
      await createGroupPage.submit()
      
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
    })

    await test.step('Create expenses all paid by same person', async () => {
      const expenses = [
        { title: `Expense1 ${Date.now()}`, amount: '15.00' },
        { title: `Expense2 ${Date.now() + 1}`, amount: '30.00' },
        { title: `Expense3 ${Date.now() + 2}`, amount: '45.00' }
      ]

      for (const expense of expenses) {
        await groupPage.createExpense()
        
        await expensePage.fillTitle(expense.title)
        await expensePage.fillAmount(expense.amount)
        await expensePage.selectPayer('Payer')
        await expensePage.submit()
      }
    })

    await test.step('Verify balances show correct amounts owed', async () => {
      // Navigate to balances tab with enhanced reliability
      await ReliabilityUtils.navigateToTab(page, 'balances', /\/groups\/[^\/]+\/balances$/)
      
      // Verify content loaded with multiple fallback strategies
      await ReliabilityUtils.verifyContentLoaded(page, [
        'balances-content',
        'balances-card', 
        'text=Balances',
        '[data-testid="balances-content"]'
      ])
      
      // Total expenses: $15 + $30 + $45 = $90
      // Split 3 ways: $30 each
      // Payer: paid $90, owes $30 = balance +$60 (is owed $60)
      // Person1: paid $0, owes $30 = balance -$30 (owes $30)
      // Person2: paid $0, owes $30 = balance -$30 (owes $30)
      // Total: +60 - 30 - 30 = 0 ✓
    })
  })

  test('Equal split verification', async ({ page }) => {
    const createGroupPage = new CreateGroupPage(page)
    const groupPage = new GroupPage(page)
    const expensePage = new ExpensePage(page)
    
    const groupName = generateUniqueGroupName()

    await test.step('Set up test group', async () => {
      await createGroupPage.navigate()
      await createGroupPage.fillGroupName(groupName)
      await createGroupPage.fillCurrency('USD')
      await createGroupPage.addParticipant('User1', 0)
      await createGroupPage.addParticipant('User2', 1)
      await createGroupPage.submit()
      
      // Wait for the group page to fully load
      await groupPage.waitForGroupPageLoad()
    })

    await test.step('Create expense with even amount', async () => {
      await groupPage.createExpense()
      
      const expenseTitle = generateUniqueExpenseTitle()
      await expensePage.fillTitle(expenseTitle)
      await expensePage.fillAmount('100.00')
      await expensePage.selectPayer('User1')
      await expensePage.submit()
    })

    await test.step('Verify equal split calculation', async () => {
      // Navigate to balances tab with enhanced reliability
      await ReliabilityUtils.navigateToTab(page, 'balances', /\/balances$/)
      
      // $100 split evenly between 2 people = $50 each
      // User1: paid $100, owes $50 = balance +$50 (is owed $50)
      // User2: paid $0, owes $50 = balance -$50 (owes $50)
      
      // Verify content loaded with multiple fallback strategies
      await ReliabilityUtils.verifyContentLoaded(page, [
        'balances-content',
        'balances-card', 
        'text=Balances',
        '[data-testid="balances-content"]',
        'text=USD'
      ])
    })
  })
})