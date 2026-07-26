import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { TaskDetail } from './TaskDetail'
import { createQueryClient } from '../lib/queryClient'
import { ThemeProvider } from '../system/ThemeProvider'
import * as api from '../lib/api'

// Mock useParams to return the numeric id "0" (bug: !!0 === false, same
// symptom class as #54's non-numeric-id blank shell)
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useParams: () => ({ id: '0' }),
  }
})

vi.mock('../lib/api', () => ({
  getTask: vi.fn(),
  getEpic: vi.fn(),
}))

vi.mock('../components/catalog/Plate', () => ({
  Plate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/chrome/TopRule', () => ({
  TopRule: () => <div data-testid="top-rule" />,
}))

vi.mock('../components/detail/Journal', () => ({
  Journal: () => <div data-testid="journal" />,
}))

describe('TaskDetail route with the numeric id 0', () => {
  const mockTask = {
    id: 0,
    slug: 'TASK-000',
    title: 'Zeroth task',
    assignee: 'claude-code',
    column_id: 1,
    epic_id: null,
    created_at: '2026-05-01T14:10:32Z',
    updated_at: '2026-05-01T14:18:07Z',
    content: 'Zeroth task content',
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

  it('fetches and renders task id 0 instead of showing a blank shell', async () => {
    vi.mocked(api.getTask).mockResolvedValue(mockTask)

    renderWithProviders()

    await waitFor(() => {
      expect(api.getTask).toHaveBeenCalledWith(0)
    })

    await waitFor(() => {
      expect(screen.getByText('Zeroth task')).toBeInTheDocument()
    })
  })
})
