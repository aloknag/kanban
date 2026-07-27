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
 * The `data.current` dnd-kit attaches to a droppable/sortable registration.
 * SortableColumn's useDroppable sets `{ type: 'Column', column }`;
 * SortableTaskCard's useSortable sets `{ type: 'Task', task }`.
 */
export type DroppableData =
  | { type: 'Column'; column: { id: number } }
  | { type: 'Task'; task: { column_id: number } }
  | Record<string, unknown>
  | null
  | undefined

/**
 * Normalize a dnd-kit `over` target to the underlying column id.
 *
 * A drop can resolve to any of three shapes, all reachable from the same
 * DndContext with no `data.type` filtering on its `closestCenter` collision
 * detection:
 *
 * 1. A column's own id (from that column's useSortable({ id: column.id }),
 *    used for column reordering).
 * 2. `column-${id}` (from the separate useDroppable registered on the same
 *    <section> node, used for task drops onto a column).
 * 3. `task-${id}` (from another task card's OWN useSortable registration —
 *    every useSortable call is also a droppable — which wins the collision
 *    whenever the drop point is nearer an existing card than the column's
 *    section/header rect, i.e. any column that already has cards in it).
 *
 * The id string alone carries no column information for shape 3, so it
 * must be resolved via the `data.current` dnd-kit attaches to the
 * registration instead of string-parsing `over.id`.
 */
export function resolveDroppableColumnId(
  overId: string | number | null | undefined,
  overData?: DroppableData
): number | null {
  if (overData && 'type' in overData) {
    if (overData.type === 'Column' && 'column' in overData) {
      return (overData as { column: { id: number } }).column.id
    }
    if (overData.type === 'Task' && 'task' in overData) {
      return (overData as { task: { column_id: number } }).task.column_id
    }
  }

  if (overId === null || overId === undefined) return null

  const str = String(overId)
  if (str.startsWith('task-')) return null // no data available to resolve to a column

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
