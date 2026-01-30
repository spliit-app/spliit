// Thin typed client for the documents API routes
// - follows the routes implemented in `src/app/api/documents/route.ts`
// - provides `uploadDocument`, `fetchDocument` and `documentUrl` helpers

export type ExpenseDocumentRecord = {
  id: string
  url: string
  width: number
  height: number
  expenseId?: string | null

  filename?: string
}

const BASE = '/api/documents'

function makeAbsoluteUrl(value: string) {
  if (!value) return value
  if (/^https?:\/\//i.test(value)) return value
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || ''
  if (!base) return value
  const path = value.startsWith('/') ? value : `/${value}`
  return `${base}${path}`
}

/**
 * Returns an URL that can be used directly in an <img> tag (or fetch) to retrieve the document
 * Note: using Next.js <Image> with this URL may trigger the internal optimizer which expects
 * external images to be configured in next.config.js. Use a plain <img> or fetch() for binary data.
 */
export function documentUrl(id: string) {
  const relative = `${BASE}/${encodeURIComponent(id)}`
  return makeAbsoluteUrl(relative)
}

/**
 * Uploads a File using the documents POST route (multipart/form-data).
 * Returns the created ExpenseDocument record (as the route currently returns JSON for POST).
 */
export async function uploadDocument(
  file: File,
  metadata: { width: number; height: number },
): Promise<ExpenseDocumentRecord> {
  const form = new FormData()
  form.append('file', file)
  form.append('width', String(metadata.width))
  form.append('height', String(metadata.height))

  const res = await fetch(BASE, { method: 'POST', body: form })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`uploadDocument failed: ${res.status} ${text}`)
  }

  const json = await res.json()
  return json as ExpenseDocumentRecord
}
