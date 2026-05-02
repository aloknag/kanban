import { describe, it, expect } from 'vitest'
import { shouldRejectDragEnd } from './dndGuards'
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
