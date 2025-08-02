import { Page } from '@playwright/test'

export class ExpensePage {
  constructor(private page: Page) {}

  async navigateToGroupExpenses(groupId: string) {
    await this.page.goto(`http://localhost:3002/groups/${groupId}/expenses`)
  }

  async fillTitle(expenseTitle: string) {
    await this.page
      .getByRole('textbox', { name: 'Expense title' })
      .fill(expenseTitle)
  }

  async fillAmount(expenseAmount: string) {
    await this.page.getByRole('textbox', { name: 'Amount' }).fill(expenseAmount)
  }

  async selectPayer(payer: string) {
    await this.page
      .getByRole('combobox')
      .filter({ hasText: 'Select a participant' })
      .click()
    await this.page.getByRole('option', { name: payer, exact: true }).click()
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create' }).click()
  }
}
