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
    // Look for either Create or Save button
    const createButton = this.page.getByRole('button', { name: 'Create' })
    const saveButton = this.page.getByRole('button', { name: 'Save' })
    
    if (await createButton.isVisible()) {
      await createButton.click()
    } else {
      await saveButton.click()
    }
    
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPageLoad() {
    // Wait for the expense form to be fully loaded
    await this.page.waitForLoadState('networkidle')
  }
}
