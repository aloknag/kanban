/**
 * EmptyColumn — Empty state for a column with no tasks
 *
 * Per FrontEngDesign.md §4.3:
 * - Single-line empty state
 * - Glyph, message, and secondary message
 */

export function EmptyColumn() {
  return (
    <div className="text-center py-gutter">
      <p className="text-body text-ink3">
        ◇ no specimens
      </p>
      <p className="text-bodysm text-ink3">
        nothing has been filed in this column.
      </p>
    </div>
  )
}
