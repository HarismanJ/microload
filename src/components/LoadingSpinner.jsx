import '../styles/LoadingSpinner.css'

export default function LoadingSpinner({ size = 'md', fullPage = false, color }) {
  const spinner = (
    <div className={`spinner spinner-${size}`} role="status" aria-label="Loading" style={color ? { '--spinner-color': color } : undefined}>
      <div className="spinner-logo-shell">
        <div className="spinner-logo-glow" />
        <div className="spinner-logo" aria-hidden="true">
          <span className="spinner-logo-bar spinner-logo-bar-1" />
          <span className="spinner-logo-bar spinner-logo-bar-2" />
          <span className="spinner-logo-bar spinner-logo-bar-3" />
          <span className="spinner-logo-bar spinner-logo-bar-4" />
          <span className="spinner-logo-bar spinner-logo-bar-5" />
        </div>
      </div>
    </div>
  )

  if (fullPage) {
    return <div className="spinner-page">{spinner}</div>
  }

  return spinner
}
