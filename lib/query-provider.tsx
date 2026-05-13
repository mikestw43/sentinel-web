'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 4000,
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
      }
    }
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
