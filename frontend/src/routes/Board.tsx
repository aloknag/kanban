/**
 * Board — Main board route (/board)
 *
 * Per TDD.md §4 and FrontEngDesign.md §4:
 * - Renders tasks in Kanban columns
 * - Fetches columns and tasks from API
 * - Shows loading and error states
 * - Uses the Plate layout with TopRule chrome
 * - Done column is collapsed by default with localStorage persistence
 * - Columns sorted with Done forced to bottom
 *
 * Per issue #28 (FrontEngDesign.md §6.3):
 * - Columns are reorderable via DnD
 * - Optimistic updates with React Query cache
 * - PATCH /api/columns/reorder on drop
 */

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TopRule } from '../components/chrome/TopRule'
import { Plate } from '../components/catalog/Plate'
import { SortableColumn } from '../components/board/SortableColumn'
import {
  getColumns,
  getTasks,
  patchColumnsReorder,
  Column as ColumnType,
  Task,
} from '../lib/api'
import { columnReorderReducer } from '../lib/columnReorder'
import { shouldRejectDragEnd } from '../lib/dndGuards'

export function Board() {
  const queryClient = useQueryClient()
  const [recentlyUpdatedTaskIds, setRecentlyUpdatedTaskIds] = useState<
    Set<number>
  >(new Set())
  const [collapsedColumns, setCollapsedColumns] = useState<Set<number>>(() => {
    // Load collapsed columns from localStorage
    try {
      const stored = localStorage.getItem('collapsed_columns')
      if (stored) {
        return new Set(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to parse collapsed_columns from localStorage', e)
    }
    return new Set()
  })

  // Set up DnD sensors for pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch columns
  const {
    data: columns = [],
    isLoading: columnsLoading,
    error: columnsError,
  } = useQuery<ColumnType[]>({
    queryKey: ['columns'],
    queryFn: () => getColumns(),
  })

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  })

  // Track recently updated tasks for "new" indicator (8 second decay)
  useEffect(() => {
    if (tasks.length === 0) return

    const now = Date.now()
    const newTaskIds = new Set<number>()

    tasks.forEach((task: Task) => {
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
          const task = tasks.find((t: Task) => t.id === taskId)
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

  // Ensure Done column is in collapsed set on initial load
  useEffect(() => {
    if (columns.length > 0) {
      const doneColumn = columns.find(c => c.name === 'Done')
      if (doneColumn && !collapsedColumns.has(doneColumn.id)) {
        setCollapsedColumns(prev => new Set([...prev, doneColumn.id]))
      }
    }
  }, [columns])

  // Sort columns: Done forced to bottom
  const sortedColumns = [
    ...columns.filter(c => c.name !== 'Done').sort((a, b) => a.position - b.position),
    ...columns.filter(c => c.name === 'Done'),
  ]

  const handleToggleCollapse = (columnId: number) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      // Persist to localStorage
      localStorage.setItem('collapsed_columns', JSON.stringify([...next]))
      return next
    })
  }

  // Handle column reordering via DnD
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (!over || active.id === over.id) {
        return
      }

      const oldIndex = sortedColumns.findIndex(c => c.id === active.id)
      const newIndex = sortedColumns.findIndex(c => c.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Apply guard: prevent Done column moves
      if (shouldRejectDragEnd(active.id, over.id, columns)) {
        console.warn('Cannot reorder Done column — it must remain at bottom')
        return
      }

      // Compute new order using the reducer as authoritative source
      const newColumnsList = arrayMove(sortedColumns, oldIndex, newIndex)
      const newIds = newColumnsList.map(c => c.id)
      const newColumns = columnReorderReducer(columns, newIds)

      // Optimistic update: update React Query cache immediately
      queryClient.setQueryData(['columns'], newColumns)

      // Call API
      patchColumnsReorder(newIds).catch(() => {
        // On error, refetch to get the true state
        queryClient.invalidateQueries({ queryKey: ['columns'] })
      })
    },
    [sortedColumns, columns, queryClient]
  )

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
          {!isLoading && sortedColumns.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedColumns.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div data-testid="board-content">
                  {sortedColumns.map(column => {
                    const columnTasks = tasks.filter(t => t.column_id === column.id)
                    const isCollapsible = column.name === 'Done'
                    const isCollapsed = collapsedColumns.has(column.id)
                    return (
                      <SortableColumn
                        key={column.id}
                        column={column}
                        tasks={columnTasks}
                        recentlyUpdatedTaskIds={recentlyUpdatedTaskIds}
                        isCollapsible={isCollapsible}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => handleToggleCollapse(column.id)}
                        data-testid="column"
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Empty board state */}
          {!isLoading && sortedColumns.length === 0 && (
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
