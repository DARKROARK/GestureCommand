import { Component, type ErrorInfo, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('GestureFlow render error', error, info.componentStack) }
  render() {
    if (this.state.error) return <main className="error-page"><div className="brand-mark">〰</div><h1>Let’s get you back in the flow.</h1><p>Something interrupted the workspace. Your saved gestures are still on this device.</p><button onClick={() => location.reload()}>Reload GestureFlow</button></main>
    return this.props.children
  }
}
