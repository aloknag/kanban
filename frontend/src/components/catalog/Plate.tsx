/**
 * Plate — Main layout wrapper with catalog gutter
 * 
 * Per FrontEngDesign.md §3:
 * - "A sheet of --c-paper with a 96-px left margin (the catalog gutter)"
 * - Left: 96px gutter with specimen IDs
 * - Right: content area (max-width 1280px for prose)
 */

import { ReactNode } from 'react'
import { Gutter } from './Gutter'

type Props = {
  children: ReactNode
  filterText?: string
  onFilterChange?: (text: string) => void
}

export function Plate({ children, filterText, onFilterChange }: Props) {
  return (
    <div className="flex min-h-screen bg-paper">
      {/* Left: Catalog gutter */}
      <Gutter filterText={filterText} onFilterChange={onFilterChange} />

      {/* Right: Main content area */}
      <main className="flex-1 max-w-plate mx-auto px-page py-page">
        {children}
      </main>
    </div>
  )
}
