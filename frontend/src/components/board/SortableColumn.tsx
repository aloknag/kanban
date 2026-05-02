/**
 * SortableColumn — Column with drag-and-drop reordering via @dnd-kit
 *
 * Wraps the Column component with DnD functionality.
 * Per FrontEngDesign.md §6.3:
 * - Header is draggable (grab cursor)
 * - On drag, shows dashed outline + opacity: 0.85
 * - Other columns shift in 80ms
 * - Drop snaps in 120ms
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Column as ColumnType, Task } from '../../lib/api'
import { ColumnHeader } from './ColumnHeader'
import { TaskCard } from './TaskCard'
import { EmptyColumn } from './EmptyColumn'

type Props = {
  column: ColumnType
  tasks: Task[]
  recentlyUpdatedTaskIds?: Set<number>
  isCollapsible?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function SortableColumn({
  column,
  tasks,
  recentlyUpdatedTaskIds = new Set(),
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      data-column-id={column.id}
      className="mb-gutter"
    >
      <ColumnHeader
        column={column}
        taskCount={tasks.length}
        isCollapsible={isCollapsible}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        isDraggable={true}
        isDragging={isDragging}
        dndAttributes={attributes}
        dndListeners={listeners}
      />

      {!isCollapsed && (
        <>
          {tasks.length === 0 ? (
            <EmptyColumn />
          ) : (
            <div className="space-y-card">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isNew={recentlyUpdatedTaskIds.has(task.id)}
                />
              ))}
            </div>
          )}

          {/* Bottom separator rule */}
          <div
            className="mt-gutter border-b border-ink3"
            aria-hidden="true"
          />
        </>
      )}
    </section>
  )
}
