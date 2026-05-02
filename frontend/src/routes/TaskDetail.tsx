/**
 * TaskDetail — Detail view for a task (/tasks/:id)
 *
 * Per FrontEngDesign.md §6.1 and TDD.md §9:
 * - Fetches task from GET /api/tasks/{id}
 * - Fetches parent epic if epic_id is set
 * - Renders DetailHeader with loading/error states
 * - Loading: nothing for ≤80 ms, then "loading…" line
 * - Not found (404): "not found" line in warn color
 * - File missing: warning chip shown by DetailHeader
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plate } from '../components/catalog/Plate'
import { TopRule } from '../components/chrome/TopRule'
import { DetailHeader } from '../components/detail/DetailHeader'
import { Journal } from '../components/detail/Journal'
import { Markdown } from '../components/detail/Markdown'
import { getTask, getEpic, TaskDetail as TaskDetailType } from '../lib/api'

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const taskId = id ? parseInt(id, 10) : null
  const [showLoading, setShowLoading] = useState(false)

  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => (taskId ? getTask(taskId) : Promise.reject(new Error('Invalid task ID'))),
    enabled: !!taskId,
    retry: false,
  })

  const {
    data: parentEpic,
  } = useQuery({
    queryKey: ['epic', task?.epic_id],
    queryFn: () => (task?.epic_id ? getEpic(task.epic_id) : Promise.resolve(undefined)),
    enabled: !!task?.epic_id,
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
  const isNotFound = error instanceof Error && error.message.includes('404')
  const hasError = error && !isNotFound

  const shouldShowLoading = showLoading

  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="task-detail-page">
      <TopRule />
      <Plate>
        <div className="w-full">
          {/* Error state */}
          {hasError && (
            <div className="mb-page p-card bg-card border border-warn text-warn" role="alert">
              <p className="text-body font-mono">
                Error loading task: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {/* Detail header (handles loading, not found, and normal states) */}
          {task ? (
            <>
              <DetailHeader
                entity={task}
                parentEpic={parentEpic}
                isLoading={shouldShowLoading}
                isNotFound={false}
              />
              {/* Markdown content */}
              {task.content && (
                <div className="mt-gutter mb-gutter">
                  <Markdown source={task.content} />
                </div>
              )}
              {/* Journal section below Markdown content */}
              <Journal entityType="task" entityId={task.id} />
            </>
          ) : isNotFound ? (
            <DetailHeader
              entity={{} as TaskDetailType}
              parentEpic={undefined}
              isLoading={false}
              isNotFound={true}
            />
          ) : (
            <DetailHeader
              entity={{} as TaskDetailType}
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
