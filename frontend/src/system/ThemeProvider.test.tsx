import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeProvider'

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    // Clear data-theme attribute
    document.documentElement.removeAttribute('data-theme')
    // Mock system preference to light (default)
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    window.matchMedia = mockMatchMedia as any
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('provides theme context to children', () => {
    const TestComponent = () => {
      const { theme } = useTheme()
      return <div data-testid="theme-display">{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-display')).toBeInTheDocument()
  })

  it('initializes with system theme by default', () => {
    const TestComponent = () => {
      const { theme } = useTheme()
      return <div data-testid="theme-display">{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-display')).toHaveTextContent('system')
  })

  it('reads theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark')

    const TestComponent = () => {
      const { theme } = useTheme()
      return <div data-testid="theme-display">{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-display')).toHaveTextContent('dark')
  })

  it('respects system preference when in system mode', () => {
    // Mock matchMedia for prefers-color-scheme to return dark
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    window.matchMedia = mockMatchMedia as any

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    // Document attribute should reflect system preference
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles theme and updates localStorage', () => {
    const TestComponent = () => {
      const { theme, toggleTheme } = useTheme()
      return (
        <>
          <div data-testid="theme-display">{theme}</div>
          <button onClick={toggleTheme} data-testid="toggle-btn">
            Toggle
          </button>
        </>
      )
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-display')).toHaveTextContent('system')

    fireEvent.click(screen.getByTestId('toggle-btn'))

    expect(screen.getByTestId('theme-display')).toHaveTextContent('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('toggles from dark to light', () => {
    localStorage.setItem('theme', 'dark')

    const TestComponent = () => {
      const { theme, toggleTheme } = useTheme()
      return (
        <>
          <div data-testid="theme-display">{theme}</div>
          <button onClick={toggleTheme} data-testid="toggle-btn">
            Toggle
          </button>
        </>
      )
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByTestId('toggle-btn'))

    expect(screen.getByTestId('theme-display')).toHaveTextContent('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('applies data-theme attribute to document', () => {
    const TestComponent = () => {
      const { toggleTheme } = useTheme()
      return <button onClick={toggleTheme}>Toggle</button>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Starts with system (resolved to light from mock)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    // Toggle from system to dark
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    // Toggle from dark to light
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    // Toggle from light to dark
    fireEvent.click(screen.getByRole('button'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('throws error when useTheme is used outside provider', () => {
    const TestComponent = () => {
      useTheme()
      return <div>Test</div>
    }

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within ThemeProvider')

    consoleError.mockRestore()
  })

  it('reads system theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'system')

    const TestComponent = () => {
      const { theme } = useTheme()
      return <div data-testid="theme-display">{theme}</div>
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-display')).toHaveTextContent('system')
  })

  it('resolves system theme to dark when system preference is dark', () => {
    // Mock matchMedia for prefers-color-scheme
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    window.matchMedia = mockMatchMedia as any

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('resolves system theme to light when system preference is light', () => {
    const mockMatchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    window.matchMedia = mockMatchMedia as any

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggles between light and dark (system treated as light)', () => {
    const TestComponent = () => {
      const { theme, toggleTheme } = useTheme()
      return (
        <>
          <div data-testid="theme-display">{theme}</div>
          <button onClick={toggleTheme} data-testid="toggle-btn">
            Toggle
          </button>
        </>
      )
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Start with system (default)
    expect(screen.getByTestId('theme-display')).toHaveTextContent('system')

    // Toggle from system to dark (system is treated like light)
    fireEvent.click(screen.getByTestId('toggle-btn'))
    expect(screen.getByTestId('theme-display')).toHaveTextContent('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    // Toggle from dark to light
    fireEvent.click(screen.getByTestId('toggle-btn'))
    expect(screen.getByTestId('theme-display')).toHaveTextContent('light')
    expect(localStorage.getItem('theme')).toBe('light')

    // Toggle from light to dark
    fireEvent.click(screen.getByTestId('toggle-btn'))
    expect(screen.getByTestId('theme-display')).toHaveTextContent('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('listens to system preference changes when in system mode', () => {
    const changeCallbacks: Array<(e: MediaQueryListEvent) => void> = []

    const mockMatchMedia = vi.fn((query: string) => {
      const listeners: Array<(e: MediaQueryListEvent) => void> = []

      return {
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.push(callback)
            changeCallbacks.push(callback)
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        __triggerChange: () => {
          listeners.forEach((cb) =>
            cb({ matches: true } as MediaQueryListEvent)
          )
        },
      }
    })

    window.matchMedia = mockMatchMedia as any

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    )

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    // Trigger system preference change
    if (changeCallbacks.length > 0) {
      changeCallbacks[0]({ matches: true } as MediaQueryListEvent)
    }

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
