/**
 * TaskCard — Individual task card in a column
 * 
 * Per FrontEngDesign.md §4.2:
 * - Displays task metadata (ID, epic link, assignee, timestamp)
 * - Renders title and excerpt
 * - Shows "new" indicator if recently updated (within 8 seconds)
 * - 1px ruled border, no shadow (except data-new fade animation)
 * - No forbidden classes: shadow-, rounded-*, transform, scale-, backdrop-blur
 */

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Task } from '../../lib/api'

type Props = {
  task: Task
  isNew?: boolean
}

export function TaskCard({ task, isNew = false }: Props) {
  const [showNew, setShowNew] = useState(isNew)

  useEffect(() => {
    if (isNew) {
      setShowNew(true)
      const timer = setTimeout(() => {
        setShowNew(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [isNew])

  return (
    <article
      data-task-id={task.id}
      data-new={showNew || undefined}
      aria-labelledby={`task-${task.id}-title`}
      className={[
        'group relative bg-card border-hair border-ink3 p-card',
        'transition-colors duration-fast hover:border-ink',
        'data-[new]:shadow-[inset_1px_0_0_var(--c-signal)]',
        'data-[new]:transition-[box-shadow] data-[new]:duration-[8000ms]',
      ].join(' ')}
    >
      {/* Meta row: ID, epic, assignee, timestamp */}
      <header className="flex items-baseline gap-tight text-meta font-mono text-ink3 flex-wrap">
        <span className="text-ink2">{task.slug}</span>
        {task.epic_id && (
          <>
            <span aria-hidden="true">·</span>
            <Link
              to={`/epics/${task.epic_id}`}
              className="text-ink2 hover:text-ink hover:underline underline-offset-2"
            >
              EPIC-{String(task.epic_id).padStart(3, '0')}
            </Link>
          </>
        )}
        {task.assignee && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-ink2">{task.assignee}</span>
          </>
        )}
        {task.updated_at && (
          <>
            <span aria-hidden="true">·</span>
            <time
              dateTime={task.updated_at}
              className="text-ink3 ml-auto"
              title={task.updated_at}
            >
              {formatTimeAgo(task.updated_at)}
            </time>
          </>
        )}
      </header>

      {/* Title */}
      <h3
        id={`task-${task.id}-title`}
        className="mt-snug font-display text-cardt text-ink line-clamp-2"
      >
        <Link
          to={`/tasks/${task.id}`}
          className="hover:underline underline-offset-4 decoration-ink3"
        >
          {task.title}
        </Link>
      </h3>

      {/* Excerpt */}
      {task.excerpt && (
        <p className="mt-snug text-bodysm text-ink2 line-clamp-3 max-w-prose">
          {task.excerpt}
        </p>
      )}
    </article>
  )
}

/**
 * Format timestamp as relative time (e.g., "12 min ago")
 */
function formatTimeAgo(iso: string): string {
  const now = new Date()
  const then = new Date(iso)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
