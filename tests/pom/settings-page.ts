import { Locator, Page } from '@playwright/test'

export class SettingsPage {
  page: Page
  groupNameInput: Locator
  currencyInput: Locator
  informationTextarea: Locator
  saveButton: Locator
  participantsList: Locator

  constructor(page: Page) {
    this.page = page
    this.groupNameInput = page.getByTestId('group-name-input')
    this.currencyInput = page.getByTestId('group-currency-input')
    this.informationTextarea = page.getByTestId('group-information-input')
    this.saveButton = page.getByTestId('save-group-button')
    this.participantsList = page.getByTestId('participants-list')
  }

  async navigateToGroupSettings(groupId: string) {
    await this.page.goto(`http://localhost:3002/groups/${groupId}/edit`)
  }

  async updateGroupName(newName: string) {
    await this.groupNameInput.fill(newName)
  }

  async updateCurrency(newCurrency: string) {
    await this.currencyInput.fill(newCurrency)
  }

  async updateInformation(newInfo: string) {
    await this.informationTextarea.fill(newInfo)
  }

  async addParticipant(participantName: string) {
    const addButton = this.page.getByTestId('add-participant-button')
    await addButton.click()
    
    const newParticipantInput = this.page.getByTestId('new-participant-input')
    await newParticipantInput.fill(participantName)
  }

  async removeParticipant(participantName: string) {
    const removeButton = this.page.getByTestId(`remove-participant-${participantName}`)
    await removeButton.click()
  }

  async saveChanges() {
    await this.saveButton.click()
  }
}