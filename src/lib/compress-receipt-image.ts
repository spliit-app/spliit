const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.75

/**
 * Downscale and recompress a receipt image in the browser to reduce OpenAI
 * vision token usage (and S3 upload size) without hurting OCR much.
 */
export async function compressReceiptImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    )
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    // Already small enough and not a huge PNG/JPEG — skip re-encode.
    if (scale === 1 && file.size <= 400 * 1024) {
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'receipt'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
