/**
 * Optimistic update logic for column reordering
 *
 * Per issue #28: when a user drags a column, we compute the new order,
 * update React Query cache optimistically, and call the API.
 * On failure, React Query refetches the true state.
 */

import { Column } from './api'

/**
 * Reorder columns based on a new ID sequence.
 * Used for optimistic updates before the API confirms.
 */
export function columnReorderReducer(
  oldColumns: Column[],
  newIds: number[]
): Column[] {
  // Map old columns by ID
  const columnMap = new Map(oldColumns.map(c => [c.id, c]))

  // Return new columns in the requested order, updating position fields
  return newIds
    .map((id, index) => {
      const col = columnMap.get(id)
      if (!col) return undefined
      // Update position field to reflect new order
      return { ...col, position: index }
    })
    .filter((col): col is Column => col !== undefined)
}
