'use client'

import { Button } from '@/components/ui/button'

export function ImportProgressView({
  label,
  importingText,
  processed,
  total,
  onCancel,
  cancelLabel,
  cancelling,
}: {
  label: string
  importingText: string
  processed: number
  total: number
  onCancel: () => void
  cancelLabel: string
  cancelling: boolean
}) {
  const percent = Math.min(100, (processed / Math.max(total, 1)) * 100)
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-lg font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">
          {processed}/{total}
        </p>
      </div>
      <div className="w-full max-w-xl space-y-2">
        <div className="h-4 rounded-full bg-muted">
          <div
            className="h-4 rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{importingText}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={cancelling}
      >
        {cancelLabel}
      </Button>
    </div>
  )
}
