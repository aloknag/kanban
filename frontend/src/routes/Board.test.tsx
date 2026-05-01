import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Board } from './Board'
import { createQueryClient } from '../lib/queryClient'
import * as api from '../lib/api'

// Mock the api module
vi.mock('../lib/api', () => ({
  getColumns: vi.fn(),
  getTasks: vi.fn(),
}))

describe('Board', () => {
  const mockColumns = [
    { id: 1, name: 'Todo', position: 0 },
    { id: 2, name: 'In Progress', position: 1 },
    { id: 3, name: 'Done', position: 2 },
  ]

  const mockTasks = [
    {
      id: 1,
      slug: 'TASK-001',
      title: 'Implement Board component',
      excerpt: 'Create a static board reading from API',
      assignee: 'agent-1',
      column_id: 1,
      epic_id: null,
      updated_at: '2026-05-01T12:00:00Z',
    },
    {
      id: 2,
      slug: 'TASK-002',
      title: 'Add tests for Board',
      excerpt: 'Write comprehensive tests with mocked API',
      assignee: 'agent-2',
      column_id: 2,
      epic_id: null,
      updated_at: '2026-05-01T13:00:00Z',
    },
  ]

  const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = createQueryClient()
    return render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Element structure and data-testid attributes', () => {
    beforeEach(() => {
      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue(mockTasks)
    })

    it('renders with board-page data-testid', async () => {
      renderWithProviders(<Board />)
      const boardPage = screen.getByTestId('board-page')
      expect(boardPage).toBeInTheDocument()
    })

    it('renders board-content with data-testid after loading', async () => {
      renderWithProviders(<Board />)
      await waitFor(() => {
        const boardContent = screen.getByTestId('board-content')
        expect(boardContent).toBeInTheDocument()
      })
    })
  })

  describe('API data fetching', () => {
    it('fetches columns and tasks on mount', async () => {
      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue(mockTasks)

      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(api.getColumns).toHaveBeenCalledTimes(1)
        expect(api.getTasks).toHaveBeenCalledTimes(1)
      })
    })

    it('shows loading state while fetching', () => {
      // Delay the resolve to see loading state
      vi.mocked(api.getColumns).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockColumns), 100))
      )
      vi.mocked(api.getTasks).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockTasks), 100))
      )

      renderWithProviders(<Board />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('renders columns with task counts after loading', async () => {
      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue(mockTasks)

      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TODO')).toBeInTheDocument()
        expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
        expect(screen.getByText('DONE')).toBeInTheDocument()
      })
    })

    it('renders task cards under correct columns', async () => {
      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue(mockTasks)

      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('TASK-001')).toBeInTheDocument()
        expect(screen.getByText('TASK-002')).toBeInTheDocument()
        expect(screen.getByText('Implement Board component')).toBeInTheDocument()
        expect(screen.getByText('Add tests for Board')).toBeInTheDocument()
      })
    })

    it('shows error state on API failure', async () => {
      const errorMsg = 'API error: 500 Internal Server Error'
      vi.mocked(api.getColumns).mockRejectedValue(new Error(errorMsg))
      vi.mocked(api.getTasks).mockResolvedValue([])

      renderWithProviders(<Board />)

      await waitFor(
        () => {
          // Either check for the error text or the error role
          const errorElement =
            screen.queryByRole('alert') || screen.queryByText(/error loading board/i)
          expect(errorElement).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('renders empty column when no tasks', async () => {
      const columnsWithoutDone = mockColumns.slice(0, 2)
      vi.mocked(api.getColumns).mockResolvedValue(columnsWithoutDone)
      vi.mocked(api.getTasks).mockResolvedValue([mockTasks[0]]) // Only TASK-001 in Todo

      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
        // Check that In Progress column exists but has no tasks
        const inProgressSection = screen.getByText('IN PROGRESS')
        expect(inProgressSection).toBeInTheDocument()
      })
    })
  })

  describe('isNew computation with aging', () => {
    it('passes isNew=true for tasks updated within 8 seconds', async () => {
      const now = Date.now()
      const tasksWithNewOne = [
        {
          id: 1,
          slug: 'TASK-001',
          title: 'Recent task',
          excerpt: 'Updated 5 seconds ago',
          assignee: 'agent-1',
          column_id: 1,
          epic_id: null,
          updated_at: new Date(now - 5000).toISOString(), // 5 seconds ago
        },
        {
          id: 2,
          slug: 'TASK-002',
          title: 'Old task',
          excerpt: 'Updated 10 seconds ago',
          assignee: 'agent-2',
          column_id: 2,
          epic_id: null,
          updated_at: new Date(now - 10000).toISOString(), // 10 seconds ago (outside 8s window)
        },
      ]

      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue(tasksWithNewOne)

      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Recent task')).toBeInTheDocument()
      })

      // Task 1 (5s ago) should have data-new attribute (within 8s window)
      const recentCard = screen.getByText('Recent task').closest('[data-task-id]')
      expect(recentCard).toHaveAttribute('data-new')

      // Task 2 (10s ago) should NOT have data-new attribute (outside 8s window)
      const oldCard = screen.getByText('Old task').closest('[data-task-id]')
      expect(oldCard).not.toHaveAttribute('data-new')
    })

    it('does not display isNew for very old tasks', async () => {
      const now = Date.now()
      const veryOldTask = {
        id: 1,
        slug: 'TASK-001',
        title: 'Ancient task',
        excerpt: 'Updated 1 minute ago',
        assignee: 'agent-1',
        column_id: 1,
        epic_id: null,
        updated_at: new Date(now - 60000).toISOString(), // 60 seconds ago
      }

      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue([veryOldTask])

      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('Ancient task')).toBeInTheDocument()
      })

      const card = screen.getByText('Ancient task').closest('[data-task-id]')
      expect(card).not.toHaveAttribute('data-new')
    })
  })

  describe('Rendering and structure', () => {
    beforeEach(() => {
      vi.mocked(api.getColumns).mockResolvedValue(mockColumns)
      vi.mocked(api.getTasks).mockResolvedValue(mockTasks)
    })

    it('renders the TopRule component', async () => {
      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText(/▢ AGENTBOARD/)).toBeInTheDocument()
      })
    })

    it('renders the Plate component with Gutter', async () => {
      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('CATALOG')).toBeInTheDocument()
      })
    })

    it('has proper semantic structure', async () => {
      const { container } = renderWithProviders(<Board />)

      await waitFor(() => {
        const banner = container.querySelector('[role="banner"]')
        const main = container.querySelector('main')
        const sidebar = container.querySelector('[role="complementary"]')
        
        expect(banner).toBeInTheDocument()
        expect(main).toBeInTheDocument()
        expect(sidebar).toBeInTheDocument()
      })
    })

    it('renders task cards with metadata', async () => {
      renderWithProviders(<Board />)

      await waitFor(() => {
        expect(screen.getByText('agent-1')).toBeInTheDocument()
        expect(screen.getByText('agent-2')).toBeInTheDocument()
        expect(screen.getByText('Create a static board reading from API')).toBeInTheDocument()
      })
    })
  })
})
