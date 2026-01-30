import React, { useCallback, useRef } from 'react'

// Client-visible constant for max file size (in bytes).
export const MAX_FILE_SIZE = Number(
  process.env.NEXT_PUBLIC_S3_MAX_FILE_SIZE ?? 5 * 1024 * 1024,
)

// client-only: get image dimensions.
export async function getImageData(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()

    img.onload = () => {
      const dimensions = { width: img.width, height: img.height }
      URL.revokeObjectURL(url)
      resolve(dimensions)
    }

    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }

    img.src = url
  })
}

// client-only file input helper hook
export function useFileInput(onFile: (file: File) => void, accept?: string) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const openFileDialog = useCallback(() => inputRef.current?.click(), [])

  const FileInput: React.FC<{ className?: string; accept?: string }> = (
    props = {},
  ) => (
    <input
      ref={inputRef}
      type="file"
      accept={props.accept ?? accept}
      className={props.className ?? 'sr-only'}
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onFile(file)
        e.currentTarget.value = ''
      }}
      aria-hidden="false"
    />
  )

  return { FileInput, openFileDialog }
}
