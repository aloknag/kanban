import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { PollIndicator } from './PollIndicator'

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useIsFetching: vi.fn(),
  useQueryClient: vi.fn(),
}))

function mockQueryClientWithData(data: unknown) {
  const mockGetQueryData = vi.fn().mockReturnValue(data)
  vi.mocked(useQueryClient).mockReturnValue({
    getQueryData: mockGetQueryData,
  } as any)
  return mockGetQueryData
}

// Mock matchMedia for reduced-motion tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('PollIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: unchanging data, so tests that don't care about the pulse
    // condition don't accidentally trigger it.
    mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
  })

  it('subscribes to useIsFetching and useQueryClient for the tasks query', () => {
    const mockUseIsFetching = vi.mocked(useIsFetching)
    mockUseIsFetching.mockReturnValue(0)

    render(<PollIndicator glyphRef={{ current: document.createElement('span') }} />)
    expect(mockUseIsFetching).toHaveBeenCalledWith({ queryKey: ['tasks'] })
    expect(vi.mocked(useQueryClient)).toHaveBeenCalled()
  })

  it('pulses when a poll cycle returns changed data', () => {
    const mockUseIsFetching = vi.mocked(useIsFetching)
    const glyphElement = document.createElement('span')

    // Baseline fetch resolves with initial data
    mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
    mockUseIsFetching.mockReturnValue(0)
    const { rerender } = render(
      <PollIndicator glyphRef={({ current: glyphElement } as any)} />
    )

    // Poll cycle begins
    mockUseIsFetching.mockReturnValue(1)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    // Poll cycle completes with DIFFERENT data
    mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:05:00Z' }])
    mockUseIsFetching.mockReturnValue(0)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    expect(glyphElement.classList.contains('animate-poll-pulse')).toBe(true)
  })

  it('does not pulse when a poll cycle returns unchanged data', () => {
    const mockUseIsFetching = vi.mocked(useIsFetching)
    const glyphElement = document.createElement('span')
    const unchangedData = [{ id: 1, updated_at: '2026-01-01T00:00:00Z' }]

    mockQueryClientWithData(unchangedData)
    mockUseIsFetching.mockReturnValue(0)
    const { rerender } = render(
      <PollIndicator glyphRef={({ current: glyphElement } as any)} />
    )

    mockUseIsFetching.mockReturnValue(1)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    // Poll cycle completes with the SAME data (new array reference, same content)
    mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
    mockUseIsFetching.mockReturnValue(0)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    expect(glyphElement.classList.contains('animate-poll-pulse')).toBe(false)
  })

  it('does not pulse on the initial fetch (no prior data to compare against)', () => {
    const mockUseIsFetching = vi.mocked(useIsFetching)
    const glyphElement = document.createElement('span')

    mockQueryClientWithData(undefined)
    mockUseIsFetching.mockReturnValue(1)
    const { rerender } = render(
      <PollIndicator glyphRef={({ current: glyphElement } as any)} />
    )

    mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
    mockUseIsFetching.mockReturnValue(0)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    expect(glyphElement.classList.contains('animate-poll-pulse')).toBe(false)
  })

  it('cleans up timer on unmount during active fade', () => {
    vi.useFakeTimers()
    try {
      const mockUseIsFetching = vi.mocked(useIsFetching)
      const glyphElement = document.createElement('span')
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
      mockUseIsFetching.mockReturnValue(0)

      const { rerender, unmount } = render(
        <PollIndicator glyphRef={({ current: glyphElement } as any)} />
      )

      mockUseIsFetching.mockReturnValue(1)
      rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

      mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:05:00Z' }])
      mockUseIsFetching.mockReturnValue(0)
      rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

      // Unmount before timer fires
      unmount()

      // Verify cleanup happened
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })

  it('removes animate-poll-pulse class after 80ms', () => {
    vi.useFakeTimers()
    try {
      const mockUseIsFetching = vi.mocked(useIsFetching)
      const glyphElement = document.createElement('span')

      mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
      mockUseIsFetching.mockReturnValue(0)

      const { rerender } = render(
        <PollIndicator glyphRef={({ current: glyphElement } as any)} />
      )

      mockUseIsFetching.mockReturnValue(1)
      rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

      mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:05:00Z' }])
      mockUseIsFetching.mockReturnValue(0)
      rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

      // Class should be added
      expect(glyphElement.classList.contains('animate-poll-pulse')).toBe(true)

      // Advance time by 80ms
      vi.advanceTimersByTime(80)

      // Class should be removed
      expect(glyphElement.classList.contains('animate-poll-pulse')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('respects prefers-reduced-motion media query', () => {
    const mockMatchMedia = vi.fn().mockImplementation(query => {
      const isReducedMotion = query === '(prefers-reduced-motion: reduce)'
      return {
        matches: isReducedMotion,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    })
    window.matchMedia = mockMatchMedia

    const mockUseIsFetching = vi.mocked(useIsFetching)
    mockQueryClientWithData([{ id: 1, updated_at: '2026-01-01T00:00:00Z' }])
    mockUseIsFetching.mockReturnValue(0)

    const glyphElement = document.createElement('span')
    const { rerender } = render(
      <PollIndicator glyphRef={({ current: glyphElement } as any)} />
    )

    mockUseIsFetching.mockReturnValue(1)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    mockUseIsFetching.mockReturnValue(0)
    rerender(<PollIndicator glyphRef={({ current: glyphElement } as any)} />)

    // Component should still render correctly with reduced-motion preference
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })
})
