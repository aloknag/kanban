/**
 * Board — Main board route (/board)
 * 
 * Per TDD.md §4 and FrontEngDesign.md §4:
 * - Renders tasks in Kanban columns
 * - Uses the Plate layout with TopRule chrome
 */

import { TopRule } from '../components/chrome/TopRule'
import { Plate } from '../components/catalog/Plate'
import { Column } from '../components/kanban/Column'

const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do', tasks: [] },
  { id: 'inprogress', title: 'In Progress', tasks: [] },
  { id: 'done', title: 'Done', tasks: [] },
]

export function Board() {
  return (
    <div className="flex flex-col min-h-screen bg-paper" data-testid="board-page">
      <TopRule />
      <Plate>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-h1 font-display mb-page">Board</h1>
          </div>
          <div className="grid grid-cols-3 gap-4 auto-rows-max">
            {DEFAULT_COLUMNS.map((column) => (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={column.tasks}
              />
            ))}
          </div>
        </div>
      </Plate>
    </div>
  )
}
