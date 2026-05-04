/**
 * Gutter — Left sidebar catalog navigation
 * 
 * Per FrontEngDesign.md §3.2:
 * - 96px fixed width column on the left
 * - Shows "CATALOG" heading in label (mono uppercase)
 * - Specimen IDs hang here in a separate component
 */

type Props = {
  filterText?: string
  onFilterChange?: (text: string) => void
}

export function Gutter({ filterText = '', onFilterChange }: Props) {
  return (
    <div
      className="w-margin flex-shrink-0 border-r border-hair border-ink3 bg-paper py-page px-card"
      role="complementary"
      aria-label="Catalog sidebar"
      data-gutter-rule
    >
      <div className="text-label font-mono text-ink2 tracking-widest mb-gutter">
        CATALOG
      </div>
      {onFilterChange && (
        <input
          type="text"
          placeholder="Filter tasks..."
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full bg-paper border border-hair border-ink3 p-tight text-bodysm text-ink font-mono focus:outline-none focus:ring-1 focus:ring-signal"
        />
      )}
    </div>
  )
}
