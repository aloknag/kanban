/**
 * Gutter — Left sidebar catalog navigation
 * 
 * Per FrontEngDesign.md §3.2:
 * - 96px fixed width column on the left
 * - Shows "CATALOG" heading in label (mono uppercase)
 * - Specimen IDs hang here in a separate component
 */

export function Gutter() {
  return (
    <div
      className="w-margin flex-shrink-0 border-r border-hair border-ink3 bg-paper py-page px-card"
      role="complementary"
      aria-label="Catalog sidebar"
      data-gutter-rule
    >
      <div className="text-label font-mono text-ink2 tracking-widest">
        CATALOG
      </div>
    </div>
  )
}
