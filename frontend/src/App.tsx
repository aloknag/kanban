import { RouterProvider } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HotkeyProvider } from './system/HotkeyProvider'
import { ThemeProvider } from './system/ThemeProvider'
import { router } from './lib/router'
import { queryClient } from './lib/queryClient'

interface AppProps {
  children?: React.ReactNode
}

export function App({ children }: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <HotkeyProvider>
            {children || <RouterProvider router={router} />}
          </HotkeyProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
