/**
 * Guards for column reordering via drag-and-drop
 *
 * Per FrontEngDesign.md §6.3:
 * - Done column must never move from bottom position
 * - Non-Done columns cannot be dropped onto Done
 */

import { Column } from './api'

/**
 * shouldRejectDragEnd — Checks if a drag-end event should be rejected
 *
 * Returns true if the drag-end should be prevented (guard active).
 * Returns false if the drag-end should proceed.
 *
 * Guards:
 * 1. Active is Done → reject (prevent Done from being dragged away)
 * 2. Over is Done → reject (prevent dropping onto Done)
 */
export function shouldRejectDragEnd(
  activeId: string | number,
  overId: string | number | null | undefined,
  columns: Column[]
): boolean {
  const doneColumn = columns.find(c => c.name === 'Done')

  // Guard 1: Prevent Done column from being dragged away from bottom
  if (activeId === doneColumn?.id) {
    return true
  }

  // Guard 2: Prevent dropping non-Done columns onto Done position
  if (overId === doneColumn?.id) {
    return true
  }

  return false
}
