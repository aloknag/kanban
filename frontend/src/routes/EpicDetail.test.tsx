import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { EpicDetail } from './EpicDetail'
import { createQueryClient } from '../lib/queryClient'
import { ThemeProvider } from '../system/ThemeProvider'
import * as api from '../lib/api'

// Mock useParams to return a valid epic ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '2' }),
  }
})

// Mock the api module
vi.mock('../lib/api', () => ({
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

describe('EpicDetail route error handling and loading state', () => {
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
            <EpicDetail />
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
      vi.mocked(api.getEpic).mockRejectedValue(
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
      vi.mocked(api.getEpic).mockRejectedValue(
        new Error('API error: 500 Internal Server Error')
      )

      renderWithProviders()

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })

    it('displays error message text in alert', async () => {
      vi.mocked(api.getEpic).mockRejectedValue(
        new Error('API error: 500 Internal Server Error')
      )

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText(/Error loading epic/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading state with 80ms debounce', () => {
    it('does not show loading for requests completing within 80ms', async () => {
      vi.mocked(api.getEpic).mockResolvedValue(mockEpic)

      renderWithProviders()

      // Verify loading doesn't flash for fast responses
      await new Promise(resolve => setTimeout(resolve, 40))
      expect(screen.queryByText('loading…')).not.toBeInTheDocument()

      // Verify data loads
      await waitFor(() => {
        expect(screen.getByText('Test epic')).toBeInTheDocument()
      })
    })

    it('shows loading state for requests slower than 80ms', async () => {
      vi.mocked(api.getEpic).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEpic), 120))
      )

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
})
