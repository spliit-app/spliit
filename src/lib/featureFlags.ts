'use server'

import { env } from './env'

export async function getRuntimeFeatureFlags() {
  return {
    enableExpenseDocuments: env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS,
    enableReceiptExtract: env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT,
    enableCategoryExtract: env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT,
    enableCategoryExtractStatic: env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT_STATIC,
  }
}

export type RuntimeFeatureFlags = Awaited<
  ReturnType<typeof getRuntimeFeatureFlags>
>
