export function normalizeGroupSourceUrl(urlString: string) {
  const parsed = new URL(urlString)
  const groupId = parsed.pathname.match(/\/groups\/([^/]+)/)?.[1]
  if (!groupId) {
    throw new Error('URL must include /groups/{groupId}.')
  }
  return `${parsed.origin}/groups/${groupId}`
}

export function buildImportMarkerData(
  mode: 'create' | 'update' | 'rollback',
  expenseCount: number,
  sourceUrl?: string,
) {
  const base = `JSON_IMPORT_START:${mode}:${expenseCount} expenses`
  if (!sourceUrl) return base
  return `${base}|sourceUrl=${encodeURIComponent(normalizeGroupSourceUrl(sourceUrl))}`
}

export function extractSourceUrlFromImportMarker(data?: string | null) {
  if (!data || !data.startsWith('JSON_IMPORT_START:')) return null

  const marker = 'sourceUrl='
  const markerIndex = data.indexOf(marker)
  if (markerIndex === -1) return null

  const encoded = data.slice(markerIndex + marker.length).trim()
  if (!encoded) return null

  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

export function setSourceUrlInImportMarkerData(
  data: string,
  sourceUrl?: string | null,
) {
  const base = data.replace(/\|sourceUrl=.*$/, '')
  const trimmed = sourceUrl?.trim()

  if (!trimmed) return base
  return `${base}|sourceUrl=${encodeURIComponent(normalizeGroupSourceUrl(trimmed))}`
}