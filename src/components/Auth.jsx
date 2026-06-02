import { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { supabase } from '../lib/supabase'
import { markIntentionalLogout } from '../lib/purchases'
import { VALIDATION_LIMITS, validateEmail, validatePassword } from '../lib/inputValidation'

const GOOGLE_WEB_CLIENT_ID = '1052822933922-r7sa24t8buocnadn6emof98hp6dmndjo.apps.googleusercontent.com'
const GOOGLE_IOS_CLIENT_ID = '1052822933922-i6h18p1qlvek9f8jfu60mgcnj9iqieb5.apps.googleusercontent.com'

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

  async function handleAppleSignIn() {
    setLoading(true)
    setError(null)
    try {
      if (Capacitor.getPlatform() === 'android') {
        setError('Apple sign-in failed. Cannot continue with Apple on Android device.')
        return
      }
      if (Capacitor.isNativePlatform()) {
        await SocialLogin.initialize({ apple: { redirectUrl: '' } })
        const { result } = await SocialLogin.login({ provider: 'apple', options: {} })
        if (!result?.idToken) throw new Error('Apple did not return an identity token.')
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: result.idToken,
        })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: window.location.origin },
        })
        if (error) setError(error.message)
      }
    } catch (err) {
      const msg = String(err?.message || err || '')
      if (/cancel|cancelled|canceled|user.*closed|dismiss/i.test(msg)) return
      setError(err?.message ? `Apple sign-in failed: ${err.message}` : 'Apple sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    try {
      if (Capacitor.isNativePlatform()) {
        await SocialLogin.initialize({
          google: {
            webClientId: GOOGLE_WEB_CLIENT_ID,
            iOSClientId: GOOGLE_IOS_CLIENT_ID,
            iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
            mode: 'online',
          },
        })
        const { result } = await SocialLogin.login({ provider: 'google', options: {} })
        if (!result?.idToken) {
          throw new Error('Google did not return an ID token.')
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: result.idToken,
        })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })
        if (error) setError(error.message)
      }
    } catch (err) {
      const message = String(err?.message || err || '')
      if (/cancel|cancelled|canceled|user.*closed|dismiss/i.test(message)) return
      setError(err?.message ? `Google sign-in failed: ${err.message}` : 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      if (mode !== 'reset') {
        const emailError = validateEmail(email)
        if (emailError) {
          setError(emailError)
          return
        }
      }

      if (mode === 'signup' || mode === 'reset') {
        const passwordError = validatePassword(password)
        if (passwordError) {
          setError(passwordError)
          return
        }
      }

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        const emailRedirectTo = Capacitor.isNativePlatform()
          ? 'microload://confirm'
          : `${window.location.origin}/confirm.html`
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo } })
        if (error) setError(error.message)
        else setMessage('Check your email for a confirmation link. Be sure to check your spam folder.')
      } else if (mode === 'forgot') {
        const redirectTo = Capacitor.isNativePlatform()
          ? 'microload://reset-password'
          : `${window.location.origin}/reset-password.html`
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
        if (error) { setError(error.message) } else {
          setMessage('Check your email for a password reset link. Be sure to check your spam folder.')
        }
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        const { error } = await supabase.auth.updateUser({ password })
        if (error) setError(error.message)
        else {
          localStorage.removeItem('microload:pendingRecovery')
          setMessage('Password updated. You can now sign in.')
          onRecoveryDone?.()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) setError(error.message)
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
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
              onClick={() => { markIntentionalLogout(); supabase.auth.signOut() }}
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
              maxLength={VALIDATION_LIMITS.emailMaxLength}
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
                minLength={mode === 'signup' || mode === 'reset' ? VALIDATION_LIMITS.passwordMinLength : undefined}
                maxLength={VALIDATION_LIMITS.passwordMaxLength}
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
                minLength={VALIDATION_LIMITS.passwordMinLength}
                maxLength={VALIDATION_LIMITS.passwordMaxLength}
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
            {loading ? <LoadingSpinner size="xs" color="currentColor" /> : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Update Password' : 'Send Reset Link'}
          </button>
        </form>

        {(mode === 'signin' || mode === 'signup') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleAppleSignIn}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '12px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg)', color: 'var(--text)', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                marginTop: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              Continue with Apple
            </button>
          </>
        )}
      </div>
    </div>
  )
}
