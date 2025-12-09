export const DEFAULT_IMPORT_CHUNK_SIZE = 50
export const getImportChunkSize = () => {
  const envValue = process.env.IMPORT_CHUNK_SIZE
  if (!envValue) return DEFAULT_IMPORT_CHUNK_SIZE
  const parsed = Number(envValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_IMPORT_CHUNK_SIZE
  return Math.floor(parsed)
}
