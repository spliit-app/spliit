/**
 * The account the suite signs in as.
 *
 * A single fixed address on purpose: better-auth rate-limits its endpoints
 * (correctly), so the suite authenticates exactly once in global setup and every
 * worker reuses that stored session. Group data is unique per test, so sharing
 * one identity is harmless.
 */
export const E2E_USER = {
  name: 'E2E User',
  email: 'e2e@example.test',
  password: 'e2e-password-1',
} as const

/** Written by global-setup.ts, read by every test via `use.storageState`. */
export const AUTH_STATE_PATH = 'e2e/.auth/user.json'

/** No session at all: for the specs that exercise signing in themselves. */
export const SIGNED_OUT_STATE = { cookies: [], origins: [] }
