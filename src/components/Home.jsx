import { useState, useEffect, useEffectEvent } from 'react'
import { supabase } from '../lib/supabase'
import { getCached, getStartupSnapshot, invalidateCache, setCached, setStartupSnapshot } from '../lib/cache'
import LoadingSpinner from './LoadingSpinner'
import WorkoutDayDetail from './profile/WorkoutDayDetail'
import BodyWeightDetail from './profile/BodyWeightDetail'
import WorkoutCalendar from './profile/WorkoutCalendar'
import WeightChart from './profile/WeightChart'
import { DEFAULT_BODYWEIGHT_KG, convertWeight, getProfileBodyweightKg, getSetVolumeInUnit } from '../lib/liftMath'
import '../styles/Home.css'

const BODY_WEIGHT_CHART_UNIT_KEY = 'bodyWeightChartUnitOverride'
const HOME_STARTUP_SNAPSHOT_TTL_MS = 15 * 60 * 1000

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function todayStr() {
  return localDate()
}

function formatWeightLogLabel(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function loadStoredBodyWeightChartUnit() {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(BODY_WEIGHT_CHART_UNIT_KEY)
    return stored === 'kg' || stored === 'lbs' ? stored : null
  } catch {
    return null
  }
}

function getCalendarMonthCacheKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  return `cal_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function Home({ userId, splashDone, introMotionReady, useStartupSnapshot = false, onNavigate, onWorkoutStreakChange, onInitialReady }) {
  const [profile, setProfile]         = useState(null)
  const [todayNut, setTodayNut]       = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, goal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 })
  const [lastWorkout, setLastWorkout] = useState(null)
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading]         = useState(true)
  const [showWeightDetail, setShowWeightDetail] = useState(false)
  const [weightSheetUnit, setWeightSheetUnit] = useState(() => loadStoredBodyWeightChartUnit())
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [bwError, setBwError] = useState('')
  const [weightPeriod, setWeightPeriod] = useState('all')
  const [weightDeleteTargetId, setWeightDeleteTargetId] = useState(null)
  const [weightDeletingId, setWeightDeletingId] = useState(null)
  const [weightDeleteError, setWeightDeleteError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null) // { sessionIds, dateStr }
  const [isPhoneWidth, setIsPhoneWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  ))
  const [barsAnimatedIn, setBarsAnimatedIn] = useState(false)
  const [animReady, setAnimReady] = useState(false)
  const firstEntryWidgetHold = splashDone && !introMotionReady
  const widgetAnimationReady = animReady && !firstEntryWidgetHold

  useEffect(() => {
    const onResize = () => setIsPhoneWidth(window.innerWidth <= 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const contentNode = document.querySelector('.content')
    if (!(contentNode instanceof HTMLElement)) return undefined

    const shouldLockHomeScroll = isPhoneWidth && !selectedDay && !showWeightDetail
    contentNode.classList.toggle('content-home-locked', shouldLockHomeScroll)

    return () => {
      contentNode.classList.remove('content-home-locked')
    }
  }, [isPhoneWidth, selectedDay, showWeightDetail])

  function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
    setSelectedDay({ sessionIds: remainingSessionIds, dateStr })
    setLoading(true)
    load()
  }

  function applyData({ prof, nutLogs, latestWorkout, allSessions, weightLogs: logs }) {
    setProfile(prof)
    setWeightLogs(logs || [])

    const calGoal  = prof?.calories_goal || 2000
    const protGoal = prof?.protein_goal  || 150
    const carbGoal = prof?.carbs_goal    || 200
    const fatGoal  = prof?.fat_goal      || 65

    if (nutLogs?.length) {
      setTodayNut({
        calories: nutLogs.reduce((s, l) => s + (l.calories || 0), 0),
        protein:  nutLogs.reduce((s, l) => s + (l.protein  || 0), 0),
        carbs:    nutLogs.reduce((s, l) => s + (l.carbs    || 0), 0),
        fat:      nutLogs.reduce((s, l) => s + (l.fat      || 0), 0),
        goal: calGoal, proteinGoal: protGoal, carbsGoal: carbGoal, fatGoal: fatGoal,
      })
    } else {
      setTodayNut({ calories: 0, protein: 0, carbs: 0, fat: 0, goal: calGoal, proteinGoal: protGoal, carbsGoal: carbGoal, fatGoal: fatGoal })
    }

    // Streak
    const allDates = new Set(allSessions?.map(s => localDate(new Date(s.started_at))) || [])
    let streak = 0
    const cursor = new Date()
    // If no workout today, start counting from yesterday
    if (!allDates.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (allDates.has(localDate(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    setWorkoutStreak(streak)

    // Last workout — sets already nested, no extra query needed
    if (latestWorkout) {
      const last = latestWorkout
      const sets = last.workout_sets || []
      if (sets.length) {
        const exMap = {}
        sets.forEach(s => { exMap[s.exercises.name] = true })
        const bodyweightKg = getProfileBodyweightKg(prof, DEFAULT_BODYWEIGHT_KG)
        const totalVolume = sets.reduce((sum, set) => (
          sum + getSetVolumeInUnit({
            weight: set.weight,
            reps: set.reps,
            unit: set.unit,
            equipment: set.exercises?.equipment,
            bodyweightKg,
          }, prof?.unit_preference || 'kg')
        ), 0)
        const mins = last.finished_at
          ? Math.round((new Date(last.finished_at) - new Date(last.started_at)) / 60000)
          : null
        setLastWorkout({
          date: localDate(new Date(last.started_at)),
          duration: mins,
          exercises: Object.keys(exMap),
          totalSets: sets.length,
          totalVolume,
        })
        return
      }
    }

    setLastWorkout(null)
  }

  async function load() {
    const today = todayStr()
    const cacheKey = 'home'
    const cacheVersion = 4

    const cached = getCached(cacheKey)
    if (cached?.version === cacheVersion) {
      applyData(cached)
      setLoading(false)
      return
    }

    if (useStartupSnapshot) {
      const storedSnapshot = getStartupSnapshot(cacheKey)
      if (storedSnapshot?.version === cacheVersion) {
        setCached(cacheKey, storedSnapshot)
        applyData(storedSnapshot)
        setLoading(false)
      }
    }

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const [
      { data: prof },
      { data: nutLogs },
      { data: latestWorkout },
      { data: allSessions },
      { data: weightLogs },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('full_name, username, calories_goal, protein_goal, carbs_goal, fat_goal, unit_preference, bodyweight')
        .eq('id', userId).single(),
      supabase.from('nutrition_logs')
        .select('calories, protein, carbs, fat')
        .eq('user_id', userId).eq('log_date', today),
      supabase.from('workout_sessions')
        .select('id, started_at, finished_at, workout_sets(weight, reps, unit, exercises(name, equipment))')
        .eq('user_id', userId)
        .not('finished_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('workout_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .not('finished_at', 'is', null)
        .gte('started_at', oneYearAgo.toISOString()),
      supabase.from('body_weight_logs')
        .select('id, weight, unit, logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: true }),
    ])

    const result = {
      version: cacheVersion,
      prof,
      nutLogs,
      latestWorkout,
      allSessions,
      weightLogs: weightLogs?.map(log => ({
        id: log.id,
        weight: log.weight,
        unit: log.unit,
        date: log.logged_at.slice(0, 10),
        loggedAt: log.logged_at,
      })) || [],
      today,
    }
    setCached('home', result)
    setStartupSnapshot(cacheKey, result, HOME_STARTUP_SNAPSHOT_TTL_MS)
    applyData(result)
    setLoading(false)
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    onWorkoutStreakChange?.(workoutStreak)
  }, [onWorkoutStreakChange, workoutStreak])

  useEffect(() => {
    if (loading) return
    onInitialReady?.()
  }, [loading, onInitialReady])

  useEffect(() => {
    if (!splashDone) return
    const t = setTimeout(() => setAnimReady(true), 80)
    return () => clearTimeout(t)
  }, [splashDone])

  useEffect(() => {
    if (loading || !widgetAnimationReady || selectedDay || showWeightDetail) {
      setBarsAnimatedIn(false)
      return undefined
    }

    setBarsAnimatedIn(false)
    const timer = setTimeout(() => setBarsAnimatedIn(true), 120)
    return () => clearTimeout(timer)
  }, [loading, widgetAnimationReady, selectedDay, showWeightDetail, todayNut.calories, todayNut.protein, todayNut.carbs, todayNut.fat])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (weightSheetUnit === 'kg' || weightSheetUnit === 'lbs') {
        window.localStorage.setItem(BODY_WEIGHT_CHART_UNIT_KEY, weightSheetUnit)
      } else {
        window.localStorage.removeItem(BODY_WEIGHT_CHART_UNIT_KEY)
      }
    } catch {
      // Ignore storage failures and keep the in-memory override.
    }
  }, [weightSheetUnit])

  async function logWeightFromHome() {
    const val = parseFloat(bwInput)
    if (!val || val <= 0 || bwSaving) return

    setBwSaving(true)
    setBwError('')

    const unit = weightSheetUnit || profile?.unit_preference || 'kg'
    const profileUnit = profile?.unit_preference || unit
    const timestamp = new Date().toISOString()
    const nextBodyweight = Math.round(convertWeight(val, unit, profileUnit) * 10) / 10

    const [{ data: inserted, error: insertError }, { error: profileError }] = await Promise.all([
      supabase
        .from('body_weight_logs')
        .insert({ user_id: userId, weight: val, unit, logged_at: timestamp })
        .select('id, weight, unit, logged_at')
        .single(),
      supabase.from('profiles').update({ bodyweight: nextBodyweight }).eq('id', userId),
    ])

    if (insertError || profileError) {
      setBwSaving(false)
      setBwError(insertError?.message || profileError?.message || 'Could not save your body weight.')
      return
    }

    invalidateCache('profile', 'ranks', 'home', getCalendarMonthCacheKey(timestamp))
    setProfile(current => current ? { ...current, bodyweight: nextBodyweight } : current)
    setWeightLogs(prev => [...prev, inserted ? {
      id: inserted.id,
      weight: inserted.weight,
      unit: inserted.unit,
      date: inserted.logged_at.slice(0, 10),
      loggedAt: inserted.logged_at,
    } : {
      id: timestamp,
      weight: val,
      unit,
      date: timestamp.slice(0, 10),
      loggedAt: timestamp,
    }])
    setBwInput('')
    setBwSaving(false)
  }

  async function deleteWeightLog(logId) {
    if (!logId || weightDeletingId) return

    setWeightDeletingId(logId)
    setWeightDeleteError('')

    const removedLog = weightLogs.find(log => log.id === logId)
    const remainingLogs = weightLogs.filter(log => log.id !== logId)
    const latestRemainingLog = remainingLogs.at(-1)
    const nextBodyweight = latestRemainingLog
      ? convertWeight(latestRemainingLog.weight, latestRemainingLog.unit || profile?.unit_preference || 'kg', profile?.unit_preference || 'kg')
      : null

    const [{ error: deleteError }, { error: profileError }] = await Promise.all([
      supabase.from('body_weight_logs').delete().eq('id', logId),
      supabase.from('profiles').update({ bodyweight: nextBodyweight }).eq('id', userId),
    ])

    if (deleteError || profileError) {
      setWeightDeletingId(null)
      setWeightDeleteError(deleteError?.message || profileError?.message || 'Could not delete this weight log.')
      return
    }

    invalidateCache('profile', 'ranks', 'home', getCalendarMonthCacheKey(removedLog?.loggedAt || removedLog?.date || new Date()))
    setWeightLogs(remainingLogs)
    setProfile(current => current ? { ...current, bodyweight: nextBodyweight } : current)
    setWeightDeletingId(null)
    setWeightDeleteTargetId(null)
  }

  const today     = todayStr()

  function fmtDate(dateStr) {
    const diff = Math.round((new Date(today + 'T12:00:00') - new Date(dateStr + 'T12:00:00')) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const calPct = Math.min(1, todayNut.calories / todayNut.goal)
  const calBarWidth = `${barsAnimatedIn ? calPct * 100 : 0}%`
  const activeWeightUnit = weightSheetUnit || profile?.unit_preference || 'kg'
  const recentWeightDelta = weightLogs.length >= 2
    ? convertWeight(weightLogs.at(-1)?.weight ?? 0, weightLogs.at(-1)?.unit || activeWeightUnit, activeWeightUnit)
      - convertWeight(weightLogs.at(-2)?.weight ?? 0, weightLogs.at(-2)?.unit || activeWeightUnit, activeWeightUnit)
    : null
  const homeChartHeight = isPhoneWidth ? 162 : 388
  const homeChartTickCount = 5
  const homeChartPadding = isPhoneWidth ? 'tight-mobile' : 'tight'
  const macroRingItems = [
    { label: 'Protein', val: todayNut.protein, goal: todayNut.proteinGoal, color: '#3b9eff' },
    { label: 'Carbs', val: todayNut.carbs, goal: todayNut.carbsGoal, color: '#a855f7' },
    { label: 'Fat', val: todayNut.fat, goal: todayNut.fatGoal, color: '#f97316' },
  ]
  const periodDays = { '1w': 7, '1m': 30, '1y': 365 }
  const now = new Date()
  const filteredWeightLogs = weightPeriod === 'all'
    ? weightLogs
    : weightLogs.filter(d => (now - new Date(d.date)) / 86400000 <= periodDays[weightPeriod])
  const visibleWeightLogs = [...filteredWeightLogs].reverse()
  const recentWeightLogs = visibleWeightLogs.slice(0, 3)
  const displayWeight = (log) => Math.round(convertWeight(log.weight, log.unit || activeWeightUnit, activeWeightUnit) * 10) / 10
  const displayCurrentBodyweight = profile?.bodyweight !== null && profile?.bodyweight !== undefined
    ? Math.round(convertWeight(profile.bodyweight, profile?.unit_preference || activeWeightUnit, activeWeightUnit) * 10) / 10
    : null
  const calendarRefreshKey = `${weightLogs.length}:${weightLogs.at(-1)?.loggedAt || ''}:${todayNut.calories}:${todayNut.protein}:${todayNut.carbs}:${todayNut.fat}`

  if (loading) return <LoadingSpinner fullPage />

  if (selectedDay) {
    return (
      <WorkoutDayDetail
        sessionIds={selectedDay.sessionIds}
        dateStr={selectedDay.dateStr}
        onDeleteWorkout={handleDeletedWorkout}
        onRefresh={() => {
          setLoading(true)
          load()
        }}
        onBack={() => setSelectedDay(null)}
      />
    )
  }

  if (showWeightDetail) {
    return (
      <BodyWeightDetail
        onBack={() => {
          setShowWeightDetail(false)
          setBwError('')
          setWeightDeleteError('')
          setWeightDeleteTargetId(null)
        }}
        currentWeight={displayCurrentBodyweight}
        activeUnit={activeWeightUnit}
        inputValue={bwInput}
        onInputChange={setBwInput}
        onUnitChange={setWeightSheetUnit}
        onLog={logWeightFromHome}
        saving={bwSaving}
        error={bwError}
        weightPeriod={weightPeriod}
        onPeriodChange={setWeightPeriod}
        filteredWeightLogs={filteredWeightLogs}
        chartHeight={isPhoneWidth ? 232 : 260}
        recentWeightLogs={recentWeightLogs}
        displayWeight={displayWeight}
        deleteTargetId={weightDeleteTargetId}
        onToggleDelete={(nextId) => {
          setWeightDeleteTargetId(nextId)
          setWeightDeleteError('')
        }}
        deleteError={weightDeleteError}
        deletingId={weightDeletingId}
        onDeleteWeightLog={deleteWeightLog}
        formatWeightLogLabel={formatWeightLogLabel}
      />
    )
  }

  return (
    <div className={`home-screen${animReady ? ' home-screen--ready' : ''}`}>

      {/* ── Today snapshot ── */}
      <div className="home-today-col">
        <div className="home-today-card home-today-card-clickable home-today-card-full" onClick={() => onNavigate?.('nutrition')}>
          <div className="home-today-card-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="12" rx="10" ry="4"/>
              <path d="M2 12c0 4.42 4.48 8 10 8s10-3.58 10-8"/>
              <path d="M2 12c0-1.5 1.5-3 4-4"/>
            </svg>
            <span>Nutrition</span>
          </div>
          <div className="home-nut-top">
            <div>
              <div className="home-today-val">{Math.round(todayNut.calories)}</div>
              <div className="home-today-sub">of {todayNut.goal} kcal</div>
            </div>
          </div>
          <div className="home-today-bar home-today-bar-compact">
            <div className="home-today-bar-fill" style={{ width: calBarWidth, background: calPct >= 1 ? '#22c55e' : 'var(--blue)' }} />
          </div>
          <div className="home-macro-bars home-macro-bars-compact">
            {macroRingItems.map(m => (
              <div key={m.label} className="home-macro-row">
                <div className="home-macro-meta">
                  <span className="home-macro-label" style={{ color: m.color }}>{m.label}</span>
                  <span className="home-macro-right">
                    <span className="home-macro-val" style={{ color: m.color }}>{Math.round(m.val)}g</span>
                    <span className="home-macro-goal"> / {m.goal}g</span>
                  </span>
                </div>
                <div className="home-macro-track">
                  <div className="home-macro-fill" style={{ width: `${barsAnimatedIn ? Math.min(100, (m.val / m.goal) * 100) : 0}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="home-insights-grid">
        <div className="home-section home-section-weight">
          <div
            className="home-weight-card home-weight-card-clickable"
            onClick={() => {
              setBwInput('')
              setBwError('')
              setWeightDeleteError('')
              setWeightDeleteTargetId(null)
              setShowWeightDetail(true)
            }}
          >
            <div className="home-weight-cap">
              <span className="home-weight-cap-label">Body Weight</span>
            </div>
            <div className="home-weight-header">
              {recentWeightDelta !== null && (
                <div className={`home-weight-chip ${recentWeightDelta === 0 ? 'neutral' : recentWeightDelta > 0 ? 'up' : 'down'}`}>
                  {recentWeightDelta > 0 ? '+' : ''}{recentWeightDelta.toFixed(1)} {activeWeightUnit}
                </div>
              )}
            </div>
            {weightLogs.length > 0
              ? <div className="home-weight-chart-wrap">
                  <WeightChart
                    data={weightLogs}
                    unit={activeWeightUnit}
                    height={homeChartHeight}
                    tickCount={homeChartTickCount}
                    padding={homeChartPadding}
                    animationReady={widgetAnimationReady}
                  />
                </div>
              : <div className="home-chart-empty">No weight history yet</div>}
          </div>
        </div>

        <div className="home-section home-section-calendar">
          <WorkoutCalendar
            compact
            variant="hybrid"
            visualLoading={firstEntryWidgetHold}
            refreshKey={calendarRefreshKey}
            onDayClick={(sessionIds, dateStr) => setSelectedDay({ sessionIds, dateStr })}
          />
        </div>
      </div>

      {/* ── Last workout ── */}
      {lastWorkout && (
        <div className="home-section">
          <div className="home-section-title">Last Workout</div>
          <div className="home-last-workout">
            <div className="home-lw-top">
              <span className="home-lw-date">{fmtDate(lastWorkout.date)}</span>
              <span className="home-lw-duration">{lastWorkout.duration} min</span>
            </div>
            <div className="home-lw-stats">
              <div className="home-lw-stat">
                <div className="home-lw-stat-val">{lastWorkout.exercises.length}</div>
                <div className="home-lw-stat-label">Exercises</div>
              </div>
              <div className="home-lw-stat">
                <div className="home-lw-stat-val">{lastWorkout.totalSets}</div>
                <div className="home-lw-stat-label">Sets</div>
              </div>
              <div className="home-lw-stat">
                <div className="home-lw-stat-val">
                  {lastWorkout.totalVolume >= 1000
                    ? `${(lastWorkout.totalVolume / 1000).toFixed(1)}k`
                    : lastWorkout.totalVolume.toFixed(0)}
                  <span style={{ fontSize: '12px', fontWeight: 400, marginLeft: 2 }}>{profile?.unit_preference || 'kg'}</span>
                </div>
                <div className="home-lw-stat-label">Volume</div>
              </div>
            </div>
            {lastWorkout.exercises.length > 0 && (
              <div className="home-lw-exercises">
                {lastWorkout.exercises.slice(0, 4).join(' · ')}
                {lastWorkout.exercises.length > 4 ? ` +${lastWorkout.exercises.length - 4} more` : ''}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
