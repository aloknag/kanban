/**
 * Column — Kanban column component
 * 
 * Per FrontEngDesign.md §5:
 * - Renders a single Kanban column with tasks
 * - Supports drag-and-drop (future)
 */

export interface ColumnProps {
  id: string
  title: string
  tasks?: Array<{
    id: string
    title: string
  }>
}

export function Column({ title, tasks = [] }: Omit<ColumnProps, 'id'>) {
  return (
    <div data-testid="column" className="flex flex-col gap-2 p-4 bg-surface rounded-lg">
      <div data-testid="column-header" className="font-semibold text-sm text-ink mb-2">
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              data-testid="task-card"
              className="p-3 bg-paper rounded border border-ink/10 hover:border-ink/20 cursor-pointer transition-colors"
            >
              <p className="text-sm text-ink">{task.title}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-ink/50 py-4 text-center">No tasks</p>
        )}
      </div>
    </div>
  )
}
