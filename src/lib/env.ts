import { z } from 'zod'

const envSchema = z.object({
  POSTGRES_URL_NON_POOLING: z.string().url(),
  POSTGRES_PRISMA_URL: z.string().url(),
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .optional()
    .default(
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000',
    ),
})

export const env = envSchema.parse(process.env)
