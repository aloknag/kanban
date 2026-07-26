import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { EpicDetail } from './EpicDetail'
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

describe('EpicDetail route with the numeric id 0', () => {
  const mockEpic = {
    id: 0,
    slug: 'EPIC-000',
    title: 'Zeroth epic',
    assignee: 'claude-code',
    column_id: 1,
    task_count: 0,
    done_count: 0,
    created_at: '2026-04-30T10:00:00Z',
    updated_at: '2026-05-01T14:18:07Z',
    content: 'Zeroth epic content',
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

  it('fetches and renders epic id 0 instead of showing a blank shell', async () => {
    vi.mocked(api.getEpic).mockResolvedValue(mockEpic)

    renderWithProviders()

    await waitFor(() => {
      expect(api.getEpic).toHaveBeenCalledWith(0)
    })

    await waitFor(() => {
      expect(screen.getByText('Zeroth epic')).toBeInTheDocument()
    })
  })
})
