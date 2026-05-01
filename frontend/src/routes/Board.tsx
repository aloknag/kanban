/**
 * Board — Main board route (/board)
 * 
 * Per TDD.md §4 and FrontEngDesign.md §4:
 * - Renders tasks in Kanban columns
 * - Uses the Plate layout with TopRule chrome
 */

import { TopRule } from '../components/chrome/TopRule'
import { Plate } from '../components/catalog/Plate'

export function Board() {
  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="board-page">
      <TopRule />
      <Plate>
        <div className="text-body text-ink">
          <h1 className="text-h1 font-display mb-page">Board</h1>
          <p>Task board rendering pending implementation.</p>
        </div>
      </Plate>
    </div>
  )
}
