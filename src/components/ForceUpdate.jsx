import { openAppStore } from '../lib/appVersion'

export default function ForceUpdate() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100dvh', padding: '24px',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--surface)', borderRadius: 16,
        padding: 32, border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16,
      }}>

        {/* Same bar-chart logo SVG as Auth.jsx */}
        <svg width="46" height="48" viewBox="0 0 46 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0"  y="10" width="6" height="28" rx="2" style={{ fill: 'var(--blue)' }} />
          <rect x="9"  y="4"  width="6" height="40" rx="2" style={{ fill: 'var(--blue)' }} />
          <rect x="18" y="0"  width="6" height="48" rx="2" style={{ fill: 'var(--blue)' }} />
          <rect x="27" y="4"  width="6" height="40" rx="2" style={{ fill: 'var(--blue)' }} />
          <rect x="36" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--blue)' }} />
        </svg>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, margin: 0 }}>
            Update Required
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8, lineHeight: 1.5, marginBottom: 0 }}>
            A newer version of microload is required to continue.
            Please update the app to get the latest features and fixes.
          </p>
        </div>

        <button
          onClick={openAppStore}
          style={{
            width: '100%', padding: '14px 0', marginTop: 8,
            background: 'var(--blue)', color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Update Now
        </button>

      </div>
    </div>
  )
}
