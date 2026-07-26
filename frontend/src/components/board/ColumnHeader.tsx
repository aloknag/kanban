/**
 * ColumnHeader — Header for a Kanban column
 *
 * Per FrontEngDesign.md §4.1:
 * - Displays column name in --t-label uppercase mono
 * - Shows count of tasks in --c-ink-2
 * - Em-dash separator
 * - Optional collapse chevron for collapsible columns (Done)
 *
 * Per FrontEngDesign.md §6.3 (DnD):
 * - When isDraggable, shows grab cursor
 * - When isDragging, shows dashed outline + opacity: 0.85
 * - When isDropTarget, shows --c-signal left rule on hover (for task drops)
 */

import { CSSProperties } from 'react'
import { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { Column } from '../../lib/api'

type Props = {
  column: Column
  taskCount: number
  isCollapsible?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  isDraggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  isDropActive?: boolean
  dndAttributes?: DraggableAttributes
  dndListeners?: SyntheticListenerMap
  dndDropAttributes?: DraggableAttributes
  dndDropListeners?: SyntheticListenerMap
  style?: CSSProperties
}

export function ColumnHeader({
  column,
  taskCount,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  isDraggable = false,
  isDragging = false,
  isDropTarget = false,
  isDropActive = false,
  dndAttributes,
  dndListeners,
  dndDropAttributes,
  dndDropListeners,
  style,
}: Props) {
  return (
    <header
      data-testid="column-header"
      className={`flex items-baseline justify-between gap-card mb-gutter ${
        isDraggable ? 'cursor-grab' : ''
      }`}
      data-dragging={isDragging || undefined}
      data-drop-active={isDropActive || undefined}
      style={{
        ...style,
        outline: isDragging ? '1px dashed var(--c-signal)' : 'none',
        opacity: isDragging ? 0.85 : 1,
        borderLeft: isDropActive ? '1px solid var(--c-signal)' : 'none',
        paddingLeft: isDropActive ? '15px' : '0px',
        transition: 'all 80ms ease-out',
      }}
      {...dndAttributes}
      {...dndListeners}
      {...(isDropTarget && dndDropAttributes ? dndDropAttributes : {})}
      {...(isDropTarget && dndDropListeners ? dndDropListeners : {})}
    >
      <div className="flex items-baseline gap-tight">
        <h2 className="text-label font-mono text-ink uppercase tracking-wider">
          {column.name.toUpperCase()}
        </h2>
        <span aria-hidden="true" className="text-ink3">
          —
        </span>
        <span className="text-label font-mono text-ink2">
          {taskCount} specimen{taskCount !== 1 ? 's' : ''}
        </span>
      </div>

      {isCollapsible && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="text-label font-mono text-ink3 hover:text-ink transition-colors duration-fast"
          aria-label={isCollapsed ? `Expand ${column.name} column` : `Collapse ${column.name} column`}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? '[ ▸ expand ]' : '[ ▾ collapse ]'}
        </button>
      )}
    </header>
  )
}
