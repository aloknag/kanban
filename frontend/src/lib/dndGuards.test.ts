import { describe, it, expect } from 'vitest'
import { shouldRejectDragEnd, resolveDroppableColumnId } from './dndGuards'
import { Column } from './api'

describe('dndGuards.shouldRejectDragEnd', () => {
  const columns: Column[] = [
    { id: 1, name: 'Todo', position: 0 },
    { id: 2, name: 'In Progress', position: 1 },
    { id: 3, name: 'Done', position: 2 },
  ]

  describe('Guard 1: Prevent Done from being dragged away', () => {
    it('rejects when activeId is Done column', () => {
      const doneColumn = columns.find(c => c.name === 'Done')!
      const inProgressColumn = columns.find(c => c.name === 'In Progress')!

      const result = shouldRejectDragEnd(doneColumn.id, inProgressColumn.id, columns)
      expect(result).toBe(true)
    })

    it('allows when activeId is not Done', () => {
      const inProgressColumn = columns.find(c => c.name === 'In Progress')!
      const todoColumn = columns.find(c => c.name === 'Todo')!

      const result = shouldRejectDragEnd(inProgressColumn.id, todoColumn.id, columns)
      expect(result).toBe(false)
    })
  })

  describe('Guard 2: Prevent dropping onto Done (CRITICAL TEST)', () => {
    it('MUST FAIL IF GUARD (line 187-190) IS DELETED: rejects when overId is Done column', () => {
      // This test is the regression test for the guard at Board.tsx lines 187-190:
      // if (over.id === doneColumn?.id) {
      //   console.warn('Cannot drop onto Done column — it must remain at bottom')
      //   return
      // }
      //
      // Scenario: User drags In Progress and drops it onto Done.
      // Expected: shouldRejectDragEnd returns true (reject the drag)
      // If guard is removed: This test FAILS because the function returns false

      const doneColumn = columns.find(c => c.name === 'Done')!
      const inProgressColumn = columns.find(c => c.name === 'In Progress')!

      const result = shouldRejectDragEnd(inProgressColumn.id, doneColumn.id, columns)
      expect(result).toBe(true)
    })

    it('allows drop when overId is not Done', () => {
      const inProgressColumn = columns.find(c => c.name === 'In Progress')!
      const todoColumn = columns.find(c => c.name === 'Todo')!

      const result = shouldRejectDragEnd(todoColumn.id, inProgressColumn.id, columns)
      expect(result).toBe(false)
    })

    it('handles null/undefined over gracefully', () => {
      const inProgressColumn = columns.find(c => c.name === 'In Progress')!

      const result1 = shouldRejectDragEnd(inProgressColumn.id, null, columns)
      expect(result1).toBe(false)

      const result2 = shouldRejectDragEnd(inProgressColumn.id, undefined, columns)
      expect(result2).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('works with string IDs', () => {
      const stringColumns: Column[] = [
        { id: 'col-1', name: 'Todo', position: 0 } as any,
        { id: 'col-2', name: 'In Progress', position: 1 } as any,
        { id: 'col-3', name: 'Done', position: 2 } as any,
      ]

      const result = shouldRejectDragEnd('col-2', 'col-3', stringColumns)
      expect(result).toBe(true)
    })

    it('handles missing Done column gracefully', () => {
      const nosDoneColumns = [
        { id: 1, name: 'Todo', position: 0 },
        { id: 2, name: 'In Progress', position: 1 },
      ]

      const result = shouldRejectDragEnd(1, 2, nosDoneColumns)
      expect(result).toBe(false)
    })
  })
})

describe('dndGuards.resolveDroppableColumnId', () => {
  // SortableColumn.tsx registers the SAME <section> node under two dnd-kit
  // ids at once: useSortable({ id: column.id }) for column reordering, and
  // useDroppable({ id: `column-${column.id}` }) for task drops. Collision
  // detection can resolve `over.id` to either form depending on which
  // registration it picks, so any code branching on `over.id` needs to
  // normalize both shapes to the same underlying column id.
  it('extracts the numeric id from a "column-<id>" droppable id', () => {
    expect(resolveDroppableColumnId('column-5')).toBe(5)
  })

  it('returns a bare numeric column id unchanged', () => {
    expect(resolveDroppableColumnId(5)).toBe(5)
  })

  it('parses a bare numeric-string column id', () => {
    expect(resolveDroppableColumnId('5')).toBe(5)
  })

  it('returns null for an id that resolves to neither form, and no data is available', () => {
    expect(resolveDroppableColumnId('task-5')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(resolveDroppableColumnId(null)).toBeNull()
    expect(resolveDroppableColumnId(undefined)).toBeNull()
  })

  // SortableTaskCard.tsx's useSortable({ id: `task-${task.id}` }) ALSO
  // registers that card as a droppable against the shared DndContext (any
  // useSortable call does). Board.tsx's closestCenter collision detection
  // has no data.type filter, so dropping on a column that already has
  // cards commonly resolves `over` to a task card, not the column section
  // — over.id comes back as `task-<id>`, a third shape resolveDroppableColumnId
  // must handle via the `data.current` dnd-kit attaches to the droppable,
  // since the id string alone carries no column information.
  describe('resolving via over.data.current (the task-<id> shape)', () => {
    it('resolves a task-card over.id to that task\'s own column_id via data.current', () => {
      const overData = { type: 'Task', task: { id: 7, column_id: 2 } }
      expect(resolveDroppableColumnId('task-7', overData)).toBe(2)
    })

    it('resolves a column over.id to the column\'s id via data.current', () => {
      const overData = { type: 'Column', column: { id: 9 } }
      expect(resolveDroppableColumnId('column-9', overData)).toBe(9)
    })

    it('data.current takes precedence over id-string parsing when both are present', () => {
      // Defensive: if id parsing and data ever disagree, trust the data
      // dnd-kit attached to the droppable over string-sniffing the id.
      const overData = { type: 'Task', task: { id: 7, column_id: 3 } }
      expect(resolveDroppableColumnId('column-9', overData)).toBe(3)
    })

    it('falls back to id-string parsing when data.current has no recognized type', () => {
      expect(resolveDroppableColumnId('column-5', { type: 'Something' })).toBe(5)
      expect(resolveDroppableColumnId(5, undefined)).toBe(5)
    })

    it('still returns null for a task-<id> over.id when data.current is missing entirely', () => {
      expect(resolveDroppableColumnId('task-7', null)).toBeNull()
      expect(resolveDroppableColumnId('task-7', undefined)).toBeNull()
    })
  })
})
