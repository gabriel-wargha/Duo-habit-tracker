import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// If any component throws while rendering, React unmounts the whole app: a blank white page.
// An error boundary catches that and shows a friendly message instead.
// It must be a class: there's no hook version of componentDidCatch / getDerivedStateFromError.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a real product this would go to an error-tracking service (block 15).
    console.error('Unexpected error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div role="alert" className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-4xl" aria-hidden="true">
            😵
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-1 text-sm text-slate-500">Reloading the page usually fixes it. Your habits are safe.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Reload
          </button>
        </div>
      </main>
    )
  }
}
