/**
 * Column — A vertical column containing tasks
 * 
 * Per FrontEngDesign.md §4:
 * - Renders as a vertical section on the board
 * - Shows header with column name and task count
 * - Lists tasks vertically (16px gap)
 * - Shows empty state if no tasks
 * - Supports collapse state for Done column
 */

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

export function Column({
  column,
  tasks,
  recentlyUpdatedTaskIds = new Set(),
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: Props) {
  return (
    <section className="mb-gutter" data-column-id={column.id} data-collapsed={isCollapsed || undefined}>
      <ColumnHeader
        column={column}
        taskCount={tasks.length}
        isCollapsible={isCollapsible}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
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
