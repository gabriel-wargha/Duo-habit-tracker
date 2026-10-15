import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusScreen } from './StatusScreen'

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
      <StatusScreen
        icon={TriangleAlert}
        title="Something went wrong"
        action={
          <Button size="lg" onClick={() => window.location.reload()}>
            <RotateCw data-icon="inline-start" />
            Reload
          </Button>
        }
      >
        Reloading the page usually fixes it. Your habits are safe.
      </StatusScreen>
    )
  }
}
