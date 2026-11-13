import { addExpense, createGroup, paidForRow, uniqueSuffix } from './app'
import { expect, test } from './fixtures'
import { fillStable, selectRadixOption } from './ui'

test('shares a saved default split with another browser', async ({
  page,
  browser,
  baseURL,
}) => {
  const groupId = await createGroup(page, {
    name: `Default split ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'First',
    amount: '12',
    paidBy: 'Alice',
    splitMode: 'BY_SHARES',
    shares: { Alice: '2', Bob: '1' },
    saveDefault: true,
  })
  const context = await browser.newContext({ locale: 'en-US' })
  const visitor = await context.newPage()
  await visitor.goto(`${baseURL}/groups/${groupId}/expenses/create`)
  await expect(
    visitor.getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible()
  await expect(paidForRow(visitor, 'Alice').getByRole('textbox')).toHaveValue(
    '2',
  )
  await expect(paidForRow(visitor, 'Bob').getByRole('textbox')).toHaveValue('1')
  await context.close()
})

test('retains a browser-local default until a server default is saved', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `Legacy split ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(
    page.getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible()
  const alice = (
    await paidForRow(page, 'Alice').getAttribute('data-id')
  )?.split('/')[0]
  const bob = (await paidForRow(page, 'Bob').getAttribute('data-id'))?.split(
    '/',
  )[0]
  expect(alice).toBeTruthy()
  expect(bob).toBeTruthy()
  await page.evaluate(
    ({ groupId, alice, bob }) => {
      localStorage.setItem(
        `${groupId}-defaultSplittingOptions`,
        JSON.stringify({
          splitMode: 'BY_SHARES',
          paidFor: [
            { participant: alice, shares: 300 },
            { participant: bob, shares: 100 },
          ],
        }),
      )
    },
    { groupId, alice, bob },
  )
  await page.reload()
  await expect(paidForRow(page, 'Alice').getByRole('textbox')).toHaveValue('3')
  await expect(paidForRow(page, 'Bob').getByRole('textbox')).toHaveValue('1')

  await addExpense(page, groupId, {
    title: 'New shared default',
    amount: '12',
    paidBy: 'Alice',
    splitMode: 'BY_SHARES',
    shares: { Alice: '2', Bob: '1' },
    saveDefault: true,
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(paidForRow(page, 'Alice').getByRole('textbox')).toHaveValue('2')
})

test('shares a saved percentage split with another browser', async ({
  page,
  browser,
  baseURL,
}) => {
  const groupId = await createGroup(page, {
    name: `Default percentage ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'Percentage',
    amount: '10',
    paidBy: 'Alice',
    splitMode: 'BY_PERCENTAGE',
    shares: { Alice: '60', Bob: '40' },
    saveDefault: true,
  })
  const context = await browser.newContext({ locale: 'en-US' })
  const visitor = await context.newPage()
  await visitor.goto(`${baseURL}/groups/${groupId}/expenses/create`)
  await expect(paidForRow(visitor, 'Alice').getByRole('textbox')).toHaveValue(
    '60',
  )
  await expect(paidForRow(visitor, 'Bob').getByRole('textbox')).toHaveValue(
    '40',
  )
  await context.close()
})

test('falls back to all participants for invalid legacy data', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `Invalid default ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(
    page.getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible()
  for (const value of [
    '{invalid json',
    JSON.stringify({
      splitMode: 'BY_SHARES',
      paidFor: [{ participant: 'removed', shares: 100 }],
    }),
  ]) {
    await page.evaluate(
      ({ groupId, value }) => {
        localStorage.setItem(`${groupId}-defaultSplittingOptions`, value)
      },
      { groupId, value },
    )
    await page.reload()
    await expect(paidForRow(page, 'Alice').getByRole('checkbox')).toBeChecked()
    await expect(paidForRow(page, 'Bob').getByRole('checkbox')).toBeChecked()
  }
})

test('shows an error and keeps the form when saving the default fails', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `Default save failure ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  const submit = page.getByRole('button', { name: 'Create', exact: true })
  await expect(submit).toBeVisible()
  await fillStable(page.locator('input[name="title"]'), 'Dinner')
  await fillStable(page.locator('input[name="amount"]'), '12')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Alice')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await page.getByText('Save as default splitting options').click()
  const endpoint = '**/api/trpc/groups.updateDefaultSplittingOptions**'
  await page.route(endpoint, (route) => route.abort())
  await submit.click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Please try again' }),
  ).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/groups/${groupId}/expenses/create`))
  await expect(page.locator('input[name="title"]')).toHaveValue('Dinner')
  await page.unroute(endpoint)
  await submit.click()
  await page.waitForURL(new RegExp(`/groups/${groupId}/expenses(?:\\?|$)`))
  await expect(
    page.getByTestId('expense-card').filter({ hasText: 'Dinner' }),
  ).toHaveCount(1)
})

test('shares an evenly split participant selection with another browser', async ({
  page,
  browser,
  baseURL,
}) => {
  const groupId = await createGroup(page, {
    name: `Default selected participants ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'Selected',
    amount: '12',
    paidBy: 'Alice',
    paidFor: ['Alice'],
    saveDefault: true,
  })
  const context = await browser.newContext({ locale: 'en-US' })
  const visitor = await context.newPage()
  await visitor.goto(`${baseURL}/groups/${groupId}/expenses/create`)
  await expect(paidForRow(visitor, 'Alice').getByRole('checkbox')).toBeChecked()
  await expect(
    paidForRow(visitor, 'Bob').getByRole('checkbox'),
  ).not.toBeChecked()
  await context.close()
})

test('shares the amount split mode without reusing the old amounts', async ({
  page,
  browser,
  baseURL,
}) => {
  const groupId = await createGroup(page, {
    name: `Default amounts ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })
  await addExpense(page, groupId, {
    title: 'Amounts',
    amount: '12',
    paidBy: 'Alice',
    splitMode: 'BY_AMOUNT',
    shares: { Alice: '8', Bob: '4' },
    saveDefault: true,
  })
  const context = await browser.newContext({ locale: 'en-US' })
  const visitor = await context.newPage()
  await visitor.goto(`${baseURL}/groups/${groupId}/expenses/create`)
  await expect(paidForRow(visitor, 'Alice').getByRole('textbox')).toBeVisible()
  await fillStable(visitor.locator('input[name="amount"]'), '18')
  await expect(paidForRow(visitor, 'Alice').getByRole('textbox')).toHaveValue(
    '9.00',
  )
  await expect(paidForRow(visitor, 'Bob').getByRole('textbox')).toHaveValue(
    '9.00',
  )
  await context.close()
})
