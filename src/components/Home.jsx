import { useState, useEffect, useEffectEvent } from 'react'
import { supabase } from '../lib/supabase'
import { getCached, getStartupSnapshot, invalidateCache, setCached, setStartupSnapshot } from '../lib/cache'
import LoadingSpinner from './LoadingSpinner'
import WorkoutDayDetail from './profile/WorkoutDayDetail'
import BodyWeightDetail from './profile/BodyWeightDetail'
import WorkoutCalendar from './profile/WorkoutCalendar'
import WeightChart from './profile/WeightChart'
import { convertWeight } from '../lib/liftMath'
import '../styles/Home.css'

const BODY_WEIGHT_CHART_UNIT_KEY = 'bodyWeightChartUnitOverride'
const BODY_WEIGHT_CHART_PERIOD_KEY = 'bodyWeightChartPeriod'

function loadStoredBodyWeightChartPeriod() {
  if (typeof window === 'undefined') return 'all'
  try {
    const stored = window.localStorage.getItem(BODY_WEIGHT_CHART_PERIOD_KEY)
    return ['1w', '1m', '1y', 'all'].includes(stored) ? stored : 'all'
  } catch {
    return 'all'
  }
}
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

let ghostChartHasPlayed = false
let barGlowHasPlayed = false

export default function Home({ userId, splashDone, introMotionReady, useStartupSnapshot = false, onNavigate, onWorkoutStreakChange, onInitialReady, weightRefreshTick = 0 }) {
  const [profile, setProfile]         = useState(null)
  const [todayNut, setTodayNut]       = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, goal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 })
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [weightLogs, setWeightLogs] = useState([])
  const [ghostChartPhase, setGhostChartPhase] = useState('idle') // 'idle' | 'drawing' | 'erasing' | 'done'
  const [appReturnTick, setAppReturnTick] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [showWeightDetail, setShowWeightDetail] = useState(false)
  const [weightSheetUnit, setWeightSheetUnit] = useState(() => loadStoredBodyWeightChartUnit())
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [bwError, setBwError] = useState('')
  const [weightPeriod, setWeightPeriod] = useState(() => loadStoredBodyWeightChartPeriod())
  const [weightDeleteTargetId, setWeightDeleteTargetId] = useState(null)
  const [weightDeletingId, setWeightDeletingId] = useState(null)
  const [weightDeleteError, setWeightDeleteError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null) // { sessionIds, dateStr }
  const [isPhoneWidth, setIsPhoneWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  ))
  const nutEmpty = todayNut.calories === 0 && todayNut.protein === 0 && todayNut.carbs === 0 && todayNut.fat === 0
  const [barsAnimatedIn, setBarsAnimatedIn] = useState(false)
  const [barGlowActive, setBarGlowActive] = useState(false)
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

  function applyData({ prof, nutLogs, allSessions, weightLogs: logs }) {
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

    const sortedWorkoutDays = [...new Set((allSessions || []).map(session => localDate(new Date(session.started_at))))]
      .map(dateStr => new Date(`${dateStr}T12:00:00`))
      .sort((a, b) => b - a)

    let streak = 0
    if (sortedWorkoutDays.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysSinceLatestWorkout = Math.floor((today - sortedWorkoutDays[0]) / 86400000)

      if (daysSinceLatestWorkout <= 3) {
        streak = 1
        for (let index = 1; index < sortedWorkoutDays.length; index += 1) {
          const gapDays = Math.floor((sortedWorkoutDays[index - 1] - sortedWorkoutDays[index]) / 86400000) - 1
          if (gapDays > 3) break
          streak += 1
        }
      }
    }

    setWorkoutStreak(streak)
  }

  async function load() {
    const today = todayStr()
    const cacheKey = 'home'
    const cacheVersion = 5

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
    ghostChartHasPlayed = false
    barGlowHasPlayed = false
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [userId])

  useEffect(() => {
    if (weightRefreshTick === 0) return
    loadLatest()
  }, [weightRefreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [loading, widgetAnimationReady, selectedDay, showWeightDetail, todayNut.calories, todayNut.protein, todayNut.carbs, todayNut.fat, appReturnTick])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ghostChartHasPlayed = false
        barGlowHasPlayed = false
        setAppReturnTick(t => t + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (loading || !widgetAnimationReady || weightLogs.length > 0 || ghostChartHasPlayed) return
    ghostChartHasPlayed = true
    setGhostChartPhase('drawing')
    const eraseTimer = setTimeout(() => setGhostChartPhase('erasing'), 1200)
    const doneTimer  = setTimeout(() => setGhostChartPhase('done'), 2800)
    return () => { clearTimeout(eraseTimer); clearTimeout(doneTimer) }
  }, [loading, widgetAnimationReady, weightLogs.length, appReturnTick])

  useEffect(() => {
    if (loading || !widgetAnimationReady || !nutEmpty || barGlowHasPlayed) return
    barGlowHasPlayed = true
    setBarGlowActive(true)
    const t = setTimeout(() => setBarGlowActive(false), 1500)
    return () => clearTimeout(t)
  }, [loading, widgetAnimationReady, nutEmpty, appReturnTick])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(BODY_WEIGHT_CHART_PERIOD_KEY, weightPeriod)
    } catch {
      // ignore
    }
  }, [weightPeriod])

  async function logWeightFromHome() {
    const val = parseFloat(bwInput)
    const unit = weightSheetUnit || profile?.unit_preference || 'kg'
    if (!val || val <= 0 || bwSaving) return
    if (convertWeight(val, unit, 'kg') > 600) { setBwError('Weight cannot exceed 600 kg.'); return }

    setBwSaving(true)
    setBwError('')
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

  const calPct = Math.min(1, todayNut.calories / todayNut.goal)
  const calBarWidth = `${barsAnimatedIn ? calPct * 100 : 0}%`
  const activeWeightUnit = weightSheetUnit || profile?.unit_preference || 'kg'
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
  const recentWeightDelta = filteredWeightLogs.length >= 2
    ? convertWeight(filteredWeightLogs.at(-1)?.weight ?? 0, filteredWeightLogs.at(-1)?.unit || activeWeightUnit, activeWeightUnit)
      - convertWeight(filteredWeightLogs[0]?.weight ?? 0, filteredWeightLogs[0]?.unit || activeWeightUnit, activeWeightUnit)
    : null
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
          <div className={`home-today-bar home-today-bar-compact${barGlowActive ? ' home-macro-track-glow' : ''}`} style={barGlowActive ? { '--glow-color': 'var(--blue)' } : undefined}>
            <div className="home-today-bar-fill" style={{ width: calBarWidth, background: calPct >= 1 ? '#22c55e' : 'var(--blue)' }} />
          </div>
          <div className="home-macro-bars home-macro-bars-compact">
            {macroRingItems.map((m) => (
              <div key={m.label} className="home-macro-row">
                <div className="home-macro-meta">
                  <span className="home-macro-label" style={{ color: m.color }}>{m.label}</span>
                  <span className="home-macro-right">
                    <span className="home-macro-val" style={{ color: m.color }}>{Math.round(m.val)}g</span>
                    <span className="home-macro-goal"> / {m.goal}g</span>
                  </span>
                </div>
                <div
                  className={`home-macro-track${barGlowActive ? ' home-macro-track-glow' : ''}`}
                  style={barGlowActive ? { '--glow-color': m.color } : undefined}
                >
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
              <span className="home-weight-cap-sublabel">Tap to expand</span>
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
                    data={filteredWeightLogs}
                    unit={activeWeightUnit}
                    height={homeChartHeight}
                    tickCount={homeChartTickCount}
                    padding={homeChartPadding}
                    animationReady={widgetAnimationReady}
                  />
                </div>
              : <div className="home-chart-empty">
                  {/* Ghost chart skeleton — matches real chart paddings */}
                  <svg className="home-chart-ghost" viewBox="0 0 300 162" width="100%" height={homeChartHeight} style={{ display: 'block' }}>
                    {/* Ghost polyline — realistic weight trend with natural variation */}
                    <polyline
                      className={`home-chart-ghost-path home-chart-ghost-path--${ghostChartPhase}`}
                      points="30,118 55,124 80,110 105,115 130,100 155,88 175,92 200,75 225,68 250,58 275,45 292,38"
                      fill="none"
                      stroke="var(--blue)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset="1"
                    />
                  </svg>
                  <div className={`home-chart-empty-label${ghostChartPhase === 'done' || (ghostChartHasPlayed && ghostChartPhase === 'idle') ? ' home-chart-empty-label--visible' : ''}`}>
                    <span>No weight history yet</span>
                    <span className="home-chart-empty-sublabel">Tap here or use the + button to add an entry</span>
                  </div>
                </div>}
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

    </div>
  )
}
