'use server'

import { env } from './env'

const parseFlag = (val: string | undefined) =>
  ['true', 'yes', '1', 'on'].includes((val ?? '').trim().toLowerCase())

export async function getRuntimeFeatureFlags() {
  // The ENABLE_* vars are read from process.env on every call rather than from
  // the module-level `env` snapshot, which is parsed once at import. In a
  // long-running server the two are the same; reading live keeps this correct
  // if the module is ever imported before the environment is complete.
  //
  // env.NEXT_PUBLIC_* are read from the snapshot on purpose: Next.js inlines
  // them at build time, so the snapshot *is* the build-time value, which is the
  // right answer for a self-built image.
  return {
    enableExpenseDocuments:
      parseFlag(process.env.ENABLE_EXPENSE_DOCUMENTS) ||
      env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS,
    enableReceiptExtract:
      parseFlag(process.env.ENABLE_RECEIPT_EXTRACT) ||
      env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT,
    enableCategoryExtract:
      parseFlag(process.env.ENABLE_CATEGORY_EXTRACT) ||
      env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT,
  }
}

export type RuntimeFeatureFlags = Awaited<
  ReturnType<typeof getRuntimeFeatureFlags>
>
