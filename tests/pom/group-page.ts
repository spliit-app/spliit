import { Locator, Page } from '@playwright/test'

export class GroupPage {
  page: Page
  title: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByTestId('group-name')
  }

  async createExpense() {
    await this.page.getByRole('link', { name: 'Create expense' }).click()
  }

  getExpenseCard(expenseTitle: string) {
    return this.page
      .locator('[data-expense-card]')
      .filter({ hasText: expenseTitle })
  }
}
