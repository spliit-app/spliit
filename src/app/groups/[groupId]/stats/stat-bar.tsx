import { Skeleton } from '@/components/ui/skeleton'

/**
 * A horizontal proportional bar used by the category and over-time stats.
 * `value` is drawn relative to `max`; `color` is any CSS color (e.g. a chart
 * CSS variable).
 */
export function StatBar({
  value,
  max,
  color,
}: {
  value: number
  max: number
  color: string
}) {
  const width = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  )
}

/** Loading placeholder matching a list of labelled {@link StatBar} rows. */
export function StatBarListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  )
}
