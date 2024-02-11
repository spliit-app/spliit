export async function getRuntimeFlags() {
  'use server'

  const asBoolean = (value: string | undefined) =>
    (value === "true" || value === "1")

  return {
    enableExpenseDocuments: asBoolean(global.process.env.NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS),
    enableCategoryExtract: asBoolean(global.process.env.NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT),
    enableReceiptExtract: asBoolean(global.process.env.NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT),
  }
}
