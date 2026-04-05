import { useState, useEffect, useRef, useEffectEvent } from 'react'
import RestWheelPicker from './RestWheelPicker'
import { supabase } from '../lib/supabase'
import { getCached, setCached, invalidateCache } from '../lib/cache'
import WorkoutDayDetail from './profile/WorkoutDayDetail'
import WeightChart from './profile/WeightChart'
import FriendsSection from './profile/FriendsSection'
import Achievements from './Achievements'
import { useTheme } from '../context/ThemeContext'
import { convertWeight } from '../lib/liftMath'
import '../styles/Profile.css'

function formatWeightLogLabel(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Profile({ onChallenge }) {
  const { themeId, switchTheme, themes } = useTheme()
  const profileIdRef = useRef(null)
  const weightSectionRef = useRef(null)
  const [themeToast, setThemeToast] = useState(null)

  async function savePreferredTheme() {
    if (profileIdRef.current) {
      await supabase.from('profiles').update({ theme: themeId }).eq('id', profileIdRef.current)
      const name = themes.find(t => t.id === themeId)?.name || themeId
      setThemeToast(name)
    }
  }

  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [viewingSession, setViewingSession] = useState(null) // { sessionIds, dateStr }
  const [viewingAchievements, setViewingAchievements] = useState(false)
  const [weightLogs, setWeightLogs] = useState([])
  const [weightPeriod, setWeightPeriod] = useState('all')
  const [weightDeleteTargetId, setWeightDeleteTargetId] = useState(null)
  const [weightDeletingId, setWeightDeletingId] = useState(null)
  const [weightDeleteError, setWeightDeleteError] = useState('')

  async function load() {
    const cached = getCached('profile')
    if (cached) {
      setEmail(cached.email)
      setProfile(cached.profile)
      profileIdRef.current = cached.profile?.id ?? null
      if (cached.profile?.theme && !localStorage.getItem('theme')) switchTheme(cached.profile.theme)
    }

    // Weight logs are never cached — always fresh
    const { data: { user } } = await supabase.auth.getUser()

    if (!getCached('profile')) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setCached('profile', { email: user.email, profile: profileData })
      setEmail(user.email)
      if (profileData) {
        setProfile(profileData)
        profileIdRef.current = profileData.id
        if (profileData.theme && !localStorage.getItem('theme')) switchTheme(profileData.theme)
      }
    }

    const { data: logs } = await supabase
      .from('body_weight_logs')
      .select('id, weight, unit, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })

    if (logs) {
      setWeightLogs(logs.map(l => ({
        id: l.id,
        weight: l.weight,
        unit: l.unit,
        date: l.logged_at.slice(0, 10),
        loggedAt: l.logged_at,
      })))
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [])

  async function deleteWeightLog(logId) {
    if (!logId || weightDeletingId) return
    setWeightDeletingId(logId)
    setWeightDeleteError('')

    const remainingLogs = weightLogs.filter(log => log.id !== logId)
    const latestRemainingLog = remainingLogs.at(-1)
    const nextBodyweight = latestRemainingLog
      ? convertWeight(latestRemainingLog.weight, latestRemainingLog.unit || profile?.unit_preference || 'kg', profile?.unit_preference || 'kg')
      : null
    const profileId = profileIdRef.current

    const [{ error: deleteError }, { error: profileError }] = await Promise.all([
      supabase.from('body_weight_logs').delete().eq('id', logId),
      profileId
        ? supabase.from('profiles').update({ bodyweight: nextBodyweight }).eq('id', profileId)
        : Promise.resolve({ error: null }),
    ])

    if (deleteError || profileError) {
      setWeightDeletingId(null)
      setWeightDeleteError(deleteError?.message || profileError?.message || 'Could not delete this weight log.')
      return
    }

    invalidateCache('profile', 'ranks', 'home')
    setWeightLogs(remainingLogs)
    setProfile(p => (p ? { ...p, bodyweight: nextBodyweight } : p))
    setWeightDeletingId(null)
    setWeightDeleteTargetId(null)
  }

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
    const { data: { user } } = await supabase.auth.getUser()
    const isUnitPreferenceChanging = Boolean(profile?.unit_preference && form.unit_preference && profile.unit_preference !== form.unit_preference)

    const updates = {
      ...form,
      username: form.username?.trim() || null,
      age: form.age ? parseInt(form.age) : null,
      bodyweight: form.bodyweight !== undefined
        ? (form.bodyweight ? parseFloat(form.bodyweight) : null)
        : (profile?.bodyweight ?? null),
    }

    if (isUnitPreferenceChanging) {
      const { data: latestWeightLog } = await supabase
        .from('body_weight_logs')
        .select('weight, unit')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sourceWeight = latestWeightLog?.weight ?? profile?.bodyweight
      const sourceUnit = latestWeightLog?.unit || profile?.unit_preference || form.unit_preference

      if (sourceWeight !== null && sourceWeight !== undefined) {
        updates.bodyweight = Math.round(convertWeight(sourceWeight, sourceUnit, form.unit_preference) * 10) / 10
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) {
      setProfile(data)
      invalidateCache('profile', 'home', 'ranks')
      setEditing(false)
    } else if (error.code === '23505' || error.message?.toLowerCase().includes('username')) {
      setSaveError('That username is already in use.')
    } else {
      setSaveError(error.message || 'Could not save your profile.')
    }
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
    setViewingSession({ sessionIds: remainingSessionIds, dateStr })
    load()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() || '?'

  const periodDays = { '1w': 7, '1m': 30, '1y': 365 }
  const now = new Date()
  const filteredWeightLogs = weightPeriod === 'all'
    ? weightLogs
    : weightLogs.filter(d => (now - new Date(d.date)) / 86400000 <= periodDays[weightPeriod])
  const visibleWeightLogs = [...filteredWeightLogs].reverse()
  const recentWeightLogs = visibleWeightLogs.slice(0, 3)
  const displayWeight = (log) => Math.round(convertWeight(log.weight, log.unit || profile?.unit_preference || 'kg', profile?.unit_preference || 'kg') * 10) / 10

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
                onClick={() => switchTheme(t.id)}
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
      </div>

      {editing ? (
        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name} onChange={e => { setSaveError(''); setForm(f => ({ ...f, full_name: e.target.value })) }} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username} onChange={e => { setSaveError(''); setForm(f => ({ ...f, username: e.target.value })) }} placeholder="@username" />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" value={form.age} onChange={e => { setSaveError(''); setForm(f => ({ ...f, age: e.target.value })) }} placeholder="25" />
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
      />
      <div>
        <button className="signout-btn" onClick={signOut}>Sign Out</button>
      </div>

      {themeToast && (
        <div className="theme-toast-overlay">
          <div className="theme-toast-modal">
            <div className="theme-toast-msg">Preferred colour set to <strong>{themeToast}</strong></div>
            <button className="theme-toast-ok" onClick={() => setThemeToast(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}
