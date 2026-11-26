import { createAuthClient } from 'better-auth/react'

/**
 * Browser-side auth client. Talks to /api/auth/* (see src/lib/auth.ts).
 *
 * `useSession()` is the single source of truth for "am I signed in" in the UI;
 * server components read the same session through `auth.api.getSession()`.
 */
export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession } = authClient
