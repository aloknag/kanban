/**
 * TaskDragOverlay — Ghost rectangle shown while dragging a task
 *
 * Per FrontEngDesign.md §6.3:
 * - 1-px dashed --c-signal outline
 * - Tracks cursor position
 * - Minimal visual distraction
 */

import { DragOverlay } from '@dnd-kit/core'
import { Task } from '../../lib/api'

type Props = {
  activeTask: Task | null
}

export function TaskDragOverlay({ activeTask }: Props) {
  if (!activeTask) {
    return null
  }

  return (
    <DragOverlay>
      <div
        className="bg-card border border-dashed border-signal p-card"
        style={{
          minHeight: '120px',
          opacity: 0.8,
        }}
      >
        <div className="text-bodysm font-mono text-ink truncate">
          {activeTask.slug}
        </div>
        <div className="text-cardt font-display text-ink mt-snug line-clamp-2">
          {activeTask.title}
        </div>
      </div>
    </DragOverlay>
  )
}
