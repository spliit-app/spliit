import { env } from '@/lib/env'
import { baseProcedure, createTRPCRouter } from '@/trpc/init'

function cleanEnv(val?: string | null): string {
  if (!val) return ''
  return val
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
}

export const authRouter = createTRPCRouter({
  me: baseProcedure.query(async ({ ctx }) => {
    const googleId = cleanEnv(process.env.AUTH_GOOGLE_ID || env.AUTH_GOOGLE_ID)
    const githubId = cleanEnv(process.env.AUTH_GITHUB_ID || env.AUTH_GITHUB_ID)

    return {
      user: ctx.user,
      providers: {
        google: Boolean(googleId),
        github: Boolean(githubId),
      },
    }
  }),
})
