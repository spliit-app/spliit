import { request, type FullConfig } from '@playwright/test'
import { AUTH_STATE_PATH, E2E_USER } from './auth-state'

/**
 * Signs in once, before any worker starts, and stores the session cookies.
 *
 * Doing this per worker would mean four sign-ins at the same moment, which
 * better-auth's rate limiter (rightly) refuses. The stored state is what makes
 * every other spec run already authenticated.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const context = await request.newContext({ baseURL })

  let lastError = 'no attempt made'

  // better-auth rate-limits its own endpoints, and running the suite twice in a
  // minute is normal during development, so throttling is retried rather than
  // treated as a broken environment.
  for (let attempt = 0; attempt < 10; attempt++) {
    const signIn = await context.post('/api/auth/sign-in/email', {
      data: { email: E2E_USER.email, password: E2E_USER.password },
      failOnStatusCode: false,
    })
    if (signIn.ok()) {
      await context.storageState({ path: AUTH_STATE_PATH })
      await context.dispose()
      return
    }
    lastError = `sign-in ${signIn.status()}: ${await signIn.text()}`

    // First run against a fresh database: the account does not exist yet.
    const signUp = await context.post('/api/auth/sign-up/email', {
      data: E2E_USER,
      failOnStatusCode: false,
    })
    if (signUp.ok()) {
      await context.storageState({ path: AUTH_STATE_PATH })
      await context.dispose()
      return
    }
    lastError += ` / sign-up ${signUp.status()}: ${await signUp.text()}`

    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  await context.dispose()
  throw new Error(`Could not authenticate the E2E user (${lastError})`)
}
