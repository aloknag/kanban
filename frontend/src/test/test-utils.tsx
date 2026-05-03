import React, { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../system/ThemeProvider'

// Create a new QueryClient for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
}

/**
 * Custom render function that wraps components with necessary providers:
 * - QueryClientProvider (for TanStack Query)
 * - MemoryRouter (for React Router - isolated test environment)
 *
 * @example
 * import { render, screen } from './test/test-utils'
 *
 * test('renders component', () => {
 *   render(<MyComponent />)
 *   expect(screen.getByTestId('my-element')).toBeInTheDocument()
 * })
 *
 * test('with initial route', () => {
 *   render(<MyComponent />, { initialRoute: '/some-path' })
 *   expect(screen.getByTestId('my-element')).toBeInTheDocument()
 * })
 */
export function render(
  ui: ReactElement,
  {
    initialRoute = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  const testQueryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
// export { default as userEvent } from '@testing-library/user-event'
