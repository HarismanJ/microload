import { useState, useEffect, useRef, useEffectEvent } from 'react'
import { useFocusTrap } from '../lib/useFocusTrap'
import RestWheelPicker from './RestWheelPicker'
import { supabase } from '../lib/supabase'
import { clearAccountDeletionLocalData, clearCache, getCached, setCached, invalidateCache } from '../lib/cache'
import { cancelRestNotification } from '../lib/restNotification'
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
import '../styles/Profile.css'

function normalizePersistableUsername(username) {
  const normalized = normalizeUsername(username)
  if (!normalized) return null
  const error = validateUsername(normalized)
  return error ? null : normalized
}

export default function Profile({ onChallenge, onWorkoutDeleted, workoutActive = false }) {
  const currentUser = useCurrentUser()
  const { themeId, switchTheme, previewTheme, themes } = useTheme()
  const profileIdRef = useRef(null)
  const themeToastRef = useRef(null)
  const bugReportRef = useRef(null)
  const deleteConfirmRef = useRef(null)
  const [themeToast, setThemeToast] = useState(null)
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
      setThemeError(error?.message || 'Could not save your preferred colour. Please try again.')
      return
    }

    profileIdRef.current = data.id
    setProfile(data)
    setCached('profile', { email: currentUser.email || email, profile: data })
    saveThemeForUser(data.theme || themeId, profileId)
    switchTheme(data.theme || themeId)
    const name = themes.find(t => t.id === (data.theme || themeId))?.name || data.theme || themeId
    setThemeToast(name)
  }

  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [viewingSession, setViewingSession] = useState(null) // { sessionIds, dateStr }
  const [viewingAchievements, setViewingAchievements] = useState(false)
  const [viewingFriendProfile, setViewingFriendProfile] = useState(null)
  const [showBugReport, setShowBugReport] = useState(false)
  const [bugMessage, setBugMessage] = useState('')
  const [bugSubmitting, setBugSubmitting] = useState(false)
  const [bugSubmitted, setBugSubmitted] = useState(false)
  const [bugError, setBugError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useFocusTrap(themeToastRef, { active: !!themeToast, onEscape: () => setThemeToast(null) })
  useFocusTrap(bugReportRef, { active: showBugReport, onEscape: () => setShowBugReport(false) })
  useFocusTrap(deleteConfirmRef, { active: showDeleteConfirm, onEscape: () => !deleting && setShowDeleteConfirm(false) })

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
        bodyweight: form.bodyweight !== undefined
          ? (form.bodyweight ? parseFloat(form.bodyweight) : null)
          : (profile?.bodyweight ?? null),
      }

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
      setEditing(false)
    } catch (error) {
      if (error?.code === '23505' || error?.message?.toLowerCase().includes('username')) {
        setSaveError('That username is already in use.')
      } else {
        setSaveError(error?.message || 'Could not save your profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    clearCache()
    await supabase.auth.signOut()
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
      await supabase.auth.signOut()
    } catch (err) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again or contact support.')
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
    return <Achievements onBack={() => setViewingAchievements(false)} />
  }

  if (viewingSession) {
    return (
      <WorkoutDayDetail
        sessionIds={viewingSession.sessionIds ?? []}
        dateStr={viewingSession.dateStr}
        onDeleteWorkout={handleDeletedWorkout}
        onRefresh={load}
        onBack={() => setViewingSession(null)}
      />
    )
  }

  if (viewingFriendProfile) {
    return (
      <FriendProfileDetail
        friendId={viewingFriendProfile.id}
        fallbackProfile={viewingFriendProfile}
        onBack={() => setViewingFriendProfile(null)}
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
            <button className="btn-save" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
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
        <button className="signout-btn" onClick={signOut}>Sign Out</button>
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

      {themeToast && (
        <div className="theme-toast-overlay" onClick={() => setThemeToast(null)}>
          <div className="theme-toast-modal" onClick={e => e.stopPropagation()} ref={themeToastRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Theme confirmation">
            <div className="theme-toast-msg">Preferred colour set to <strong>{themeToast}</strong></div>
            <button className="theme-toast-ok" onClick={() => setThemeToast(null)}>OK</button>
          </div>
        </div>
      )}

      {showBugReport && (
        <div className="bug-report-overlay" onClick={() => setShowBugReport(false)}>
          <div className="bug-report-modal" onClick={e => e.stopPropagation()} ref={bugReportRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
            {bugSubmitted ? (
              <>
                <div className="bug-report-title">Thanks!</div>
                <div className="bug-report-sent">Your report was submitted.</div>
                <button className="theme-toast-ok" onClick={() => setShowBugReport(false)}>Done</button>
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
                  <button className="bug-report-cancel" onClick={() => setShowBugReport(false)}>Cancel</button>
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
        </div>
      )}
      {showDeleteConfirm && (
        <div className="bug-report-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
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
              disabled={deleting}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 14,
                outline: 'none', marginBottom: 12,
              }}
            />
            {deleteError && <div className="bug-report-error">{deleteError}</div>}
            <div className="bug-report-actions">
              <button className="bug-report-cancel" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
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
        </div>
      )}

      <div className="profile-made-by">microload by Harisman</div>
    </div>
  )
}
