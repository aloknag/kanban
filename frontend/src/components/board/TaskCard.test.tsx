import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { TaskCard } from './TaskCard'
import { Task } from '../../lib/api'

describe('TaskCard', () => {
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

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>)
  }

  it('renders task ID', () => {
    renderWithRouter(<TaskCard task={mockTask} />)
    expect(screen.getByText('TASK-001')).toBeInTheDocument()
  })

  it('renders task title as link', () => {
    renderWithRouter(<TaskCard task={mockTask} />)
    const link = screen.getByRole('link', {
      name: 'Implement Board component',
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/tasks/1')
  })

  it('renders task excerpt', () => {
    renderWithRouter(<TaskCard task={mockTask} />)
    expect(screen.getByText('Create a static board reading from API')).toBeInTheDocument()
  })

  it('renders assignee', () => {
    renderWithRouter(<TaskCard task={mockTask} />)
    expect(screen.getByText('agent-1')).toBeInTheDocument()
  })

  it('renders epic reference', () => {
    renderWithRouter(<TaskCard task={mockTask} />)
    expect(screen.getByText('EPIC-2')).toBeInTheDocument()
  })

  it('does not render epic if null', () => {
    const taskWithoutEpic = { ...mockTask, epic_id: null }
    renderWithRouter(<TaskCard task={taskWithoutEpic} />)
    expect(screen.queryByText(/EPIC/)).not.toBeInTheDocument()
  })

  it('renders timestamp', () => {
    renderWithRouter(<TaskCard task={mockTask} />)
    const time = screen.getByTitle('2026-05-01T12:00:00Z')
    expect(time).toBeInTheDocument()
  })

  it('shows isNew indicator via data attribute', () => {
    const { container } = renderWithRouter(<TaskCard task={mockTask} isNew={true} />)
    const article = container.querySelector('article')
    expect(article).toHaveAttribute('data-new')
  })

  it('renders without excerpt when not provided', () => {
    const taskWithoutExcerpt = { ...mockTask, excerpt: undefined }
    const { container } = renderWithRouter(
      <TaskCard task={taskWithoutExcerpt} />
    )
    expect(container.querySelector('p.line-clamp-3')).not.toBeInTheDocument()
  })
})
