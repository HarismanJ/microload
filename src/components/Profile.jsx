import { useState, useEffect, useRef, useEffectEvent } from 'react'
import { createPortal } from 'react-dom'
import LoadingSpinner from './LoadingSpinner'
import { push as pushBack, remove as removeBack } from '../lib/backStack'
import { useFocusTrap } from '../lib/useFocusTrap'
import RestWheelPicker from './RestWheelPicker'
import { supabase } from '../lib/supabase'
import { clearAccountDeletionLocalData, clearCache, getCached, setCached, invalidateCache } from '../lib/cache'
import { cancelRestNotification } from '../lib/restNotification'
import { markIntentionalLogout } from '../lib/purchases'
import WorkoutDayDetail from './profile/WorkoutDayDetail'
import WeightChart from './profile/WeightChart'
import FriendsSection from './profile/FriendsSection'
import FriendProfileDetail from './profile/FriendProfileDetail'
import Achievements from './Achievements'
import { useTheme } from '../context/ThemeContext'
import { useCurrentUser } from '../context/UserContext'
import { convertWeight } from '../lib/liftMath'
import { VALIDATION_LIMITS, normalizeUsername, validateLength, validateNumber, validateUsername } from '../lib/inputValidation'
import { saveThemeForUser } from '../lib/theme'
import { friendlyError } from '../lib/friendlyError'
import { Capacitor } from '@capacitor/core'
import { isPremiumSync, refreshPremiumStatus } from '../lib/purchases'
import Paywall from './Paywall'
import '../styles/Profile.css'

function normalizePersistableUsername(username) {
  const normalized = normalizeUsername(username)
  if (!normalized) return null
  const error = validateUsername(normalized)
  return error ? null : normalized
}

export default function Profile({ onChallenge, onWorkoutDeleted, onBodyweightChanged, onProfileSaved, workoutActive = false }) {
  const currentUser = useCurrentUser()
  const { themeId, switchTheme, previewTheme, themes } = useTheme()
  const profileIdRef = useRef(null)
  const bugReportRef = useRef(null)
  const deleteConfirmRef = useRef(null)
  const [themeError, setThemeError] = useState('')

  async function savePreferredTheme() {
    const profileId = currentUser?.id
    if (!profileId) {
      setThemeError('Could not save your preferred colour. Please sign in again.')
      return
    }

    setThemeError('')
    const { data, error } = await supabase
      .from('profiles')
      .update({
        theme: themeId,
        username: normalizePersistableUsername(profile?.username),
      })
      .eq('id', profileId)
      .select('id, theme, username, full_name, age, gender, unit_preference, default_rest_seconds, bodyweight')
      .single()

    if (error || !data) {
      setThemeError(friendlyError(error, 'Could not save your preferred colour. Please try again.'))
      return
    }

    profileIdRef.current = data.id
    setProfile(data)
    setCached('profile', { email: currentUser.email || email, profile: data })
    saveThemeForUser(data.theme || themeId, profileId)
    switchTheme(data.theme || themeId)
  }

  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [viewingSession, setViewingSession] = useState(null) // { sessionIds, dateStr }
  const [viewingAchievements, setViewingAchievements] = useState(false)
  const [viewingFriendProfile, setViewingFriendProfile] = useState(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isPremium, setIsPremium] = useState(isPremiumSync())
  const [showBugReport, setShowBugReport] = useState(false)
  const [bugReportClosing, setBugReportClosing] = useState(false)
  const bugReportCloseTimerRef = useRef(null)
  const deleteConfirmCloseTimerRef = useRef(null)
  const [bugMessage, setBugMessage] = useState('')
  const [bugSubmitting, setBugSubmitting] = useState(false)
  const [bugSubmitted, setBugSubmitted] = useState(false)
  const [bugError, setBugError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmClosing, setDeleteConfirmClosing] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useFocusTrap(bugReportRef, { active: showBugReport, onEscape: closeBugReport })

  function closeBugReport() {
    if (bugReportClosing) return
    setBugReportClosing(true)
    clearTimeout(bugReportCloseTimerRef.current)
    bugReportCloseTimerRef.current = setTimeout(() => {
      setShowBugReport(false)
      setBugReportClosing(false)
    }, 340)
  }

  function closeDeleteConfirm() {
    if (deleting || deleteConfirmClosing) return
    setDeleteConfirmClosing(true)
    clearTimeout(deleteConfirmCloseTimerRef.current)
    deleteConfirmCloseTimerRef.current = setTimeout(() => {
      setShowDeleteConfirm(false)
      setDeleteConfirmClosing(false)
    }, 340)
  }

  useEffect(() => {
    refreshPremiumStatus().then(setIsPremium)
  }, [])
  useFocusTrap(deleteConfirmRef, { active: showDeleteConfirm, onEscape: closeDeleteConfirm })

  const hasSubView = Boolean(viewingAchievements) || Boolean(viewingSession) || Boolean(viewingFriendProfile)
  useEffect(() => {
    if (!hasSubView) return
    const id = pushBack(() => {
      setViewingAchievements(false)
      setViewingSession(null)
      setViewingFriendProfile(null)
    })
    return () => removeBack(id)
  }, [hasSubView])

  async function load() {
    const cached = getCached('profile')
    const currentEmail = currentUser.email || ''
    if (cached) {
      setEmail(currentEmail || cached.email || '')
      setProfile(cached.profile)
      profileIdRef.current = cached.profile?.id ?? null
      if (cached.profile?.theme && !localStorage.getItem('theme')) switchTheme(cached.profile.theme)
    }

    // Weight logs are never cached — always fresh
    if (!cached) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, theme, username, full_name, age, gender, unit_preference, default_rest_seconds, bodyweight')
        .eq('id', currentUser.id)
        .single()

      setCached('profile', { email: currentEmail, profile: profileData })
      setEmail(currentEmail)
      if (profileData) {
        setProfile(profileData)
        profileIdRef.current = profileData.id
        if (profileData.theme && !localStorage.getItem('theme')) switchTheme(profileData.theme)
      }
    }

  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [currentUser.id])

  function startEdit() {
    setSaveError('')
    setForm({
      username: profile?.username || '',
      full_name: profile?.full_name || '',
      age: profile?.age ?? '',
      gender: profile?.gender || '',
      unit_preference: profile?.unit_preference || 'kg',
      default_rest_seconds: profile?.default_rest_seconds ?? 90,
    })
    setEditing(true)
  }

  async function saveProfile() {
    setSaving(true)
    setSaveError('')
    try {
      const fullNameError = validateLength(form.full_name, {
        label: 'Full name',
        min: 1,
        max: VALIDATION_LIMITS.fullNameMaxLength,
        required: true,
      })
      const usernameError = validateUsername(form.username)
      const ageError = validateNumber(form.age, {
        label: 'Age',
        min: VALIDATION_LIMITS.ageMin,
        max: VALIDATION_LIMITS.ageMax,
        integer: true,
      })
      const restError = validateNumber(form.default_rest_seconds, {
        label: 'Rest time',
        min: VALIDATION_LIMITS.restSecondsMin,
        max: VALIDATION_LIMITS.restSecondsMax,
        integer: true,
        required: true,
      })
      const validationError = fullNameError || usernameError || ageError || restError
      if (validationError) {
        setSaveError(validationError)
        return
      }
      const isUnitPreferenceChanging = Boolean(profile?.unit_preference && form.unit_preference && profile.unit_preference !== form.unit_preference)

      const updates = {
        ...form,
        username: normalizeUsername(form.username) || null,
        full_name: form.full_name.trim(),
        age: form.age ? parseInt(form.age) : null,
        default_rest_seconds: Number(form.default_rest_seconds),
      }

      let bodyweightRewritten = false
      if (isUnitPreferenceChanging) {
        const { data: latestWeightLog, error: latestWeightError } = await supabase
          .from('body_weight_logs')
          .select('weight, unit')
          .eq('user_id', currentUser.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestWeightError) throw latestWeightError

        const sourceWeight = latestWeightLog?.weight ?? profile?.bodyweight
        const sourceUnit = latestWeightLog?.unit || profile?.unit_preference || form.unit_preference

        if (sourceWeight !== null && sourceWeight !== undefined) {
          updates.bodyweight = Math.round(convertWeight(sourceWeight, sourceUnit, form.unit_preference) * 10) / 10
          bodyweightRewritten = true
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      invalidateCache('profile', 'home', 'ranks')
      if (bodyweightRewritten) onBodyweightChanged?.()
      onProfileSaved?.()
      setEditing(false)
    } catch (error) {
      if (error?.code === '23505' || error?.message?.toLowerCase().includes('username')) {
        setSaveError('That username is already in use.')
      } else {
        setSaveError(friendlyError(error, 'Could not save your profile.'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      clearCache()
      markIntentionalLogout()
      await supabase.auth.signOut()
    } finally {
      setSigningOut(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error) {
        let serverMessage = ''
        try {
          serverMessage = error.context ? (await error.context.json())?.error || '' : ''
        } catch {
          serverMessage = ''
        }
        throw new Error(serverMessage || error.message || 'Account deletion failed.')
      }
      if (data?.error) throw new Error(data.error)
      await cancelRestNotification('all')
      clearAccountDeletionLocalData(currentUser.id)
      markIntentionalLogout()
      await supabase.auth.signOut()
    } catch (err) {
      setDeleteError(friendlyError(err, 'Failed to delete account. Please try again or contact support.'))
      setDeleting(false)
    }
  }

  function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
    setViewingSession({ sessionIds: remainingSessionIds, dateStr })
    load()
    onWorkoutDeleted?.()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() || '?'

  if (viewingAchievements) {
    return <Achievements onBack={() => window.history.back()} />
  }

  if (viewingSession) {
    return (
      <WorkoutDayDetail
        sessionIds={viewingSession.sessionIds ?? []}
        dateStr={viewingSession.dateStr}
        onDeleteWorkout={handleDeletedWorkout}
        onRefresh={load}
        onBodyweightChanged={onBodyweightChanged}
        onBack={() => window.history.back()}
      />
    )
  }

  if (viewingFriendProfile) {
    return (
      <FriendProfileDetail
        friendId={viewingFriendProfile.id}
        fallbackProfile={viewingFriendProfile}
        onBack={() => window.history.back()}
      />
    )
  }

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <div className="avatar">{initials}</div>
        <div>
          <div className="profile-name">{profile?.full_name || profile?.username || 'User'}</div>
          <div className="profile-email">{email}</div>
        </div>
      </div>

      {isPremium ? (
        <div className="premium-manage-card">
          <div className="premium-manage-left">
            <div className="premium-manage-logo-wrap">
              <svg className="premium-manage-sparkle premium-manage-sparkle-1" width="9" height="9" viewBox="-4.5 -4.5 9 9" aria-hidden="true"><path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#fde68a"/></svg>
              <svg className="premium-manage-sparkle premium-manage-sparkle-2" width="7" height="7" viewBox="-3.5 -3.5 7 7" aria-hidden="true"><path d="M0-3L0.7-0.7L3 0L0.7 0.7L0 3L-0.7 0.7L-3 0L-0.7-0.7Z" fill="#f0c040"/></svg>
              <svg className="premium-manage-sparkle premium-manage-sparkle-3" width="8" height="8" viewBox="-4 -4 8 8" aria-hidden="true"><path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#fde68a"/></svg>
              <svg className="premium-manage-sparkle premium-manage-sparkle-4" width="6" height="6" viewBox="-3 -3 6 6" aria-hidden="true"><path d="M0-2.5L0.6-0.6L2.5 0L0.6 0.6L0 2.5L-0.6 0.6L-2.5 0L-0.6-0.6Z" fill="#f0c040"/></svg>
              <svg className="premium-manage-sparkle premium-manage-sparkle-5" width="7" height="7" viewBox="-3.5 -3.5 7 7" aria-hidden="true"><path d="M0-3L0.7-0.7L3 0L0.7 0.7L0 3L-0.7 0.7L-3 0L-0.7-0.7Z" fill="#fde68a"/></svg>
              <svg className="premium-manage-logo" viewBox="252 200 520 624" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="pmGold" x1="0.5" y1="0" x2="0.5" y2="1">
                    <stop offset="0%" stopColor="#fde68a"/>
                    <stop offset="40%" stopColor="#f0c040"/>
                    <stop offset="100%" stopColor="#b8720a"/>
                  </linearGradient>
                  <clipPath id="pmBarsClip">
                    <rect x="272" y="386" width="72" height="252" rx="28"/>
                    <rect x="374" y="290" width="72" height="444" rx="28"/>
                    <rect x="476" y="220" width="72" height="584" rx="28"/>
                    <rect x="578" y="290" width="72" height="444" rx="28"/>
                    <rect x="680" y="386" width="72" height="252" rx="28"/>
                  </clipPath>
                  <linearGradient id="pmShimmer" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="rgba(255,255,255,0)"/>
                    <stop offset="35%"  stopColor="rgba(255,255,255,0)"/>
                    <stop offset="50%"  stopColor="rgba(255,255,255,0.5)"/>
                    <stop offset="65%"  stopColor="rgba(255,255,255,0)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                  </linearGradient>
                </defs>
                <rect x="272" y="386" width="72" height="252" rx="28" fill="url(#pmGold)"/>
                <rect x="374" y="290" width="72" height="444" rx="28" fill="url(#pmGold)"/>
                <rect x="476" y="220" width="72" height="584" rx="28" fill="url(#pmGold)"/>
                <rect x="578" y="290" width="72" height="444" rx="28" fill="url(#pmGold)"/>
                <rect x="680" y="386" width="72" height="252" rx="28" fill="url(#pmGold)"/>
                <rect x="-520" y="200" width="1040" height="624" fill="url(#pmShimmer)" clipPath="url(#pmBarsClip)">
                  <animateTransform attributeName="transform" type="translate" from="-520 0" to="1040 0" dur="3.5s" repeatCount="indefinite"/>
                </rect>
              </svg>
            </div>
            <div>
              <div className="premium-manage-title">microload Pro</div>
              <div className="premium-manage-sub">Active subscription</div>
            </div>
          </div>
          <button
            className="premium-manage-link"
            onClick={() => {
              const url = Capacitor.getPlatform() === 'android'
                ? 'https://play.google.com/store/account/subscriptions'
                : 'itms-apps://apps.apple.com/account/subscriptions'
              window.open(url, '_system')
            }}
          >
            Manage
          </button>
        </div>
      ) : (
        <button className="premium-upsell-btn" onClick={() => setShowPaywall(true)}>
          <svg className="premium-btn-sparkle premium-btn-sparkle-1" width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0-5L1.2-1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2-1.2Z" fill="#fde68a"/></svg>
          <svg className="premium-btn-sparkle premium-btn-sparkle-2" width="8"  height="8"  viewBox="-4 -4 8 8"   aria-hidden="true"><path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#f0c040"/></svg>
          <svg className="premium-btn-sparkle premium-btn-sparkle-3" width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true"><path d="M0-4L1-1L4 0L1 1L0 4L-1 1L-4 0L-1-1Z" fill="#fde68a"/></svg>
          <svg className="premium-btn-sparkle premium-btn-sparkle-4" width="7"  height="7"  viewBox="-3.5 -3.5 7 7" aria-hidden="true"><path d="M0-3L0.7-0.7L3 0L0.7 0.7L0 3L-0.7 0.7L-3 0L-0.7-0.7Z" fill="#f0c040"/></svg>
          <svg className="premium-btn-sparkle premium-btn-sparkle-5" width="9"  height="9"  viewBox="-4.5 -4.5 9 9" aria-hidden="true"><path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#fde68a"/></svg>
          <svg className="premium-btn-sparkle premium-btn-sparkle-6" width="8"  height="8"  viewBox="-4 -4 8 8"   aria-hidden="true"><path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#fde68a"/></svg>
          <svg className="premium-btn-sparkle premium-btn-sparkle-7" width="7"  height="7"  viewBox="-3.5 -3.5 7 7" aria-hidden="true"><path d="M0-3L0.7-0.7L3 0L0.7 0.7L0 3L-0.7 0.7L-3 0L-0.7-0.7Z" fill="#f0c040"/></svg>
          <svg className="premium-upsell-logo" viewBox="252 200 520 624" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="272" y="386" width="72" height="252" rx="28" fill="#5c2d00"/>
            <rect x="374" y="290" width="72" height="444" rx="28" fill="#5c2d00"/>
            <rect x="476" y="220" width="72" height="584" rx="28" fill="#5c2d00"/>
            <rect x="578" y="290" width="72" height="444" rx="28" fill="#5c2d00"/>
            <rect x="680" y="386" width="72" height="252" rx="28" fill="#5c2d00"/>
          </svg>
          Go Premium
        </button>
      )}

      <button className="achievements-btn" onClick={() => setViewingAchievements(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Achievements
      </button>

      <div className="theme-section">
        <div className="theme-section-label">Theme</div>
        <div className="theme-swatches">
          {themes.map(t => (
            <div key={t.id} className="theme-swatch-wrap">
              <button
                className={`theme-swatch ${themeId === t.id ? 'active' : ''}`}
                style={{ background: `linear-gradient(135deg, ${t.vars['--surface2']} 50%, ${t.accent} 50%)` }}
                onClick={() => previewTheme(t.id)}
                title={t.name}
              >
                {themeId === t.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              <span className="theme-swatch-name">{t.name}</span>
            </div>
          ))}
        </div>
        <button className="theme-save-btn" onClick={savePreferredTheme}>
          Set as preferred colour
        </button>
        {themeError && <div className="bug-report-error">{themeError}</div>}
      </div>

      {editing ? (
        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name} maxLength={VALIDATION_LIMITS.fullNameMaxLength} onChange={e => { setSaveError(''); setForm(f => ({ ...f, full_name: e.target.value })) }} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username} maxLength={VALIDATION_LIMITS.usernameMaxLength + 1} onChange={e => { setSaveError(''); setForm(f => ({ ...f, username: e.target.value })) }} placeholder="@username" />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" min={VALIDATION_LIMITS.ageMin} max={VALIDATION_LIMITS.ageMax} step="1" inputMode="numeric" value={form.age} onChange={e => { setSaveError(''); setForm(f => ({ ...f, age: e.target.value })) }} placeholder="25" />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <div className="gender-toggle">
              {['Male', 'Female', 'Other'].map(g => (
                <button key={g} className={`gender-btn ${form.gender === g ? 'active' : ''}`} onClick={() => { setSaveError(''); setForm(f => ({ ...f, gender: g })) }}>{g}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Unit Preference</label>
            <div className="gender-toggle">
              {['kg', 'lbs'].map(u => (
                <button key={u} className={`gender-btn ${form.unit_preference === u ? 'active' : ''}`} onClick={() => { setSaveError(''); setForm(f => ({ ...f, unit_preference: u })) }}>{u}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Default Rest Time</label>
            <RestWheelPicker
              value={form.default_rest_seconds}
              onChange={s => { setSaveError(''); setForm(f => ({ ...f, default_rest_seconds: s })) }}
            />
          </div>
          {saveError && <div className="profile-save-error">{saveError}</div>}
          <div className="form-actions">
            <button className="btn-cancel" onClick={() => { setSaveError(''); setEditing(false) }}>Cancel</button>
            <button className="btn-save" onClick={saveProfile} disabled={saving}>{saving ? <LoadingSpinner size="xs" color="currentColor" /> : 'Save Changes'}</button>
          </div>
        </div>
      ) : (
        <button className="edit-profile-btn" onClick={startEdit}>Edit Profile</button>
      )}

      <FriendsSection
        userId={profile?.id}
        username={profile?.username || ''}
        profileLoaded={profile !== null}
        onChallenge={onChallenge}
        onViewProfile={setViewingFriendProfile}
        workoutActive={workoutActive}
      />
      <div>
        <button className="report-bug-btn" onClick={() => { setShowBugReport(true); setBugMessage(''); setBugError(''); setBugSubmitted(false) }}>
          Report a Bug
        </button>
        <button className="signout-btn" onClick={signOut} disabled={signingOut}>
          {signingOut ? <LoadingSpinner size="xs" color="currentColor" /> : 'Sign Out'}
        </button>
      </div>

      <div className="account-danger-zone">
        <div>
          <div className="account-danger-title">Delete Account</div>
          <div className="account-danger-copy">
            Permanently remove your account and personal app data.
          </div>
        </div>
        <button
          className="delete-account-btn"
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); setDeleteError('') }}
        >
          Delete Account
        </button>
      </div>

      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onPurchaseSuccess={() => setIsPremium(true)}
        />
      )}

      {showBugReport && createPortal(
        <div className={`bug-report-overlay${bugReportClosing ? ' bug-report-overlay--closing' : ''}`} onClick={closeBugReport}>
          <div className="bug-report-modal" onClick={e => e.stopPropagation()} ref={bugReportRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
            {bugSubmitted ? (
              <>
                <div className="bug-report-title">Thanks!</div>
                <div className="bug-report-sent">Your report was submitted.</div>
                <button className="theme-toast-ok" onClick={closeBugReport}>Done</button>
              </>
            ) : (
              <>
                <div id="bug-report-title" className="bug-report-title">Report a Bug</div>
                <textarea
                  className="bug-report-textarea"
                  placeholder="Describe what happened..."
                  value={bugMessage}
                  onChange={e => setBugMessage(e.target.value)}
                  maxLength={VALIDATION_LIMITS.bugReportMaxLength}
                  rows={5}
                />
                {bugError ? <div className="bug-report-error">{bugError}</div> : null}
                <div className="bug-report-actions">
                  <button className="bug-report-cancel" onClick={closeBugReport}>Cancel</button>
                  <button
                    className="bug-report-submit"
                    disabled={bugSubmitting || !bugMessage.trim()}
                    onClick={async () => {
                      if (!bugMessage.trim() || bugSubmitting) return
                      const bugValidationError = validateLength(bugMessage, {
                        label: 'Bug report',
                        min: VALIDATION_LIMITS.bugReportMinLength,
                        max: VALIDATION_LIMITS.bugReportMaxLength,
                        required: true,
                      })
                      if (bugValidationError) {
                        setBugError(bugValidationError)
                        return
                      }
                      setBugSubmitting(true)
                      setBugError('')
                      try {
                        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                        const { count, error: countError } = await supabase
                          .from('bug_reports')
                          .select('*', { count: 'exact', head: true })
                          .eq('user_id', currentUser.id)
                          .gte('created_at', since)
                        if (countError) throw countError
                        if (count >= 10) {
                          setBugError('You\'ve submitted 10 reports in the last 24 hours. Please try again later.')
                          return
                        }
                        const { error } = await supabase.from('bug_reports').insert({
                          user_id: currentUser.id,
                          message: bugMessage.trim(),
                        })
                        if (error) throw error
                        setBugSubmitted(true)
                        setBugMessage('')
                      } catch {
                        setBugError('Could not submit. Please try again.')
                      } finally {
                        setBugSubmitting(false)
                      }
                    }}
                  >
                    {bugSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
      {showDeleteConfirm && createPortal(
        <div className={`bug-report-overlay${deleteConfirmClosing ? ' bug-report-overlay--closing' : ''}`} onClick={closeDeleteConfirm}>
          <div className="bug-report-modal" onClick={e => e.stopPropagation()} ref={deleteConfirmRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title">
            <div id="delete-confirm-title" className="bug-report-title" style={{ color: '#ef4444' }}>Delete Account</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 16px', lineHeight: 1.5 }}>
              This permanently deletes your account, workouts, nutrition logs, body weight, friendships, and battles. Bug reports are de-identified and kept for debugging. This cannot be undone.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 10px' }}>Type <strong style={{ color: 'var(--text)' }}>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              maxLength={6}
              disabled={deleting}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14,
                outline: 'none', marginBottom: 12,
              }}
            />
            {deleteError && <div className="bug-report-error">{deleteError}</div>}
            <div className="bug-report-actions">
              <button className="bug-report-cancel" onClick={closeDeleteConfirm} disabled={deleting}>Cancel</button>
              <button
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={deleteAccount}
                style={{
                  background: deleteConfirmText === 'DELETE' && !deleting ? '#ef4444' : 'rgba(239,68,68,0.3)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 18px', fontWeight: 700, fontSize: 14,
                  cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="profile-made-by">microload by Harisman</div>
    </div>
  )
}
