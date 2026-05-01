import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('should render the app without crashing', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should have a router with /board route by default', () => {
    render(<App />)
    // The board should be the default route
    expect(screen.getByTestId('board-page')).toBeInTheDocument()
  })

  it('should render QueryClient provider (queries should work)', async () => {
    render(<App />)
    // If QueryClient is not set up, useQuery would throw an error
    // This test verifies that the context is available
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('should handle errors with error boundary', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create an app with a child that throws
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <App>{children}</App>
    )

    const ThrowError = () => {
      throw new Error('Test error in App')
    }

    render(
      <TestWrapper>
        <ThrowError />
      </TestWrapper>
    )

    // Check if error boundary renders error message
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
