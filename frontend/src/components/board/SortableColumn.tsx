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
  focusedCardId?: number | null
  isCollapsible?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  'data-testid'?: string
}

export function SortableColumn({
  column,
  tasks,
  recentlyUpdatedTaskIds = new Set(),
  focusedCardId = null,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  'data-testid': testid,
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
      data-collapsed={isCollapsed || undefined}
      data-testid={testid}
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

      <div style={isCollapsed ? { display: 'none' } : undefined}>
        {tasks.length === 0 ? (
          <EmptyColumn />
        ) : (
          <div className="space-y-card">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isNew={recentlyUpdatedTaskIds.has(task.id)}
                isFocused={focusedCardId === task.id}
              />
            ))}
          </div>
        )}

        {/* Bottom separator rule */}
        <div
          className="mt-gutter border-b border-ink3"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
