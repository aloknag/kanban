import { describe, it, expect } from 'vitest'
import { columnReorderReducer } from './columnReorder'
import { Column } from './api'

describe('columnReorderReducer', () => {
  const mockColumns: Column[] = [
    { id: 1, name: 'Backlog', position: 0 },
    { id: 2, name: 'In Progress', position: 1 },
    { id: 3, name: 'Done', position: 2 },
  ]

  it('reorders columns to match new ID sequence', () => {
    const newIds = [2, 1, 3]
    const result = columnReorderReducer(mockColumns, newIds)

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe(2)
    expect(result[1].id).toBe(1)
    expect(result[2].id).toBe(3)
  })

  it('updates position fields to reflect new order', () => {
    const newIds = [2, 1, 3]
    const result = columnReorderReducer(mockColumns, newIds)

    expect(result[0]).toEqual({ id: 2, name: 'In Progress', position: 0 })
    expect(result[1]).toEqual({ id: 1, name: 'Backlog', position: 1 })
    expect(result[2]).toEqual({ id: 3, name: 'Done', position: 2 })
  })

  it('returns empty array when newIds is empty', () => {
    const result = columnReorderReducer(mockColumns, [])
    expect(result).toEqual([])
  })

  it('filters out IDs that do not exist in columns', () => {
    const newIds = [1, 999, 3]
    const result = columnReorderReducer(mockColumns, newIds)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(3)
  })

  it('handles single column reorder', () => {
    const singleColumn: Column[] = [{ id: 5, name: 'Todo', position: 0 }]
    const result = columnReorderReducer(singleColumn, [5])

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(singleColumn[0])
  })
})
