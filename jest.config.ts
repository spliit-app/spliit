import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  // jsdom, with the process timezone pinned per project (see below).
  testEnvironment: '<rootDir>/jest.environment.ts',
  // Jest's default testMatch would pick up the Playwright specs in e2e/, which
  // must be run with `npx playwright test` instead.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// Date-only values (Expense.expenseDate) are carried at UTC midnight, so code
// that reads them through local getters lands on the previous day west of UTC
// and at midday east of it. A host at UTC takes the passing side of both
// defects, so rather than trusting the host timezone the suite runs once on
// each side of UTC, whatever machine it runs on. The whole suite takes under a
// second, so nothing is scoped to date-handling tests.
const jestConfig = async (): Promise<Config> => {
  const project = await createJestConfig(config)()
  return {
    coverageProvider: 'v8',
    projects: [
      {
        ...project,
        displayName: 'America/Los_Angeles',
        testEnvironmentOptions: { tz: 'America/Los_Angeles' },
      },
      {
        ...project,
        displayName: 'Pacific/Auckland',
        testEnvironmentOptions: { tz: 'Pacific/Auckland' },
      },
    ],
  }
}

export default jestConfig
