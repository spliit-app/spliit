'use client'

import { Button } from '@/components/ui/button'

export type ImportResultStatus = 'completed' | 'cancelled'

export function ImportResultView({
  status,
  title,
  confirmLabel,
  onConfirm,
  confirmDisabled,
}: {
  status: ImportResultStatus
  title: string
  confirmLabel: string
  onConfirm: () => void
  confirmDisabled?: boolean
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-lg font-semibold">{title}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
