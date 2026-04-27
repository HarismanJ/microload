import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'

export default function Auth({ recoveryMode = false, onRecoveryDone }) {
  const [mode, setMode] = useState(recoveryMode ? 'reset' : 'signin') // 'signin' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  useEffect(() => {
    if (recoveryMode) {
      setMode('reset')
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setMessage(null)
    }
  }, [recoveryMode])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/confirm.html` } })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link. Be sure to check your spam folder.')
    } else if (mode === 'forgot') {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'microload://reset-password'
        : `${window.location.origin}/reset-password.html`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) { setError(error.message) } else {
        setMessage('Check your email for a password reset link. Be sure to check your spam folder.')
      }
    } else if (mode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) setError(error.message)
      else { setMessage('Password updated. You can now sign in.'); onRecoveryDone?.() }
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
        {mode !== 'forgot' && mode !== 'reset' && (
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
        )}

        {mode === 'forgot' && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 14, cursor: 'pointer', padding: 0 }}
            >
              ← Back to Sign In
            </button>
            <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginTop: 12 }}>Reset Password</p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Enter your email and we'll send you a reset link.</p>
          </div>
        )}

        {mode === 'reset' && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 14, cursor: 'pointer', padding: 0 }}
            >
              ← Back to Sign In
            </button>
            <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, marginTop: 12 }}>Set New Password</p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Enter and confirm your new password.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode !== 'reset' && (
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
          )}
          {mode !== 'forgot' && (
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 44px 12px 14px', color: 'var(--text)',
                  fontSize: 15, outline: 'none', width: '100%'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--muted)', display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 44px 12px 14px', color: 'var(--text)',
                  fontSize: 15, outline: 'none', width: '100%'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--muted)', display: 'flex', alignItems: 'center'
                }}
              >
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          )}

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(null); setMessage(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, cursor: 'pointer', textAlign: 'right', padding: 0, marginTop: -6 }}
            >
              Forgot password?
            </button>
          )}

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
            {loading ? '...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Update Password' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  )
}
