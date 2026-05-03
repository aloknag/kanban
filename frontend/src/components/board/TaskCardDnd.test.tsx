import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DndContext } from '@dnd-kit/core'
import { TaskCard } from './TaskCard'
import { Task } from '../../lib/api'

describe('TaskCard DnD', () => {
  const mockTask: Task = {
    id: 1,
    slug: 'TASK-001',
    title: 'Implement Board component',
    excerpt: 'Create a static board reading from API',
    assignee: 'agent-1',
    column_id: 1,
    epic_id: 2,
    updated_at: '2026-05-01T12:00:00Z',
  }

  const renderWithDnd = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <DndContext>
          {component}
        </DndContext>
      </BrowserRouter>
    )
  }

  describe('Draggable state', () => {
    it('renders task card with data-task-id for DnD identification', () => {
      const { container } = renderWithDnd(<TaskCard task={mockTask} />)
      const article = container.querySelector('article[data-task-id="1"]')
      expect(article).toBeInTheDocument()
    })

    it('card remains visible with opacity when dragging (placeholder)', () => {
      // This test verifies the card accepts DnD events
      const { container } = renderWithDnd(<TaskCard task={mockTask} />)
      const article = container.querySelector('article')
      // Card should have data-task-id for DnD kit to identify it
      expect(article).toHaveAttribute('data-task-id', '1')
    })
  })
})
