import { QueryClient } from '@tanstack/react-query'

export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
        refetchInterval: 5000, // Poll every 5 seconds
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

// Create a singleton instance for the app
export const queryClient = createQueryClient()
