import { fireEvent, render, screen } from '@testing-library/react'

import AppErrorBoundary from '../../components/AppErrorBoundary.jsx'

function ThrowingChild() {
  throw new Error('startup exploded')
}

function renderBrokenBoundary() {
  return render(
    <AppErrorBoundary>
      <ThrowingChild />
    </AppErrorBoundary>,
  )
}

describe('AppErrorBoundary', () => {
  afterEach(() => {
    delete window.__MICROLOAD_LAST_ERROR
    vi.restoreAllMocks()
  })

  it('renders children when no error is thrown', () => {
    render(
      <AppErrorBoundary>
        <div>App loaded</div>
      </AppErrorBoundary>,
    )

    expect(screen.getByText('App loaded')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders the crash fallback and records caught error details', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderBrokenBoundary()

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('The app hit a startup error. Refresh and try again.')).toBeTruthy()
    expect(screen.getByText('startup exploded')).toBeTruthy()
    expect(screen.getByText('Refresh')).toBeTruthy()
    expect(consoleError).toHaveBeenCalledWith('App crashed:', expect.any(Error), expect.any(Object))

    if (import.meta.env.DEV) {
      expect(window.__MICROLOAD_LAST_ERROR.error.message).toBe('startup exploded')
    }
  })

  it('reloads the page from the crash fallback refresh button', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})

    renderBrokenBoundary()
    fireEvent.click(screen.getByText('Refresh'))

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
