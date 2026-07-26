/**
 * EpicDetail — Detail view for an epic (/epics/:id)
 *
 * Per FrontEngDesign.md §6.1 and TDD.md §9:
 * - Fetches epic from GET /api/epics/{id}
 * - Renders DetailHeader with loading/error states
 * - Loading: nothing for ≤80 ms, then "loading…" line
 * - Not found (404): "not found" line in warn color
 * - File missing: warning chip shown by DetailHeader
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plate } from '../components/catalog/Plate'
import { TopRule } from '../components/chrome/TopRule'
import { DetailHeader } from '../components/detail/DetailHeader'
import { Journal } from '../components/detail/Journal'
import { Markdown } from '../components/detail/Markdown'
import { getEpic, EpicDetail as EpicDetailType } from '../lib/api'

export function EpicDetail() {
  const { id } = useParams<{ id: string }>()
  const epicId = id ? parseInt(id, 10) : null
  const isInvalidId = typeof epicId === 'number' && Number.isNaN(epicId)
  const [showLoading, setShowLoading] = useState(false)

  const {
    data: epic,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['epic', epicId],
    queryFn: () => (epicId ? getEpic(epicId) : Promise.reject(new Error('Invalid epic ID'))),
    enabled: !!epicId,
    retry: false,
  })

  // 80ms debounce: only show loading state if still loading after 80ms
  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false)
      return
    }

    const timer = setTimeout(() => {
      setShowLoading(true)
    }, 80)

    return () => clearTimeout(timer)
  }, [isLoading])

  // Determine error state: 404 vs other errors
  // Check error message format: "API error: 404 Not Found"
  const isNotFound = isInvalidId || (error instanceof Error && error.message.includes('404'))
  const hasError = error && !isNotFound

  const shouldShowLoading = showLoading

  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="epic-detail-page">
      <TopRule />
      <Plate>
        <div className="w-full">
          {/* Error state */}
          {hasError && (
            <div className="mb-page p-card bg-card border border-warn text-warn" role="alert">
              <p className="text-body font-mono">
                Error loading epic: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {/* Detail header (handles loading, not found, and normal states) */}
          {epic ? (
            <>
              <DetailHeader
                entity={epic}
                parentEpic={undefined}
                isLoading={shouldShowLoading}
                isNotFound={false}
              />
              {/* Markdown content */}
              {epic.content && (
                <div className="mt-gutter mb-gutter">
                  <Markdown source={epic.content} />
                </div>
              )}

              {/* Linked Tasks */}
              {epic.tasks && epic.tasks.length > 0 && (
                <div className="mt-gutter mb-gutter">
                  <h2 className="text-h2 font-display text-ink mb-gutter">TASKS</h2>
                  <div className="space-y-card">
                    {epic.tasks.map(task => (
                      <div key={task.id} className="p-card bg-card border border-hair border-ink3">
                        <a href={`/tasks/${task.id}`} className="text-body font-mono text-ink hover:underline">
                          {task.slug} - {task.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal section below Markdown content */}
              <Journal entityType="epic" entityId={epic.id} />
            </>
          ) : isNotFound ? (
            <DetailHeader
              entity={{} as EpicDetailType}
              parentEpic={undefined}
              isLoading={false}
              isNotFound={true}
            />
          ) : (
            <DetailHeader
              entity={{} as EpicDetailType}
              parentEpic={undefined}
              isLoading={shouldShowLoading}
              isNotFound={false}
            />
          )}
        </div>
      </Plate>
    </div>
  )
}
