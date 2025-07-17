import { ZodIssueCode, z } from 'zod'

const interpretEnvVarAsBool = (val: unknown): boolean => {
  if (typeof val !== 'string') return false
  return ['true', 'yes', '1', 'on'].includes(val.toLowerCase())
}

const envSchema = z
  .object({
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
    NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_DEFAULT_CURRENCY_SYMBOL: z.string().optional(),
    S3_UPLOAD_KEY: z.string().optional(),
    S3_UPLOAD_SECRET: z.string().optional(),
    S3_UPLOAD_BUCKET: z.string().optional(),
    S3_UPLOAD_REGION: z.string().optional(),
    S3_UPLOAD_ENDPOINT: z.string().optional(),
    NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    OPENAI_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (
      env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS &&
      // S3_UPLOAD_ENDPOINT is fully optional as it will only be used for providers other than AWS
      (!env.S3_UPLOAD_BUCKET ||
        !env.S3_UPLOAD_KEY ||
        !env.S3_UPLOAD_REGION ||
        !env.S3_UPLOAD_SECRET)
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS is specified, then S3_* must be specified too',
      })
    }
    if (
      (env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT ||
        env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT) &&
      !env.OPENAI_API_KEY
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT or NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT is specified, then OPENAI_API_KEY must be specified too',
      })
    }
  })

export const env = envSchema.parse(process.env)
