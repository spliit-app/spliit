import { uniqueSuffix } from './app'
import { expect, test } from './fixtures'

test('imports a Spliit JSON file into a new group', async ({ page }) => {
  const name = `Fork import ${uniqueSuffix()}`
  await page.goto('/groups')
  await page.getByRole('button', { name: 'Open create options' }).click()
  await page.getByRole('menuitem', { name: 'Import from file' }).click()
  const payload = {
    name,
    currency: '$',
    currencyCode: 'USD',
    participants: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    expenses: [
      {
        title: 'Imported lunch',
        recurrenceRule: 'MONTHLY',
        amount: 1200,
        expenseDate: '2026-01-02',
        paidById: 'a',
        paidFor: [
          { participantId: 'a', shares: 100 },
          { participantId: 'b', shares: 100 },
        ],
        splitMode: 'EVENLY',
      },
    ],
  }
  await page.locator('#file-import-upload').setInputFiles({
    name: 'group.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  })
  await expect(page.getByText('Spliit JSON', { exact: true })).toBeVisible()
  const dialog = page.getByRole('dialog')
  const participants = dialog
    .getByText('Participants', { exact: true })
    .locator('..')
  await expect(
    dialog.getByText(/Recurring expenses are imported as individual expenses/),
  ).toBeVisible()
  await expect(participants).toContainText('Alice, Bob')
  await expect(participants).not.toContainText('$')
  await expect(
    dialog.getByText('Participants and balances', { exact: true }),
  ).toHaveCount(0)
  await dialog.locator('.overflow-y-scroll').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await dialog.getByRole('button', { name: 'Import', exact: true }).click()
  await page.waitForURL(/\/groups\/[^/]+/, { timeout: 30_000 })
  await expect(
    page.getByTestId('expense-card').filter({ hasText: 'Imported lunch' }),
  ).toBeVisible()
  const groupId = new URL(page.url()).pathname.split('/')[2]
  const exported = await page.request.get(
    `/groups/${groupId}/expenses/export/json`,
  )
  expect(exported.ok()).toBe(true)
  expect((await exported.json()).expenses[0].recurrenceRule).toBe('NONE')
})

for (const outcome of ['cancelled', 'failed'] as const) {
  test(`keeps a ${outcome} partial import reachable without reloading`, async ({
    page,
  }) => {
    const name = `${outcome} import ${uniqueSuffix()}`
    let releaseBatch!: () => void
    let batchStarted!: () => void
    const started = new Promise<void>((resolve) => {
      batchStarted = resolve
    })
    const release = new Promise<void>((resolve) => {
      releaseBatch = resolve
    })
    let batches = 0
    await page.route(
      '**/api/trpc/groups.importProcessBatch*',
      async (route) => {
        batches++
        if (outcome === 'failed' && batches === 2) {
          await route.abort('failed')
          return
        }
        batchStarted()
        await release
        await route.continue()
      },
    )
    await page.goto('/groups')
    await page.getByRole('button', { name: 'Open create options' }).click()
    await page.getByRole('menuitem', { name: 'Import from file' }).click()
    const payload = {
      name,
      currency: '$',
      currencyCode: 'USD',
      participants: [{ id: 'a', name: 'Alice' }],
      expenses: Array.from({ length: 51 }, (_, i) => ({
        title: `Expense ${i}`,
        amount: 100,
        expenseDate: '2026-01-02',
        paidById: 'a',
        paidFor: [{ participantId: 'a', shares: 100 }],
        splitMode: 'EVENLY',
      })),
    }
    await page.locator('#file-import-upload').setInputFiles({
      name: 'group.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    })
    const dialog = page.getByRole('dialog')
    await expect(page.getByText('Spliit JSON', { exact: true })).toBeVisible()
    await dialog.locator('.overflow-y-scroll').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await dialog.getByRole('button', { name: 'Import', exact: true }).click()
    await started
    if (outcome === 'cancelled') {
      await dialog.getByRole('button', { name: 'Cancel import' }).click()
    }
    releaseBatch()
    if (outcome === 'cancelled') {
      await expect(
        dialog.getByText(
          'Import cancelled. The partially imported group remains in your groups.',
        ),
      ).toBeVisible()
      await dialog.getByRole('button', { name: 'Continue' }).click()
    } else {
      await expect(
        dialog.getByRole('button', { name: 'Cancel import' }),
      ).toHaveCount(0)
      await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    }
    await expect(page.getByText(name, { exact: true })).toBeVisible()
    await page.getByText(name, { exact: true }).click()
    await page.waitForURL(/\/groups\/[^/]+/)
    const groupId = new URL(page.url()).pathname.split('/')[2]
    const exported = await page.request.get(
      `/groups/${groupId}/expenses/export/json`,
    )
    expect(exported.ok()).toBe(true)
    expect((await exported.json()).expenses).toHaveLength(50)
  })
}
