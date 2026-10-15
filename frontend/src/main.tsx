import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ApiError } from './api/client.ts'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// One cache for all API data in the app.
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

// BrowserRouter: reads the URL and lets <Routes> pick a page without full reloads.
// QueryClientProvider: gives every component access to the query cache (outside AuthProvider,
// because logging out clears that cache).
// AuthProvider: makes the logged-in user available to every component via useAuth().
// ErrorBoundary: outermost, so a crash anywhere shows a friendly page instead of a blank one.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
