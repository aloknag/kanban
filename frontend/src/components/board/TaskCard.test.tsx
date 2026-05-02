import { describe, it, expect, vi } from 'vitest'
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
      // Per FrontEngDesign.md §2.4: shadow handled via inline styles, not classes
      expect(className).not.toMatch(/rounded-[xlmd]/)
      expect(className).not.toMatch(/transform/)
      expect(className).not.toMatch(/scale-/)
      expect(className).not.toMatch(/backdrop-blur/)
    })
  })

  describe('isFocused prop and focus ring', () => {
    it('applies focus ring shadow when isFocused is true', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} isFocused={true} />)
      const article = container.querySelector('article')
      expect(article?.style.boxShadow).toBe('0 0 0 2px var(--c-signal)')
    })

    it('does not apply focus ring shadow when isFocused is false', () => {
      const { container } = renderWithRouter(<TaskCard task={mockTask} isFocused={false} />)
      const article = container.querySelector('article')
      expect(article?.style.boxShadow).not.toContain('2px')
    })

    it('combines focus ring and new indicator shadows when both true', () => {
      const { container } = renderWithRouter(
        <TaskCard task={mockTask} isFocused={true} isNew={true} />
      )
      const article = container.querySelector('article')
      // Should have both inset shadow (new) and focus ring shadow (focused)
      expect(article?.style.boxShadow).toContain('inset 1px 0 0')
      expect(article?.style.boxShadow).toContain('0 0 0 2px')
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

  describe('Fade animation for new indicator', () => {
    it('applies data-new attribute when isNew is true', () => {
      const { container } = renderWithRouter(
        <TaskCard task={mockTask} isNew={true} />
      )
      const article = container.querySelector('article')
      expect(article).toHaveAttribute('data-new')
    })

    it('clears timeout on unmount or when isNew becomes false', () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { rerender } = renderWithRouter(
        <TaskCard task={mockTask} isNew={true} />
      )

      // Should have created a timeout
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 8000)

      // When isNew becomes false, the timeout should be cleared
      rerender(
        <BrowserRouter>
          <TaskCard task={mockTask} isNew={false} />
        </BrowserRouter>
      )

      // Cleanup (unmount) should clear the timeout
      expect(clearTimeoutSpy).toHaveBeenCalled()

      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
    })

    it('applies inset shadow via inline style for fade effect', () => {
      const { container } = renderWithRouter(
        <TaskCard task={mockTask} isNew={true} />
      )
      const article = container.querySelector('article')

      // Should have shadow via inline style
      expect(article?.style.boxShadow).toBe('inset 1px 0 0 var(--c-signal)')
      expect(article?.style.transition).toBe('box-shadow 8000ms')
    })

    it('has correct data-new attribute and shadow styling', () => {
      const { container } = renderWithRouter(
        <TaskCard task={mockTask} isNew={true} />
      )
      const article = container.querySelector('article[data-new]')
      expect(article).toBeInTheDocument()

      // Verify the shadow and transition via inline styles
      expect(article?.style.boxShadow).toBe('inset 1px 0 0 var(--c-signal)')
      expect(article?.style.transition).toBe('box-shadow 8000ms')
    })

    it('does not apply data-new when isNew is false', () => {
      const { container } = renderWithRouter(
        <TaskCard task={mockTask} isNew={false} />
      )
      const article = container.querySelector('article')
      expect(article).not.toHaveAttribute('data-new')
    })
  })
})
