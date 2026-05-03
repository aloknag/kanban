/**
 * Integration tests for theme toggle functionality (issue #31)
 *
 * Per FrontEngDesign.md §7 and §8:
 * - t hotkey toggles theme
 * - theme persists to localStorage
 * - theme is read on initial load
 * - theme button in TopRule works
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Board } from './Board'
import { HotkeyProvider } from '../system/HotkeyProvider'
import { ThemeProvider } from '../system/ThemeProvider'
import { createQueryClient } from '../lib/queryClient'
import * as api from '../lib/api'

// Mock the api module
vi.mock('../lib/api', () => ({
  getColumns: vi.fn(),
  getTasks: vi.fn(),
  patchColumnsReorder: vi.fn(),
  patchTask: vi.fn(),
}))

describe('Theme Toggle Integration (issue #31)', () => {
  const mockColumns = [
    { id: 1, name: 'Todo', position: 0 },
    { id: 2, name: 'In Progress', position: 1 },
    { id: 3, name: 'Done', position: 2 },
  ]

  const mockTasks = [
    {
      id: 1,
      slug: 'TASK-001',
      title: 'Test task',
      excerpt: 'A test task',
      assignee: 'agent-1',
      column_id: 1,
      epic_id: null,
      updated_at: '2026-05-01T12:00:00Z',
    },
  ]

  const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = createQueryClient()
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <HotkeyProvider>
              {component}
            </HotkeyProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    // Clear localStorage and document
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')

    // Mock system preference to light
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as any

    vi.clearAllMocks()
    ;(api.getColumns as any).mockResolvedValue(mockColumns)
    ;(api.getTasks as any).mockResolvedValue(mockTasks)
  })

  it('renders theme toggle button in TopRule', async () => {
    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByLabelText('theme toggle')).toBeInTheDocument()
    })
  })

  it('clicking theme toggle button changes theme', async () => {
    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByLabelText('theme toggle')).toBeInTheDocument()
    })

    const themeButton = screen.getByLabelText('theme toggle')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(themeButton)

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('pressing t hotkey toggles theme', async () => {
    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByTestId('board-page')).toBeInTheDocument()
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    // Simulate pressing 't' key
    fireEvent.keyDown(document, { key: 't' })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('pressing t hotkey toggles back to light', async () => {
    localStorage.setItem('theme', 'dark')

    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByTestId('board-page')).toBeInTheDocument()
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    // Press 't' to toggle back to light
    fireEvent.keyDown(document, { key: 't' })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('does not toggle theme when typing in textarea', async () => {
    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByTestId('board-page')).toBeInTheDocument()
    })

    // Create a textarea and focus it
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    // Simulate pressing 't' while textarea is focused
    fireEvent.keyDown(textarea, { key: 't' })

    // Theme should not change
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    document.body.removeChild(textarea)
  })

  it('theme button has accessible title', async () => {
    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByLabelText('theme toggle')).toBeInTheDocument()
    })

    const themeButton = screen.getByLabelText('theme toggle')
    expect(themeButton).toHaveAttribute('title', 'Toggle theme (t)')
  })

  it('theme persists across renders', async () => {
    // First render - toggle to dark
    const { unmount } = renderWithProviders(<Board />)

    await waitFor(() => {
      expect(screen.getByLabelText('theme toggle')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('theme toggle'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    unmount()

    // Second render - theme should still be dark
    renderWithProviders(<Board />)

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })
})
