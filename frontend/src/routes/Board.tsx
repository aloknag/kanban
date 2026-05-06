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

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type ScreenReaderInstructions,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TopRule } from '../components/chrome/TopRule'
import { Plate } from '../components/catalog/Plate'
import { KeyboardSheet } from '../components/chrome/KeyboardSheet'
import { SortableColumn } from '../components/board/SortableColumn'
import { TaskDragOverlay } from '../components/board/TaskDragOverlay'
import { useHotkeys } from '../system/HotkeyProvider'
import { useTheme } from '../system/ThemeProvider'
import {
  getColumns,
  getTasks,
  patchColumnsReorder,
  patchTask,
  Column as ColumnType,
  Task,
} from '../lib/api'
import { columnReorderReducer } from '../lib/columnReorder'
import { shouldRejectDragEnd } from '../lib/dndGuards'

export function Board() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
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

  // HotkeyProvider state (task #30)
  const [focusedCardId, setFocusedCardId] = useState<number | null>(null)
  const [keyboardSheetOpen, setKeyboardSheetOpen] = useState(false)

  // DnD column reorder state (task #28)
  const [isReorderInFlight, setIsReorderInFlight] = useState(false)

  // DnD task drag state (task #29)
  const [activeTaskDrag, setActiveTaskDrag] = useState<Task | null>(null)

  // Filter state
  const [filterText, setFilterText] = useState('')

  // Set up DnD sensors for pointer and keyboard
  // distance: 8 lets short taps pass through to child Links; drag only activates after 8px movement
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Accessibility announcements for screen readers (FrontEngDesign §14)
  const announcements: Announcements = {
    onDragStart({ active }) {
      const column = columns.find(c => c.id === active.id)
      return column ? `Started dragging column ${column.name}` : undefined
    },
    onDragMove({ active, over }) {
      const column = columns.find(c => c.id === active.id)
      const overColumn = columns.find(c => c.id === over?.id)
      if (column && overColumn) {
        return `Dragging column ${column.name} over ${overColumn.name}`
      }
      return undefined
    },
    onDragOver({ active, over }) {
      const column = columns.find(c => c.id === active.id)
      const overColumn = columns.find(c => c.id === over?.id)
      if (column && overColumn) {
        return `Moving column ${column.name} before ${overColumn.name}`
      }
      return undefined
    },
    onDragEnd({ active, over }) {
      const column = columns.find(c => c.id === active.id)
      const overColumn = columns.find(c => c.id === over?.id)
      if (column && overColumn) {
        return `Successfully moved column ${column.name} to position before ${overColumn.name}`
      }
      return column ? `Column ${column.name} reorder completed` : undefined
    },
    onDragCancel({ active }) {
      const column = columns.find(c => c.id === active.id)
      return column ? `Cancelled dragging column ${column.name}` : undefined
    },
  }

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: 'Press space or enter to drag columns. Use arrow keys to move. Press escape to cancel.',
  }

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

  // Filter tasks based on text
  const filteredTasks = useMemo(() => {
    return tasks.filter(task =>
      task.title.toLowerCase().includes(filterText.toLowerCase()) ||
      task.slug.toLowerCase().includes(filterText.toLowerCase())
    )
  }, [tasks, filterText])

  // Focus first card on mount
  useEffect(() => {
    if (tasks.length > 0 && focusedCardId === null) {
      setFocusedCardId(tasks[0].id)
    }
  }, [tasks, focusedCardId])

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
  }, [columns, collapsedColumns])

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

      // Clear active drag
      setActiveTaskDrag(null)

      // Prevent concurrent drags while a PATCH is in-flight
      if (isReorderInFlight) {
        console.warn('Drag in progress — ignoring concurrent drag')
        return
      }

      if (!over || active.id === over.id) {
        return
      }

      // Determine if this is a task move (task-X to column-Y) or column reorder
      const isTaskDrag = String(active.id).startsWith('task-')
      const isColumnDrop = String(over.id).startsWith('column-')

      if (isTaskDrag && isColumnDrop) {
        // Task-to-column move
        const taskId = parseInt(String(active.id).substring(5), 10) // Extract ID from "task-X"
        const columnId = parseInt(String(over.id).substring(7), 10) // Extract ID from "column-X"

        const taskToMove = tasks.find(t => t.id === taskId)
        if (!taskToMove || taskToMove.column_id === columnId) {
          return
        }

        // Optimistic update: move task in cache immediately
        const updatedTasks = tasks.map(t =>
          t.id === taskId ? { ...t, column_id: columnId } : t
        )
        queryClient.setQueryData(['tasks'], updatedTasks)

        // Set in-flight flag
        setIsReorderInFlight(true)

        // Call API with optimistic update
        patchTask(taskId, { column_id: columnId })
          .catch(() => {
            // On error, refetch to get the true state (rollback)
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
          })
          .finally(() => {
            setIsReorderInFlight(false)
          })
      } else {
        // Column reorder (existing logic)
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

        // Set in-flight flag to prevent concurrent drags
        setIsReorderInFlight(true)

        // Call API
        patchColumnsReorder(newIds)
          .catch(() => {
            // On error, refetch to get the true state
            queryClient.invalidateQueries({ queryKey: ['columns'] })
          })
          .finally(() => {
            // Clear in-flight flag when API call completes (success or error)
            setIsReorderInFlight(false)
          })
      }
    },
    [sortedColumns, columns, tasks, queryClient, isReorderInFlight]
  )

  const isLoading = columnsLoading || tasksLoading
  const error = columnsError || tasksError

  // Memoize stable hotkey object with all dependencies
  // This prevents unnecessary re-registration via useHotkeys dependency array
  const hotkeys = useMemo(() => ({
    j: () => {
      const currentIdx = tasks.findIndex(t => t.id === focusedCardId)
      if (currentIdx < tasks.length - 1) {
        setFocusedCardId(tasks[currentIdx + 1].id)
      }
    },
    k: () => {
      const currentIdx = tasks.findIndex(t => t.id === focusedCardId)
      if (currentIdx > 0) {
        setFocusedCardId(tasks[currentIdx - 1].id)
      }
    },
    'g b': () => navigate('/'),
    'g e': () => navigate('/epics'),
    enter: () => {
      if (focusedCardId) navigate(`/tasks/${focusedCardId}`)
    },
    escape: () => setKeyboardSheetOpen(false),
    n: () => {
      if (focusedCardId) {
        navigate(`/tasks/${focusedCardId}`)
        // Focus the compose textarea after navigation
        // Use setTimeout to ensure the DOM has updated after route change
        setTimeout(() => {
          const textarea = document.querySelector<HTMLTextAreaElement>(
            '[data-testid="comment-input"]'
          )
          if (textarea) {
            textarea.focus()
          }
        }, 0)
      }
    },
    c: () => {
      if (focusedCardId) {
        const focusedTask = tasks.find(t => t.id === focusedCardId)
        if (focusedTask) {
          handleToggleCollapse(focusedTask.column_id)
        }
      }
    },
    '/': () => {
      // TODO: Focus the filter input in TopRule
    },
    '?': () => setKeyboardSheetOpen(!keyboardSheetOpen),
    t: toggleTheme,
  }), [tasks, focusedCardId, navigate, keyboardSheetOpen, handleToggleCollapse, toggleTheme])

  // Register hotkey handlers
  useHotkeys(hotkeys)

  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="board-page">
      <TopRule />
      <KeyboardSheet open={keyboardSheetOpen} onClose={() => setKeyboardSheetOpen(false)} />
      <Plate filterText={filterText} onFilterChange={setFilterText}>
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
              onDragStart={(event) => {
                // Track active task drag for visual feedback
                const draggedId = event.active.id
                if (String(draggedId).startsWith('task-')) {
                  const taskId = parseInt(String(draggedId).substring(5), 10)
                  const task = tasks.find(t => t.id === taskId)
                  if (task) {
                    setActiveTaskDrag(task)
                  }
                }
              }}
              onDragEnd={handleDragEnd}
              accessibility={{
                announcements,
                screenReaderInstructions,
              }}
            >
              <SortableContext
                items={sortedColumns.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex gap-gutter" data-testid="board-content">
                  {sortedColumns.map(column => {
                    const columnTasks = filteredTasks.filter(t => t.column_id === column.id)
                    const isCollapsible = column.name === 'Done'
                    const isCollapsed = collapsedColumns.has(column.id)
                    return (
                      <SortableColumn
                        key={column.id}
                        column={column}
                        tasks={columnTasks}
                        recentlyUpdatedTaskIds={recentlyUpdatedTaskIds}
                        focusedCardId={focusedCardId}
                        isCollapsible={isCollapsible}
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => handleToggleCollapse(column.id)}
                        data-testid="column"
                      />
                    )
                  })}
                </div>
              </SortableContext>
              <TaskDragOverlay activeTask={activeTaskDrag} />
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
