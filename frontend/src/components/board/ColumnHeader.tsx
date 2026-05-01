/**
 * ColumnHeader — Header for a Kanban column
 * 
 * Per FrontEngDesign.md §4.1:
 * - Displays column name in --t-label uppercase mono
 * - Shows count of tasks in --c-ink-2
 * - Em-dash separator
 */

import { Column } from '../../lib/api'

type Props = {
  column: Column
  taskCount: number
}

export function ColumnHeader({ column, taskCount }: Props) {
  return (
    <header className="flex items-baseline gap-tight mb-gutter">
      <h2 className="text-label font-mono text-ink uppercase tracking-wider">
        {column.name.toUpperCase()}
      </h2>
      <span aria-hidden="true" className="text-ink3">
        —
      </span>
      <span className="text-label font-mono text-ink2">
        {taskCount} specimen{taskCount !== 1 ? 's' : ''}
      </span>
    </header>
  )
}
