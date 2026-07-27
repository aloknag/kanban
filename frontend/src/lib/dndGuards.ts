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
/**
 * Normalize a dnd-kit `over.id` to the underlying column id.
 *
 * SortableColumn.tsx registers the same <section> node under two dnd-kit
 * ids simultaneously — useSortable({ id: column.id }) for reordering, and
 * useDroppable({ id: `column-${column.id}` }) for task drops — so
 * collision detection can hand back either form depending on which
 * registration it resolves to. Callers that branch on `over.id` must
 * normalize both shapes to the same id, or a drag can silently no-op.
 */
export function resolveDroppableColumnId(
  overId: string | number | null | undefined
): number | null {
  if (overId === null || overId === undefined) return null

  const str = String(overId)
  const numericPart = str.startsWith('column-') ? str.slice('column-'.length) : str
  const parsed = Number(numericPart)

  return Number.isFinite(parsed) && numericPart !== '' ? parsed : null
}

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
