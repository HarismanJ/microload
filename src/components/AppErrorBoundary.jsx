import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      window.__MICROLOAD_LAST_ERROR = { error, info }
    }
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error)

      return (
        <div className="app-crash-screen" role="alert">
          <div className="app-crash-panel">
            <h1>Something went wrong</h1>
            <p>The app hit a startup error. Refresh and try again.</p>
            <pre className="app-crash-message">{message}</pre>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
