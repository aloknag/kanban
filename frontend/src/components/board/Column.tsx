/**
 * Column — A vertical column containing tasks
 * 
 * Per FrontEngDesign.md §4:
 * - Renders as a vertical section on the board
 * - Shows header with column name and task count
 * - Lists tasks vertically (16px gap)
 * - Shows empty state if no tasks
 */

import { Column as ColumnType, Task } from '../../lib/api'
import { ColumnHeader } from './ColumnHeader'
import { TaskCard } from './TaskCard'

type Props = {
  column: ColumnType
  tasks: Task[]
  recentlyUpdatedTaskIds?: Set<number>
}

export function Column({
  column,
  tasks,
  recentlyUpdatedTaskIds = new Set(),
}: Props) {
  return (
    <section className="mb-gutter">
      <ColumnHeader column={column} taskCount={tasks.length} />

      {tasks.length === 0 ? (
        <div className="text-center py-gutter">
          <p className="text-body text-ink3">
            ◇ no specimens
          </p>
          <p className="text-bodysm text-ink3">
            nothing has been filed in this column.
          </p>
        </div>
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
    </section>
  )
}
