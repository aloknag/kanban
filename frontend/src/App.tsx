import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { router } from './lib/router'
import { queryClient } from './lib/queryClient'

interface AppProps {
  children?: React.ReactNode
}

export function App({ children }: AppProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children || <RouterProvider router={router} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
