import { defineConfig, devices } from '@playwright/test'

/**
 * The app under test is started by scripts/e2e.sh (docker compose), not by
 * Playwright's `webServer`: we need to build an image, we need `docker compose
 * logs` as a CI artifact on failure, and compose's healthchecks are a stricter
 * readiness signal than URL polling (they also fail when a container exits).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // A single `next start` process serves every worker; too many just adds
  // latency and flake without adding coverage.
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [
        ['github'],
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    navigationTimeout: 30_000,
    // retain-on-failure rather than on-first-retry: with retries in CI, a test
    // that fails then passes would otherwise leave no evidence behind.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Must stay >= 768px wide: useMediaQuery('(min-width: 768px)') swaps
        // Radix Dialog <-> Vaul Drawer and Popover <-> Drawer, so a narrow
        // viewport renders a completely different component tree.
        viewport: { width: 1280, height: 900 },
        // Locale drives next-intl (via Accept-Language) *and* Intl currency
        // formatting. Both must be pinned for text assertions to be stable.
        locale: 'en-US',
        timezoneId: 'UTC',
      },
    },
  ],
})
