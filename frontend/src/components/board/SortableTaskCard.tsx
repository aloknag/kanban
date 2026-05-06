/**
 * SortableTaskCard — Task card with drag-and-drop to move between columns
 *
 * Per FrontEngDesign.md §6.3:
 * - Card becomes opacity: 0.4 (placeholder) when dragging
 * - Ghost rectangle with dashed --c-signal outline tracks cursor
 * - Drop target column header gets --c-signal left rule on hover
 * - On drop, card flies in 120ms with --m-easing
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CSSProperties } from 'react'
import { Task } from '../../lib/api'
import { TaskCard } from './TaskCard'

type Props = {
  task: Task
  isNew?: boolean
  isFocused?: boolean
}

export function SortableTaskCard({ task, isNew = false, isFocused = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'Task', task },
  })

  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : 1,
    transition,
    transform: CSS.Transform.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-draggable-id={`task-${task.id}`}
    >
      <TaskCard task={task} isNew={isNew} isFocused={isFocused} />
    </div>
  )
}
