import { Page } from '@playwright/test'

export class CreateGroupPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('http://localhost:3002/groups/create')
    await this.page.waitForLoadState('networkidle')
  }

  async fillGroupName(name: string) {
    await this.page.getByRole('textbox', { name: 'Group name' }).fill(name)
  }

  async fillCurrency(currency: string) {
    await this.page.getByRole('textbox', { name: 'Currency' }).fill(currency)
  }

  async fillAdditionalInfo(info: string) {
    await this.page
      .getByRole('textbox', { name: 'Group Information' })
      .fill(info)
  }

  async addParticipant(participantName: string, index: number) {
    await this.page
      .locator(`input[name="participants.${index}.name"]`)
      .fill(participantName)
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Create' }).click()
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle')
  }
}
