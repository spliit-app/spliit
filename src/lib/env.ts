import { ZodIssueCode, z } from 'zod'
import { ANALYTICS_PROVIDER_IDS } from './analytics/provider-ids'

const interpretEnvVarAsBool = (val: unknown): boolean => {
  if (typeof val !== 'string') return false
  // .trim() guards against trailing whitespace such as the CR from a CRLF
  // (Windows) .env file, which would otherwise make "true\r" !== "true".
  return ['true', 'yes', '1', 'on'].includes(val.trim().toLowerCase())
}

/**
 * Treats a blank environment variable as unset, so that listing a variable
 * without a value (as `scripts/build.env` does) is not the same as giving it an
 * empty value — which would fail validations like `z.string().url()`.
 */
const interpretBlankEnvVarAsUndefined = (val: unknown): unknown =>
  typeof val === 'string' && val.trim() === '' ? undefined : val

const envSchema = z
  .object({
    DATABASE_URL: z.string().optional().default('file:./spliit.db'),
    POSTGRES_URL_NON_POOLING: z.string().optional(),
    POSTGRES_PRISMA_URL: z.string().optional(),
    AUTH_SECRET: z
      .string()
      .optional()
      .default('development_auth_secret_key_minimum_32_characters_long'),
    AUTH_SESSION_MAX_AGE_DAYS: z.preprocess(
      (val) => (val && String(val).trim() !== '' ? Number(val) : 365),
      z.number().positive().default(365),
    ),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    AUTH_GITHUB_ID: z.string().optional(),
    AUTH_GITHUB_SECRET: z.string().optional(),
    // Runtime override for the public base URL, so a prebuilt image can be
    // told where it is reachable without a rebuild. Takes precedence over
    // NEXT_PUBLIC_BASE_URL, which is baked in at build time.
    BASE_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().url().optional(),
    ),
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
    // Runtime (non-public) counterpart. Next.js inlines NEXT_PUBLIC_* vars into
    // the bundle at build time, so they can never be changed in a prebuilt
    // image; this one is read from the environment at runtime and can be
    // toggled with `docker run -e ...`. Enabling either variable enables the
    // feature, so existing NEXT_PUBLIC_* configuration keeps working.
    ENABLE_EXPENSE_DOCUMENTS: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // Runtime override for the currency pre-selected on the new-group form.
    // Takes precedence over NEXT_PUBLIC_DEFAULT_CURRENCY_CODE.
    DEFAULT_CURRENCY_CODE: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().optional(),
    ),
    NEXT_PUBLIC_DEFAULT_CURRENCY_CODE: z.string().optional(),
    S3_UPLOAD_KEY: z.string().optional(),
    S3_UPLOAD_SECRET: z.string().optional(),
    S3_UPLOAD_BUCKET: z.string().optional(),
    S3_UPLOAD_REGION: z.string().optional(),
    S3_UPLOAD_ENDPOINT: z.string().optional(),
    NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // Runtime (non-public) counterpart, see ENABLE_EXPENSE_DOCUMENTS above.
    ENABLE_RECEIPT_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // Runtime (non-public) counterpart, see ENABLE_EXPENSE_DOCUMENTS above.
    ENABLE_CATEGORY_EXTRACT: z.preprocess(
      interpretEnvVarAsBool,
      z.boolean().default(false),
    ),
    // .trim() guards against a trailing CR from a CRLF (Windows) .env file: a
    // key ending in "\r" would otherwise fail authentication with a 401.
    OPENAI_API_KEY: z.string().trim().optional(),
    // Optional OpenAI-compatible endpoint (a self-hosted or alternative
    // provider). When unset the SDK's default — the official API — is used.
    OPENAI_BASE_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().url().optional(),
    ),
    // The models each feature uses. Both default to what the code used before
    // they were configurable; a provider set through OPENAI_BASE_URL will
    // almost certainly need different names.
    OPENAI_MODEL_RECEIPT_EXTRACT: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().default('gpt-5-nano'),
    ),
    OPENAI_MODEL_CATEGORY_EXTRACT: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().trim().default('gpt-5-nano'),
    ),
    // Analytics is disabled unless a provider is selected. These are read on
    // the server and passed to the client as props, so they are deliberately
    // not `NEXT_PUBLIC_`: a single image stays configurable at container start.
    ANALYTICS_PROVIDER: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.enum(ANALYTICS_PROVIDER_IDS).optional(),
    ),
    PLAUSIBLE_DOMAIN: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().optional(),
    ),
    PLAUSIBLE_HOST: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().url().optional(),
    ),
    // Not a `z.string().url()`: both are usually relative paths, pointing at
    // rewrites that serve Plausible first-party.
    PLAUSIBLE_SCRIPT_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().optional(),
    ),
    PLAUSIBLE_API_URL: z.preprocess(
      interpretBlankEnvVarAsUndefined,
      z.string().optional(),
    ),
  })
  .superRefine((env, ctx) => {
    // Either spelling enables the feature, so either has to satisfy the
    // dependency checks below.
    const enableExpenseDocuments =
      env.ENABLE_EXPENSE_DOCUMENTS || env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS
    const enableReceiptExtract =
      env.ENABLE_RECEIPT_EXTRACT || env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT
    const enableCategoryExtract =
      env.ENABLE_CATEGORY_EXTRACT || env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT
    if (
      enableExpenseDocuments &&
      // S3_UPLOAD_ENDPOINT is fully optional as it will only be used for providers other than AWS
      (!env.S3_UPLOAD_BUCKET ||
        !env.S3_UPLOAD_KEY ||
        !env.S3_UPLOAD_REGION ||
        !env.S3_UPLOAD_SECRET)
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If ENABLE_EXPENSE_DOCUMENTS is set, then S3_* must be set too',
      })
    }
    if (
      (enableReceiptExtract || enableCategoryExtract) &&
      !env.OPENAI_API_KEY
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If ENABLE_RECEIPT_EXTRACT or ENABLE_CATEGORY_EXTRACT is set, then OPENAI_API_KEY must be set too',
      })
    }
    if (env.ANALYTICS_PROVIDER === 'plausible' && !env.PLAUSIBLE_DOMAIN) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message:
          'If ANALYTICS_PROVIDER is set to "plausible", then PLAUSIBLE_DOMAIN must be specified too',
      })
    }
  })

export const env = envSchema.parse(process.env)

// The base URL to use everywhere: the runtime override when set, otherwise the
// value baked in at build time.
export const effectiveBaseUrl = env.BASE_URL ?? env.NEXT_PUBLIC_BASE_URL
