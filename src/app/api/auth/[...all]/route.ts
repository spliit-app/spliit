import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// better-auth owns /api/auth/*: sign-up, sign-in, sign-out, session.
export const { GET, POST } = toNextJsHandler(auth)
