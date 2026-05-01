import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

describe('QueryClient Setup', () => {
  it('should create a QueryClient with default options', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchInterval: 5000,
          refetchOnWindowFocus: false,
        },
      },
    })

    expect(queryClient).toBeDefined()
    expect(queryClient.getDefaultOptions().queries?.refetchInterval).toBe(5000)
  })

  it('should provide QueryClientProvider in the app', () => {
    const queryClient = new QueryClient()

    const TestComponent = () => {
      return <div data-testid="test-component">Query Provider is working</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    )

    expect(screen.getByTestId('test-component')).toBeInTheDocument()
  })
})
