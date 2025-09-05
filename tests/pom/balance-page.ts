import { Locator, Page } from '@playwright/test'

export class BalancePage {
  page: Page
  balancesSection: Locator
  reimbursementsSection: Locator
  balancesList: Locator

  constructor(page: Page) {
    this.page = page
    this.balancesSection = page.getByTestId('balances-section')
    this.reimbursementsSection = page.getByTestId('reimbursements-section')
    this.balancesList = page.getByTestId('balances-list')
  }

  async navigateToGroupBalances(groupId: string) {
    await this.page.goto(`http://localhost:3002/groups/${groupId}/balances`)
  }

  async getParticipantBalance(participantName: string) {
    return this.page.getByTestId(`balance-${participantName.toLowerCase()}`)
  }

  async getBalanceAmount(participantName: string) {
    const balanceElement = await this.getParticipantBalance(participantName)
    return balanceElement.getByTestId('balance-amount')
  }

  async createReimbursementFromBalance(fromParticipant: string, toParticipant: string) {
    const reimbursementButton = this.page.getByTestId(`create-reimbursement-${fromParticipant}-${toParticipant}`)
    await reimbursementButton.click()
  }

  async getReimbursementSuggestion(fromParticipant: string, toParticipant: string) {
    return this.page.getByTestId(`reimbursement-suggestion-${fromParticipant}-${toParticipant}`)
  }
}