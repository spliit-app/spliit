import { expect, test } from './fixtures'

const inputs = [
  [
    'English',
    'Date,Description,Category,Cost,Currency,Alice,Bob\n2026-01-01,Dinner,General,1.01,EUR,0.67,-0.67\n2026-01-02,Pay,Payment,0.20,EUR,-0.20,0.20',
  ],
  [
    'German',
    'Datum,Beschreibung,Kategorie,Kosten,Währung,Alice,Bob\n2026-01-01,Dinner,Allgemein,1.01,EUR,0.67,-0.67\n2026-01-02,Pay,Zahlung,0.20,EUR,-0.20,0.20',
  ],
] as const

for (const [language, csv] of inputs) {
  test(`imports ${language} Splitwise CSV and retains exact balances`, async ({
    page,
  }) => {
    await page.goto('/groups')
    await page.getByRole('button', { name: 'Open create options' }).click()
    await page.getByRole('menuitem', { name: 'Import from file' }).click()
    await page.locator('#file-import-upload').setInputFiles({
      name: 'splitwise.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })
    await expect(page.getByText('Splitwise CSV', { exact: true })).toBeVisible()
    const dialog = page.getByRole('dialog')
    await dialog.locator('.overflow-y-scroll').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await dialog.getByRole('button', { name: 'Import', exact: true }).click()
    await page.waitForURL(/\/groups\/[^/]+/, { timeout: 30_000 })
    await expect(
      page.getByTestId('expense-card').filter({ hasText: 'Dinner' }),
    ).toBeVisible()
    const groupId = /\/groups\/([^/]+)/.exec(page.url())?.[1]
    await page.goto(`/groups/${groupId}/balances`)
    await expect(
      page.locator('[data-testid="balance-row"][data-participant="Alice"]'),
    ).toContainText('0.47')
    await expect(
      page.locator('[data-testid="balance-row"][data-participant="Bob"]'),
    ).toContainText('0.47')
  })
}
