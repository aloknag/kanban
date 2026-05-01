import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Column } from './Column'
import { Column as ColumnType, Task } from '../../lib/api'

describe('Column', () => {
  const mockColumn: ColumnType = {
    id: 1,
    name: 'Todo',
    position: 0,
  }

  const mockTasks: Task[] = [
    {
      id: 1,
      slug: 'TASK-001',
      title: 'Task 1',
      excerpt: 'Description 1',
      assignee: 'agent-1',
      column_id: 1,
      epic_id: null,
      updated_at: '2026-05-01T12:00:00Z',
    },
    {
      id: 2,
      slug: 'TASK-002',
      title: 'Task 2',
      excerpt: 'Description 2',
      assignee: 'agent-2',
      column_id: 1,
      epic_id: null,
      updated_at: '2026-05-01T13:00:00Z',
    },
  ]

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('renders column header', () => {
    renderWithRouter(<Column column={mockColumn} tasks={[]} />)
    expect(screen.getByText('TODO')).toBeInTheDocument()
  })

  it('displays task count in header', () => {
    renderWithRouter(<Column column={mockColumn} tasks={mockTasks} />)
    expect(screen.getByText('2 specimens')).toBeInTheDocument()
  })

  it('displays singular "specimen" for single task', () => {
    renderWithRouter(<Column column={mockColumn} tasks={[mockTasks[0]]} />)
    expect(screen.getByText('1 specimen')).toBeInTheDocument()
  })

  it('renders all task cards', () => {
    renderWithRouter(<Column column={mockColumn} tasks={mockTasks} />)
    expect(screen.getByText('TASK-001')).toBeInTheDocument()
    expect(screen.getByText('TASK-002')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    renderWithRouter(<Column column={mockColumn} tasks={[]} />)
    expect(screen.getByText('◇ no specimens')).toBeInTheDocument()
    expect(
      screen.getByText('nothing has been filed in this column.')
    ).toBeInTheDocument()
  })

  it('marks recently updated tasks', () => {
    const recentlyUpdatedTaskIds = new Set([mockTasks[0].id])
    const { container } = renderWithRouter(
      <Column
        column={mockColumn}
        tasks={mockTasks}
        recentlyUpdatedTaskIds={recentlyUpdatedTaskIds}
      />
    )

    const articles = container.querySelectorAll('article')
    expect(articles[0]).toHaveAttribute('data-new')
    expect(articles[1]).not.toHaveAttribute('data-new')
  })

  it('renders separator rule at bottom', () => {
    const { container } = renderWithRouter(
      <Column column={mockColumn} tasks={mockTasks} />
    )
    const rule = container.querySelector('.border-b.border-ink3')
    expect(rule).toBeInTheDocument()
  })
})
