import { expect, test } from '@playwright/test'

test('/api/health/liveness returns 200', async ({ page }) => {
  const response = await page.request.get('/api/health/liveness')
  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(body).toBeTruthy()
})

test('/api/health/readiness checks DB', async ({ page }) => {
  const response = await page.request.get('/api/health/readiness')
  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(body).toBeTruthy()
})
