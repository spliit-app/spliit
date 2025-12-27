import {
  ImportFormat,
  importFormats,
  type ImportParsedGroupInfo,
} from '@/lib/imports/types'
// Self-registering formats (side effect imports)
import '@/lib/imports/formats/debug-format'
import '@/lib/imports/spliit-json'

// Registry entry points
//
// This module exposes small helpers that orchestrate the format registry.
// Responsibilities:
// - Collect all self‑registering formats
// - Run detection on content + context to find the best matching adapter
// - Delegate parsing to the selected adapter into internal ExpenseFormValues

// Choose the most likely format for given content.
// Returns the selected ImportFormat instance or null if none match.
export async function detectFormat(
  content: string,
): Promise<ImportFormat | null> {
  return importFormats.detect(content)
}

// Parse a file into internal form values using the detected format.
//
// - Detection: calls detectFormat(...) to select an adapter based on content head and context.
// - Parsing: invokes the adapter's parseToInternal(...) to produce ExpenseFormValues.
// - Meta: adapters may optionally return meta information (e.g., source currency/name).
export async function parseWithDetectionInternal(content: string): Promise<{
  expenses: import('@/lib/schemas').ExpenseFormValues[]
  format: ImportFormat
  group?: ImportParsedGroupInfo
  errors: { row: number; message: string }[]
}> {
  const format = await detectFormat(content)
  if (!format) throw new Error('Unsupported file format.')
  if (!format.parseToInternal)
    throw new Error('Format does not support internal parsing.')
  const { expenses, group, errors } = await format.parseToInternal(content)
  return { expenses, group, format, errors: errors ?? [] }
}
