import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/confirm.html` } })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', padding: '24px',
      background: 'var(--bg)'
    }}>
      <svg width="158" height="36" viewBox="0 0 210 48" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 32 }}>
        <rect x="0" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--blue)' }}/>
        <rect x="9" y="4" width="6" height="40" rx="2" style={{ fill: 'var(--blue)' }}/>
        <rect x="18" y="0" width="6" height="48" rx="2" style={{ fill: 'var(--blue)' }}/>
        <rect x="27" y="4" width="6" height="40" rx="2" style={{ fill: 'var(--blue)' }}/>
        <rect x="36" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--blue)' }}/>
        <text x="50" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="700" fill="#ffffff" letterSpacing="-0.5">
          micro<tspan style={{ fill: 'var(--blue)' }}>load</tspan>
        </text>
      </svg>

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--surface)', borderRadius: 16,
        padding: 24, border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', marginBottom: 24, background: 'var(--bg)', borderRadius: 10, padding: 4 }}>
          {['signin', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setMessage(null) }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                background: mode === m ? 'var(--blue)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--muted)'
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', color: 'var(--text)',
              fontSize: 15, outline: 'none', width: '100%'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', color: 'var(--text)',
              fontSize: 15, outline: 'none', width: '100%'
            }}
          />

          {error && (
            <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{error}</p>
          )}
          {message && (
            <p style={{ color: '#4ade80', fontSize: 13, textAlign: 'center' }}>{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--blue)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px', fontWeight: 700,
              fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4
            }}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
