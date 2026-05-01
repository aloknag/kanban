/**
 * DetailHeader — Header component for detail views (/tasks/:id, /epics/:id)
 *
 * Renders:
 * - Back to board link (top-left, mono)
 * - Catalog gutter: specimen ID (TASK-NNN) and optional parent epic + progress
 * - Title in h1 display serif
 * - Hairline rule
 * - Meta line: agent, created timestamp, updated timestamp (all mono, UTC)
 * - Optional file_missing warning chip
 */

import { Link } from 'react-router-dom'
import type { TaskDetail, EpicDetail } from '../../lib/api'

interface DetailHeaderProps {
  entity: TaskDetail | EpicDetail
  parentEpic?: EpicDetail
  isLoading: boolean
  isNotFound: boolean
}

function formatDatetime(isoString: string | undefined): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'UTC',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    return formatter.format(date)
  } catch {
    return isoString
  }
}

function isTask(entity: TaskDetail | EpicDetail): entity is TaskDetail {
  return 'epic_id' in entity
}

export function DetailHeader({
  entity,
  parentEpic,
  isLoading,
  isNotFound,
}: DetailHeaderProps) {
  if (isNotFound) {
    return (
      <div className="mb-page">
        <Link to="/" className="font-mono text-ink-3 hover:text-ink transition-colors">
          [ ← back to board ]
        </Link>
        <p className="text-body text-warn mt-snug">not found</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mb-page">
        <Link to="/" className="font-mono text-ink-3 hover:text-ink transition-colors">
          [ ← back to board ]
        </Link>
        <p className="text-meta text-ink-3 mt-snug">loading…</p>
      </div>
    )
  }

  const task = isTask(entity) ? entity : null
  const hasFileMissing = entity.content_error === 'file_missing'

  return (
    <div className="mb-gutter">
      {/* Back link */}
      <Link to="/" className="font-mono text-ink-3 hover:text-ink transition-colors text-meta">
        [ ← back to board ]
      </Link>

      {/* Gutter: ID and parent epic */}
      <div className="mt-snug mb-snug flex flex-col">
        <div className="font-mono text-meta text-ink">
          {entity.slug}
        </div>
        {task && task.epic_id && parentEpic && (
          <div className="font-mono text-meta text-ink-3 mt-tight">
            {parentEpic.slug} · {parentEpic.done_count}/{parentEpic.task_count}
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="text-h1 font-display text-ink mb-snug">
        {entity.title}
      </h1>

      {/* Hairline rule */}
      <div className="border-b border-ink-3 mb-snug" />

      {/* Meta line */}
      <div className="font-mono text-meta text-ink mb-snug">
        agent: {entity.assignee || '—'} · created {formatDatetime(entity.created_at)} · updated {formatDatetime(entity.updated_at)}
      </div>

      {/* File missing warning */}
      {hasFileMissing && (
        <div className="text-body text-warn mb-snug" role="alert">
          ⚠ source file missing on disk
        </div>
      )}
    </div>
  )
}
