import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { TaskDetail } from './TaskDetail'
import { createQueryClient } from '../lib/queryClient'
import { ThemeProvider } from '../system/ThemeProvider'
import * as api from '../lib/api'

// Mock useParams to return a valid task ID
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useParams: () => ({ id: '14' }),
  }
})

// Mock the api module
vi.mock('../lib/api', () => ({
  getTask: vi.fn(),
  getEpic: vi.fn(),
}))

// Mock components
vi.mock('../components/catalog/Plate', () => ({
  Plate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/chrome/TopRule', () => ({
  TopRule: () => <div data-testid="top-rule" />,
}))

vi.mock('../components/detail/Journal', () => ({
  Journal: () => <div data-testid="journal" />,
}))

describe('TaskDetail route error handling and loading state', () => {
  const mockTask = {
    id: 14,
    slug: 'TASK-014',
    title: 'Test task',
    assignee: 'claude-code',
    column_id: 1,
    epic_id: 2,
    created_at: '2026-05-01T14:10:32Z',
    updated_at: '2026-05-01T14:18:07Z',
    content: 'Task content',
  }

  const mockEpic = {
    id: 2,
    slug: 'EPIC-002',
    title: 'Test epic',
    assignee: 'claude-code',
    column_id: 1,
    task_count: 8,
    done_count: 3,
    created_at: '2026-04-30T10:00:00Z',
    updated_at: '2026-05-01T14:18:07Z',
    content: 'Epic content',
  }

  const renderWithProviders = () => {
    const queryClient = createQueryClient()
    return render(
      <ThemeProvider>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <TaskDetail />
          </QueryClientProvider>
        </BrowserRouter>
      </ThemeProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('404 error handling', () => {
    it('detects 404 errors and shows "not found" state', async () => {
      vi.mocked(api.getTask).mockRejectedValue(
        new Error('API error: 404 Not Found')
      )

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('not found')).toBeInTheDocument()
      })
    })
  })

  describe('Non-404 error handling', () => {
    it('shows error alert container for non-404 errors', async () => {
      vi.mocked(api.getTask).mockRejectedValue(
        new Error('API error: 500 Internal Server Error')
      )

      renderWithProviders()

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })

    it('displays error message text in alert', async () => {
      vi.mocked(api.getTask).mockRejectedValue(
        new Error('API error: 500 Internal Server Error')
      )

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText(/Error loading task/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading state with 80ms debounce', () => {
    it('does not show loading for requests completing within 80ms', async () => {
      vi.mocked(api.getTask).mockResolvedValue(mockTask)
      vi.mocked(api.getEpic).mockResolvedValue(mockEpic)

      renderWithProviders()

      // Verify loading doesn't flash for fast responses
      await new Promise(resolve => setTimeout(resolve, 40))
      expect(screen.queryByText('loading…')).not.toBeInTheDocument()

      // Verify data loads
      await waitFor(() => {
        expect(screen.getByText('Test task')).toBeInTheDocument()
      })
    })

    it('shows loading state for requests slower than 80ms', async () => {
      vi.mocked(api.getTask).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockTask), 120))
      )
      vi.mocked(api.getEpic).mockResolvedValue(mockEpic)

      renderWithProviders()

      // Should show loading after 80ms
      await waitFor(
        () => {
          expect(screen.getByText('loading…')).toBeInTheDocument()
        },
        { timeout: 200 }
      )
    })
  })

  describe('DetailHeader semantic HTML', () => {
    it('renders file_missing warning with role="alert"', async () => {
      const taskWithError = { ...mockTask, content_error: 'file_missing' }
      vi.mocked(api.getTask).mockResolvedValue(taskWithError)

      renderWithProviders()

      await waitFor(() => {
        const alertDiv = screen.getByRole('alert')
        expect(alertDiv).toBeInTheDocument()
        expect(alertDiv).toHaveTextContent('source file missing on disk')
      })
    })
  })

  describe('parent epic id 0 edge case', () => {
    it('fetches the parent epic when epic_id is 0 (falsy but valid)', async () => {
      const taskWithZeroEpic = { ...mockTask, epic_id: 0 }
      const zeroEpic = { ...mockEpic, id: 0 }
      vi.mocked(api.getTask).mockResolvedValue(taskWithZeroEpic)
      vi.mocked(api.getEpic).mockResolvedValue(zeroEpic)

      renderWithProviders()

      await waitFor(() => {
        expect(api.getEpic).toHaveBeenCalledWith(0)
      })
    })
  })
})
