import type { ExpenseFormValues } from '@/lib/schemas'

// Interface a format adapter must implement.
//
// Each adapter provides:
// - id/label/priority: identity + tie‑breaks
// - detect: structural detection on full content (0..1)
// - parseToInternal: full parse → ExpenseFormValues
export type ImportParsedGroupInfo = {
  // Optional group name from the file (if present)
  name?: string
  // Display currency symbol (e.g., "€") and ISO code (e.g., "EUR") if available
  currency?: string
  currencyCode?: string
  // Optional participant list provided by the file (names preferred for display)
  participants?: { id?: string; name: string }[]
}

export interface ImportFormat {
  // Unique, stable identifier (e.g. "spliit-json").
  id: string
  // Human-readable label (e.g. "Spliit JSON").
  label: string
  // Priority used to break ties between formats with equal detection scores.
  priority: number
  // Detection on the full content. Return 0 to opt out.
  // Implementations may do a fast check or a full parse depending on format.
  detect(content: string): Promise<number>
  // Parse full content into internal values.
  parseToInternal?: (content: string) => Promise<{
    expenses: ExpenseFormValues[]
    group?: ImportParsedGroupInfo
    errors?: { row: number; message: string }[]
  }>
}

// Simple in-memory registry of available formats.
export class ImportFormatRegistry {
  private formats: ImportFormat[] = []
  register(format: ImportFormat) {
    this.formats.push(format)
  }
  list(): ImportFormat[] {
    return [...this.formats].sort((a, b) => b.priority - a.priority)
  }
  // Selection strategy for detect():
  // - Provide full content to each format.
  // - Each format returns a score in [0..1]; 0 means "not a candidate".
  // - Rank by score (desc), then by format.priority (desc) for deterministic tie‑breaks.
  // - Return the top candidate or null if no format opts in.
  async detect(content: string) {
    const scored = await Promise.all(
      this.list().map(async (f) => ({
        format: f,
        score: await f.detect(content),
      })),
    )
    const candidates = scored
      .filter((x) => x.score > 0)
      .sort(
        (a, b) => b.score - a.score || b.format.priority - a.format.priority,
      )
    return candidates[0]?.format ?? null
  }
}

export const importFormats = new ImportFormatRegistry()
