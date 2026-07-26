import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { EpicDetail } from './EpicDetail'
import { createQueryClient } from '../lib/queryClient'
import { ThemeProvider } from '../system/ThemeProvider'

// Mock useParams to return a non-numeric epic ID (bug #54)
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useParams: () => ({ id: 'abc' }),
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

describe('EpicDetail route with a non-numeric id', () => {
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

  it('shows "not found" state instead of a blank shell', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('not found')).toBeInTheDocument()
    })
  })
})
