import type { APIRequestContext } from '@playwright/test'
import { createGroup, uniqueSuffix } from './app'
import { E2E_USER } from './auth-state'
import { expect, test } from './fixtures'

/**
 * The authorization half of the login wall.
 *
 * Before memberships existed every group procedure was merely *authenticated*:
 * any signed-in account that knew a group id could read the ledger and write to
 * it. These specs pin the replacement — a non-member is told the group does not
 * exist, which also keeps the endpoint from confirming that an id is real.
 */

async function createSecondAccount(request: APIRequestContext) {
  const account = {
    name: 'Outsider',
    email: `e2e-outsider-${uniqueSuffix()}-${Date.now()}@example.com`,
    password: 'e2e-password-1',
  }

  let lastError = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await request.post('/api/auth/sign-up/email', {
      data: account,
      failOnStatusCode: false,
    })
    if (response.ok()) return account
    lastError = `${response.status()} ${await response.text()}`
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  throw new Error(`Could not create ${account.email}: ${lastError}`)
}

function trpcUrl(path: string, input: unknown) {
  return `/api/trpc/${path}?input=${encodeURIComponent(
    JSON.stringify({ json: input }),
  )}`
}

test('a signed-in non-member cannot read or write a group', async ({
  page,
  playwright,
  baseURL,
}) => {
  // The suite's own account creates a group; it is the OWNER.
  const groupName = `E2E Private ${uniqueSuffix()}`
  await createGroup(page, { name: groupName, participants: ['Alice', 'Bob'] })
  const groupId = new URL(page.url()).pathname.split('/')[2]
  expect(groupId).toBeTruthy()

  const ownerApi = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL! },
  })
  const ownerSignIn = await ownerApi.post('/api/auth/sign-in/email', {
    data: { email: E2E_USER.email, password: E2E_USER.password },
  })
  expect(ownerSignIn.ok()).toBe(true)

  // Sanity check: the owner can read it, so a 404 below is about authority and
  // not about a missing group.
  const asOwner = await ownerApi.get(trpcUrl('groups.get', { groupId }))
  expect(asOwner.ok()).toBe(true)

  const outsiderApi = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL! },
  })
  const outsider = await createSecondAccount(outsiderApi)
  const outsiderSignIn = await outsiderApi.post('/api/auth/sign-in/email', {
    data: { email: outsider.email, password: outsider.password },
  })
  expect(outsiderSignIn.ok()).toBe(true)

  // Reads: the membership check answers as if the group did not exist.
  for (const path of [
    'groups.get',
    'groups.getDetails',
    'groups.expenses.list',
    'groups.balances.list',
  ]) {
    const response = await outsiderApi.get(trpcUrl(path, { groupId }))
    expect(response.status(), path).toBe(404)
  }

  // Writes, including the ones that used to be open to anyone signed in.
  const update = await outsiderApi.post(
    trpcUrl('groups.update', {
      groupId,
      groupFormValues: {
        name: 'Hijacked',
        information: '',
        currency: '$',
        currencyCode: null,
        participants: [{ name: 'Alice' }],
      },
    }),
  )
  expect(update.status()).toBe(404)

  const remove = await outsiderApi.post(
    trpcUrl('groups.members.remove', { groupId, userId: 'any' }),
  )
  expect(remove.status()).toBe(404)

  // The group survived unchanged.
  const after = await ownerApi.get(trpcUrl('groups.get', { groupId }))
  expect(after.ok()).toBe(true)
  const body = await after.json()
  expect(body.result.data.json.group.name).toBe(groupName)

  await outsiderApi.dispose()
  await ownerApi.dispose()
})
