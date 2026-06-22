import { randomId } from '@/lib/api'
import { expect, test } from '@playwright/test'
import * as fs from 'fs'
import { createExpenseViaAPI, createGroupViaAPI } from '../helpers/batch-api'

interface ExpenseData {
  title?: string
  Description?: string
  amount?: string
  Cost?: string
  paidBy?: string
  date?: string
  Date?: string
  [key: string]: unknown
}

test.describe('Export functionality', () => {
  test('Export JSON download', async ({ page, browserName }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `export JSON ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Dinner',
      amount: 5000,
      payerName: 'Alice',
    })

    // Navigate to group page
    await page.goto(`/groups/${groupId}/expenses`)

    await page
      .getByRole('button', { name: /export/i })
      .first()
      .click()

    const jsonOption = page.getByRole('menuitem', { name: /json/i })
    await expect(jsonOption).toBeVisible()

    if (browserName === 'webkit' && process.env.CI) {
      // https://github.com/microsoft/playwright/issues/38585
      // Skip WebKit on CI due to download issues
      return
    }

    const downloadPromise = page.waitForEvent('download')
    await jsonOption.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.json$/)

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const content = fs.readFileSync(downloadPath!, 'utf-8')
    const data = JSON.parse(content) as Record<string, unknown>

    const rawExpenses = data.expenses as ExpenseData[] | undefined
    const expenses = Array.isArray(rawExpenses) ? rawExpenses : []
    expect(Array.isArray(expenses)).toBe(true)
    expect(expenses.length).toBeGreaterThan(0)

    const dinnerExpense = expenses.find((e) =>
      String(e.title || e.Description || '').includes('Dinner'),
    )
    expect(dinnerExpense).toBeDefined()

    const amount = String(dinnerExpense?.amount || dinnerExpense?.Cost || '')
    expect(amount).toContain('50')
  })

  test('Export JSON content', async ({ page, browserName }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(
      page,
      `export content ${randomId(4)}`,
      ['Alice', 'Bob'],
    )

    await createExpenseViaAPI(page, groupId, {
      title: 'Lunch',
      amount: 2550,
      payerName: 'Alice',
    })
    await createExpenseViaAPI(page, groupId, {
      title: 'Coffee',
      amount: 500,
      payerName: 'Bob',
    })

    // Navigate to group page
    await page.goto(`/groups/${groupId}/expenses`)

    await page
      .getByRole('button', { name: /export/i })
      .first()
      .click()

    const jsonOption = page.getByRole('menuitem', { name: /json/i })
    await expect(jsonOption).toBeVisible()

    if (browserName === 'webkit' && process.env.CI) {
      // https://github.com/microsoft/playwright/issues/38585
      // Skip WebKit on CI due to download issues
      return
    }

    const downloadPromise = page.waitForEvent('download')
    await jsonOption.click()
    const download = await downloadPromise

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const content = fs.readFileSync(downloadPath!, 'utf-8')
    const data = JSON.parse(content) as Record<string, unknown>

    const rawExpenses = data.expenses as ExpenseData[] | undefined
    const expenses = Array.isArray(rawExpenses) ? rawExpenses : []
    expect(Array.isArray(expenses)).toBe(true)
    expect(expenses.length).toBe(2)

    const titles = expenses.map((e) => String(e.title || e.Description || ''))
    expect(titles).toContain('Lunch')
    expect(titles).toContain('Coffee')
  })

  test('Export CSV download', async ({ page, browserName }) => {
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `export CSV ${randomId(4)}`, [
      'Alice',
      'Bob',
    ])

    await createExpenseViaAPI(page, groupId, {
      title: 'Groceries',
      amount: 10000,
      payerName: 'Bob',
    })

    // Navigate to group page
    await page.goto(`/groups/${groupId}/expenses`)

    await page
      .getByRole('button', { name: /export/i })
      .first()
      .click()

    const csvOption = page.getByRole('menuitem', { name: /csv/i })
    await expect(csvOption).toBeVisible()

    if (browserName === 'webkit' && process.env.CI) {
      // https://github.com/microsoft/playwright/issues/38585
      // Skip WebKit on CI due to download issues
      return
    }

    const downloadPromise = page.waitForEvent('download')
    await csvOption.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.csv$/)

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const content = fs.readFileSync(downloadPath!, 'utf-8')
    expect(content.length).toBeGreaterThan(0)

    const lines = content.trim().split('\n')
    expect(lines.length).toBeGreaterThan(1)

    expect(lines[0]).toContain('Description')
    expect(lines[0]).toContain('Cost')
  })

  test('Export CSV format', async ({ page, browserName }) => {
    if (browserName === 'webkit' && process.env.CI) {
      // https://github.com/microsoft/playwright/issues/38585
      // Skip WebKit on CI due to download issues
      return
    }
    await page.goto('/groups')
    const groupId = await createGroupViaAPI(page, `CSV format ${randomId(4)}`, [
      'Alice',
      'Bob',
      'Charlie',
    ])

    const expenseTitle = 'Weekend Trip'
    await createExpenseViaAPI(page, groupId, {
      title: expenseTitle,
      amount: 30000,
      payerName: 'Alice',
    })

    // Navigate to group page
    await page.goto(`/groups/${groupId}/expenses`)

    await page
      .getByRole('button', { name: /export/i })
      .first()
      .click()

    const csvOption = page.getByRole('menuitem', { name: /csv/i })
    await expect(csvOption).toBeVisible()

    if (browserName === 'webkit' && process.env.CI) {
      // https://github.com/microsoft/playwright/issues/38585
      // Skip WebKit on CI due to download issues
      return
    }

    const downloadPromise = page.waitForEvent('download')
    await csvOption.click()
    const download = await downloadPromise

    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()

    const content = fs.readFileSync(downloadPath!, 'utf-8')
    const lines = content.trim().split('\n')

    expect(lines[0]).toContain('Description')
    expect(lines[0]).toContain('Cost')
    expect(lines[0]).toContain('Date')

    const dataRow = lines.find((line) => line.includes(expenseTitle))
    expect(dataRow).toBeDefined()
    expect(dataRow).toContain('300')
  })
})
