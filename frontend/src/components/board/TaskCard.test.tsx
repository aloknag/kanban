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

  describe('Metadata line', () => {
    it('renders task ID', () => {
      renderWithRouter(<TaskCard task={mockTask} />)
      expect(screen.getByText('TASK-001')).toBeInTheDocument()
    })

    it('renders epic reference with proper slug format', () => {
      renderWithRouter(<TaskCard task={mockTask} />)
      const link = screen.getByRole('link', { name: 'EPIC-002' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/epics/2')
    })

    it('does not render epic link if null', () => {
      const taskWithoutEpic = { ...mockTask, epic_id: null }
      renderWithRouter(<TaskCard task={taskWithoutEpic} />)
      expect(screen.queryByRole('link', { name: /EPIC/ })).not.toBeInTheDocument()
    })

    it('renders assignee', () => {
      renderWithRouter(<TaskCard task={mockTask} />)
      expect(screen.getByText('agent-1')).toBeInTheDocument()
    })

    it('renders timestamp', () => {
      renderWithRouter(<TaskCard task={mockTask} />)
      const time = screen.getByTitle('2026-05-01T12:00:00Z')
      expect(time).toBeInTheDocument()
    })
  })

  describe('Title and excerpt', () => {
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

    it('renders without excerpt when not provided', () => {
      const taskWithoutExcerpt = { ...mockTask, excerpt: undefined }
      const { container } = renderWithRouter(
        <TaskCard task={taskWithoutExcerpt} />
      )
      expect(container.querySelector('p.line-clamp-3')).not.toBeInTheDocument()
    })
  })

  describe('Styling and attributes', () => {
    it('applies correct base classes for card styling', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('bg-card')
      expect(article).toHaveClass('border-hair')
      expect(article).toHaveClass('border-ink3')
      expect(article).toHaveClass('p-card')
    })

    it('applies transition classes for hover effect', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} />)
      const article = container.querySelector('article')
      expect(article).toHaveClass('transition-colors')
      expect(article).toHaveClass('duration-fast')
      expect(article).toHaveClass('hover:border-ink')
    })

    it('does not contain forbidden classes', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} />)
      const article = container.querySelector('article')
      const className = article?.className || ''
      // Check for forbidden patterns
      expect(className).not.toMatch(/shadow-/)
      expect(className).not.toMatch(/rounded-[xlmd]/)
      expect(className).not.toMatch(/transform/)
      expect(className).not.toMatch(/scale-/)
      expect(className).not.toMatch(/backdrop-blur/)
    })
  })

  describe('New indicator', () => {
    it('shows data-new attribute when isNew is true', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} isNew={true} />)
      const article = container.querySelector('article')
      expect(article).toHaveAttribute('data-new')
    })

    it('does not show data-new attribute when isNew is false', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} isNew={false} />)
      const article = container.querySelector('article')
      expect(article).not.toHaveAttribute('data-new')
    })

    it('has proper aria labels', () => {
      renderWithRouter(<TaskCard task={mockTask} />)
      const article = screen.getByRole('article', { hidden: true })
      expect(article).toHaveAttribute('aria-labelledby', 'task-1-title')
    })
  })
})
