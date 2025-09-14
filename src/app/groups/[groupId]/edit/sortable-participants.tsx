import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import React from 'react'
export function SortableParticipant({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-3 rounded-lg border bg-card shadow-sm"
    >
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
