import { z } from 'zod'

const envSchema = z.object({
  POSTGRES_URL_NON_POOLING: z.string().url(),
  POSTGRES_PRISMA_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
