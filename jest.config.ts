import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default async () => {
  const nextConfig = await createJestConfig(customJestConfig)()
  return {
    ...nextConfig,
    transformIgnorePatterns: [
      '/node_modules/(?!(superjson|copy-anything|is-what|nanoid|@prisma)/)',
    ],
  }
}