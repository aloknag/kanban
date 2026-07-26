/**
 * SortableColumn — Column with drag-and-drop reordering via @dnd-kit
 *
 * Wraps the Column component with DnD functionality.
 * Per FrontEngDesign.md §6.3:
 * - Header is draggable (grab cursor) for column reordering
 * - Header is also droppable to accept tasks from other columns
 * - On task drop, shows --c-signal left rule
 * - Tasks can be dragged with opacity: 0.4 placeholder
 * - On drop, card flies in 120ms with --m-easing
 */

import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Column as ColumnType, Task } from '../../lib/api'
import { ColumnHeader } from './ColumnHeader'
import { SortableTaskCard } from './SortableTaskCard'
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

  const {
    setNodeRef: setDropNodeRef,
    isOver: isDropOver,
  } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'Column', column },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Set drop target ref on both the section and header
  const combinedRef = (el: HTMLElement | null) => {
    setNodeRef(el)
    setDropNodeRef(el)
  }

  return (
    <section
      ref={combinedRef}
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
        isDropTarget={true}
        isDropActive={isDropOver}
        dndAttributes={attributes}
        dndListeners={listeners}
      />

      <div style={isCollapsed ? { display: 'none' } : undefined}>
        {tasks.length === 0 ? (
          <EmptyColumn />
        ) : (
          <div className="space-y-card">
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                isNew={recentlyUpdatedTaskIds.has(task.id)}
                isFocused={focusedCardId === task.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
