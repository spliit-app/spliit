import { Badge } from '@/components/ui/badge'
import { getTagColor } from '@/lib/tags'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export function TagBadge({
  name,
  children,
  className,
}: {
  name: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn('max-w-full break-all font-normal', className)}
      style={{
        backgroundColor: getTagColor(name, 0.16),
        borderColor: getTagColor(name, 0.5),
      }}
    >
      {children ?? name}
    </Badge>
  )
}
