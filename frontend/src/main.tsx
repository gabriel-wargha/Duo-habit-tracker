import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ApiError } from './api/client.ts'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import { TooltipProvider } from './components/ui/tooltip.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying makes sense for network hiccups and 5xx errors, but a 401/403/404
      // will fail the same way every time, so don't retry those.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})

// ErrorBoundary is outermost, so a crash anywhere shows a friendly page instead of a blank one.
// QueryClientProvider wraps AuthProvider, because logging out clears the query cache.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              <App />
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
