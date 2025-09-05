import { Locator, Page } from '@playwright/test'

export class GroupPage {
  page: Page
  title: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByTestId('group-name')
  }

  async createExpense() {
    // Wait for the page to be in a stable state before clicking
    await this.page.waitForLoadState('networkidle')
    
    // Retry clicking the create expense link if it fails
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.page.getByRole('link', { name: 'Create expense' }).click({ timeout: 5000 })
        break
      } catch (error) {
        if (attempt === 2) throw error
        await this.page.waitForTimeout(1000)
        await this.page.waitForLoadState('networkidle')
      }
    }
  }

  async waitForGroupPageLoad() {
    // Wait for group name to be visible
    await this.title.waitFor({ state: 'visible' })
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle')
  }

  getExpenseCard(expenseTitle: string) {
    return this.page
      .locator('[data-expense-card]')
      .filter({ hasText: expenseTitle })
  }
}
