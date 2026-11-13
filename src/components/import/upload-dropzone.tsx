'use client'

import { Label } from '@/components/ui/label'
import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

export function UploadDropzone({
  inputId,
  label,
  title,
  description,
  accept = '.csv,.json,text/csv,application/json',
  onSelect,
}: {
  inputId: string
  label: string
  title: string
  description?: string
  accept?: string
  onSelect: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    e.currentTarget.value = ''
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) onSelect(file)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-muted bg-muted/20'
        }`}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
