import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TopRule } from './TopRule'

describe('TopRule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{component}</BrowserRouter>
      </QueryClientProvider>
    )
  }

  it('renders the wordmark', () => {
    renderWithRouter(<TopRule />)
    expect(screen.getByText(/▢ AGENTBOARD/)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    renderWithRouter(<TopRule />)
    expect(screen.getByText('Board')).toBeInTheDocument()
    expect(screen.getByText('Epics')).toBeInTheDocument()
  })

  it('renders the poll indicator glyph', () => {
    renderWithRouter(<TopRule />)
    const glyph = screen.getByLabelText('poll indicator')
    expect(glyph).toHaveTextContent('◇')
  })

  it('displays a clock (time)', () => {
    renderWithRouter(<TopRule />)
    const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/)
    expect(timeElements.length).toBeGreaterThan(0)
  })

  it('has proper semantic markup', () => {
    const { container } = renderWithRouter(<TopRule />)
    const banner = container.querySelector('[role="banner"]')
    expect(banner).toBeInTheDocument()
  })

  it('applies correct height class h-page (48px)', () => {
    const { container } = renderWithRouter(<TopRule />)
    const banner = container.querySelector('[role="banner"]')
    expect(banner).toHaveClass('h-page')
    expect(banner).not.toHaveClass('h-margin')
  })

  it('renders theme toggle button stub (◑)', () => {
    renderWithRouter(<TopRule />)
    const themeToggle = screen.getByLabelText('theme toggle')
    expect(themeToggle).toHaveTextContent('◑')
  })

  it('renders close button stub (✕)', () => {
    renderWithRouter(<TopRule />)
    const closeButton = screen.getByLabelText('close')
    expect(closeButton).toHaveTextContent('✕')
  })

  it('uses Tailwind font classes for typography', () => {
    const { container } = renderWithRouter(<TopRule />)
    const wordmark = container.querySelector('.font-mono.text-label')
    expect(wordmark).toBeInTheDocument()
  })
})
