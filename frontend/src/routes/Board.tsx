/**
 * Board — Main board route (/board)
 * 
 * Per TDD.md §4 and FrontEngDesign.md §4:
 * - Renders tasks in Kanban columns
 * - Fetches columns and tasks from API
 * - Shows loading and error states
 * - Uses the Plate layout with TopRule chrome
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TopRule } from '../components/chrome/TopRule'
import { Plate } from '../components/catalog/Plate'
import { Column } from '../components/board/Column'
import { getColumns, getTasks, Column as ColumnType, Task } from '../lib/api'

export function Board() {
  const [recentlyUpdatedTaskIds, setRecentlyUpdatedTaskIds] = useState<
    Set<number>
  >(new Set())

  // Fetch columns
  const {
    data: columns = [],
    isLoading: columnsLoading,
    error: columnsError,
  } = useQuery<ColumnType[]>({
    queryKey: ['columns'],
    queryFn: getColumns,
  })

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })

  // Track recently updated tasks for "new" indicator (8 second decay)
  useEffect(() => {
    if (tasks.length === 0) return

    const now = Date.now()
    const newTaskIds = new Set<number>()

    tasks.forEach(task => {
      if (task.updated_at) {
        const taskTime = new Date(task.updated_at).getTime()
        const ageMs = now - taskTime
        if (ageMs < 8000) {
          newTaskIds.add(task.id)
        }
      }
    })

    setRecentlyUpdatedTaskIds(newTaskIds)

    // Clean up old task IDs every 1 second
    const interval = setInterval(() => {
      const now = Date.now()
      setRecentlyUpdatedTaskIds(prev => {
        const next = new Set(prev)
        prev.forEach(taskId => {
          const task = tasks.find(t => t.id === taskId)
          if (task?.updated_at) {
            const taskTime = new Date(task.updated_at).getTime()
            const ageMs = now - taskTime
            if (ageMs >= 8000) {
              next.delete(taskId)
            }
          }
        })
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [tasks])

  const isLoading = columnsLoading || tasksLoading
  const error = columnsError || tasksError

  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="board-page">
      <TopRule />
      <Plate>
        <div className="w-full">
          {/* Error state */}
          {error && (
            <div
              className="mb-page p-card bg-card border border-warn text-warn"
              role="alert"
            >
              <p className="text-body font-mono">
                Error loading board: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-page">
              <p className="text-body text-ink3">loading…</p>
            </div>
          )}

          {/* Board content */}
          {!isLoading && columns.length > 0 && (
            <div data-testid="board-content">
              {columns.map(column => {
                const columnTasks = tasks.filter(t => t.column_id === column.id)
                return (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    recentlyUpdatedTaskIds={recentlyUpdatedTaskIds}
                    data-testid="column"
                  />
                )
              })}
            </div>
          )}

          {/* Empty board state */}
          {!isLoading && columns.length === 0 && (
            <div className="text-center py-page">
              <p className="text-display text-ink3">◇</p>
              <p className="text-h2 text-ink mt-page">no board found</p>
              <p className="text-body text-ink2 mt-snug">
                create columns to get started.
              </p>
            </div>
          )}
        </div>
      </Plate>
    </div>
  )
}

