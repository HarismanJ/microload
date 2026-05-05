import { useState, useEffect, useEffectEvent, useLayoutEffect, useRef, useMemo } from 'react'
import { useFocusTrap } from '../lib/useFocusTrap'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { getCached, getCalendarMonthCacheKey, getStartupSnapshot, invalidateCache, setCached, setStartupSnapshot } from '../lib/cache'
import { DEFAULT_HOME_WEIGHT_PERIOD, filterByChartPeriod } from '../lib/chartPeriods'
import { WEIGHT_TREND_PRESETS, getPresetRate } from '../lib/weightTrend'
import LoadingSpinner from './LoadingSpinner'
import WorkoutDayDetail from './profile/WorkoutDayDetail'
import BodyWeightDetail from './profile/BodyWeightDetail'
import WorkoutCalendar from './profile/WorkoutCalendar'
import WeightChart from './profile/WeightChart'
import { convertWeight } from '../lib/liftMath'
import { VALIDATION_LIMITS, validateBodyweight, validateNumber } from '../lib/inputValidation'
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


const BURN_R = 40
const BURN_C = 2 * Math.PI * BURN_R

let ghostChartHasPlayed = false
let nutGlowHasPlayed = false
let burnGlowHasPlayed = false
let lastHomeUserId = null

export default function Home({ userId, splashDone, introMotionReady, useStartupSnapshot = false, onNavigate, onWorkoutStreakChange, onInitialReady, weightRefreshTick = 0, workoutRefreshTick = 0, onWorkoutDeleted }) {
  const [profile, setProfile]         = useState(null)
  const [todayNut, setTodayNut]       = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, goal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 })
  const [workoutStreak, setWorkoutStreak] = useState(0)
  const [weightLogs, setWeightLogs] = useState([])
  const [ghostChartPhase, setGhostChartPhase] = useState('idle') // 'idle' | 'drawing' | 'erasing' | 'done'
  const [appReturnTick, setAppReturnTick] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState(false)
  const [showWeightDetail, setShowWeightDetail] = useState(false)
  const [weightSheetUnit, setWeightSheetUnit] = useState(() => loadStoredBodyWeightChartUnit())
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [bwError, setBwError] = useState('')
  const [weightPeriod, setWeightPeriod] = useState(DEFAULT_HOME_WEIGHT_PERIOD)
  const [showTrendLine, setShowTrendLine] = useState(() => {
    try { return localStorage.getItem('bw_trend_line') === 'true' } catch { return false }
  })
  const [goalWeightKg, setGoalWeightKg] = useState(null)
  const [goalInput, setGoalInput] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)
  const [showGoalLine, setShowGoalLine] = useState(() => {
    try {
      const stored = localStorage.getItem('bw_goal_line')
      return stored !== null ? stored === 'true' : false
    } catch { return false }
  })
  const [trendModeConfig, setTrendModeConfig] = useState(null)
  const [trendModeInput, setTrendModeInput] = useState('')
  const [trendRateInput, setTrendRateInput] = useState('')
  const [trendModeSaving, setTrendModeSaving] = useState(false)
  const [showTrendMode, setShowTrendMode] = useState(() => {
    try { return localStorage.getItem('bw_pace_line') === 'true' } catch { return false }
  })
  const [trendDatePickerOpen, setTrendDatePickerOpen] = useState(false)
  const [trendDatePickerValue, setTrendDatePickerValue] = useState('')
  const [pendingTrendRate, setPendingTrendRate] = useState(null)
  const [weightDeleteTargetId, setWeightDeleteTargetId] = useState(null)
  const [weightDeletingId, setWeightDeletingId] = useState(null)
  const [weightDeleteError, setWeightDeleteError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null) // { sessionIds, dateStr }
  const appWasBackgroundedRef = useRef(false)
  const burnSheetJustOpenedRef = useRef(false)
  const [, setCalendarInitialReady] = useState(false)
  const [isPhoneWidth, setIsPhoneWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  ))
  const [burnedToday, setBurnedToday] = useState(0)
  const [burnGoal, setBurnGoal] = useState(null)
  const [burnGoalSheetOpen, setBurnGoalSheetOpen] = useState(false)
  const [burnGoalInput, setBurnGoalInput] = useState('')
  const [burnGoalError, setBurnGoalError] = useState('')
  const [burnGoalSaving, setBurnGoalSaving] = useState(false)
  const burnGoalModalRef = useRef(null)
  useFocusTrap(burnGoalModalRef, { active: burnGoalSheetOpen, onEscape: () => setBurnGoalSheetOpen(false) })
  const nutEmpty = todayNut.calories === 0 && todayNut.protein === 0 && todayNut.carbs === 0 && todayNut.fat === 0
  const [barsAnimatedIn, setBarsAnimatedIn] = useState(false)
  const [nutGlowActive, setNutGlowActive] = useState(false)
  const [burnGlowActive, setBurnGlowActive] = useState(false)
  const [animReady, setAnimReady] = useState(false)
  const firstEntryWidgetHold = splashDone && !introMotionReady
  const widgetAnimationReady = animReady && !firstEntryWidgetHold

  useLayoutEffect(() => {
    if (lastHomeUserId !== userId) {
      lastHomeUserId = userId
      ghostChartHasPlayed = false
      nutGlowHasPlayed = false
      burnGlowHasPlayed = false
    }
  }, [userId])

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
    if (shouldLockHomeScroll) contentNode.scrollTop = 0

    return () => {
      contentNode.classList.remove('content-home-locked')
    }
  }, [isPhoneWidth, selectedDay, showWeightDetail])

  function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
    setSelectedDay({ sessionIds: remainingSessionIds, dateStr })
    setLoading(true)
    load()
    onWorkoutDeleted?.()
  }

  function applyData({ prof, nutLogs, allSessions, weightLogs: logs }) {
    setProfile(prof)
    setWeightLogs(logs || [])
    setBurnGoal(prof?.calories_burned_goal || null)

    const goalKg = prof?.weight_goal_kg ?? null
    setGoalWeightKg(goalKg)
    if (goalKg !== null) {
      const unit = prof?.unit_preference || 'kg'
      const goalInUnit = unit === 'lbs'
        ? Math.round(goalKg * 2.20462 * 10) / 10
        : Math.round(goalKg * 10) / 10
      setGoalInput(String(goalInUnit))
      try {
        if (localStorage.getItem('bw_goal_line') === null) setShowGoalLine(true)
      } catch {
        // localStorage is best-effort for this display preference.
      }
    }
    const trendMode = prof?.weight_trend_mode ?? null
    const trendRate = prof?.weight_trend_rate_kg_per_week ?? null
    const trendAnchorDate = prof?.weight_trend_anchor_date ?? null
    const trendAnchorWeightKg = prof?.weight_trend_anchor_weight_kg ?? null
    if (trendMode && trendRate !== null && trendAnchorDate && trendAnchorWeightKg !== null) {
      setTrendModeConfig({ rateKgPerWeek: trendRate, anchorDate: trendAnchorDate, anchorWeightKg: trendAnchorWeightKg })
      setTrendModeInput(trendMode)
      if (trendMode === 'custom') {
        const displayUnit = prof?.unit_preference || 'kg'
        setTrendRateInput(String(displayUnit === 'lbs'
          ? Math.round(trendRate * 2.20462 * 100) / 100
          : Math.round(trendRate * 100) / 100))
      }
    } else {
      setTrendModeConfig(null)
      setTrendModeInput('')
      setTrendRateInput('')
    }
    const todayForBurn = todayStr()
    const todayBurned = (allSessions || [])
      .filter(s => s.finished_at && localDate(new Date(s.finished_at)) === todayForBurn)
      .reduce((sum, s) => sum + (s.calories_burned || 0), 0)
    setBurnedToday(todayBurned)

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
        // Find the oldest workout still within the continuous streak window
        let oldestInWindow = sortedWorkoutDays[0]
        for (let index = 1; index < sortedWorkoutDays.length; index += 1) {
          const gapDays = Math.floor((sortedWorkoutDays[index - 1] - sortedWorkoutDays[index]) / 86400000) - 1
          if (gapDays > 3) break
          oldestInWindow = sortedWorkoutDays[index]
        }
        // Streak = calendar days from first workout in window to today (inclusive)
        const oldestMidnight = new Date(oldestInWindow)
        oldestMidnight.setHours(0, 0, 0, 0)
        streak = Math.floor((today - oldestMidnight) / 86400000) + 1
      }
    }

    setWorkoutStreak(streak)
  }

  async function load() {
    const today = todayStr()
    const cacheKey = 'home'
    const cacheVersion = 7
    setLoadError(false)

    try {
      const cached = getCached(cacheKey)
      if (cached?.version === cacheVersion && cached?.userId === userId) {
        applyData(cached)
        setLoading(false)
        return
      }

      if (useStartupSnapshot) {
        const storedSnapshot = getStartupSnapshot(cacheKey, userId)
        if (storedSnapshot?.version === cacheVersion && storedSnapshot?.userId === userId) {
          setCached(cacheKey, storedSnapshot)
          applyData(storedSnapshot)
          setLoading(false)
        }
      }

      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const [
        profileResponse,
        nutritionResponse,
        sessionsResponse,
        weightResponse,
      ] = await Promise.all([
        supabase.from('profiles')
          .select('full_name, username, calories_goal, protein_goal, carbs_goal, fat_goal, unit_preference, bodyweight, calories_burned_goal, gender, weight_goal_kg, weight_trend_mode, weight_trend_rate_kg_per_week, weight_trend_anchor_date, weight_trend_anchor_weight_kg')
          .eq('id', userId).single(),
        supabase.from('nutrition_logs')
          .select('calories, protein, carbs, fat')
          .eq('user_id', userId).eq('log_date', today),
        supabase.from('workout_sessions')
          .select('started_at, finished_at, calories_burned')
          .eq('user_id', userId)
          .not('finished_at', 'is', null)
          .gte('started_at', oneYearAgo.toISOString()),
        supabase.from('body_weight_logs')
          .select('id, weight, unit, logged_at')
          .eq('user_id', userId)
          .order('logged_at', { ascending: true }),
      ])

      const loadError = profileResponse.error
        || nutritionResponse.error
        || sessionsResponse.error
        || weightResponse.error
      if (loadError) throw loadError

      const result = {
        version: cacheVersion,
        userId,
        prof: profileResponse.data,
        nutLogs: nutritionResponse.data,
        allSessions: sessionsResponse.data,
        weightLogs: weightResponse.data?.map(log => ({
          id: log.id,
          weight: log.weight,
          unit: log.unit,
          date: log.logged_at.slice(0, 10),
          loggedAt: log.logged_at,
        })) || [],
        today,
      }
      setCached('home', result)
      setStartupSnapshot(cacheKey, result, HOME_STARTUP_SNAPSHOT_TTL_MS, userId)
      applyData(result)
    } catch (error) {
      console.error('Home load failed:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    setCalendarInitialReady(false)
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [userId])

  useEffect(() => {
    if (weightRefreshTick === 0) return
    loadLatest()
  }, [weightRefreshTick])

  useEffect(() => {
    if (workoutRefreshTick === 0) return
    loadLatest()
  }, [workoutRefreshTick])

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
      if (document.visibilityState === 'hidden') {
        appWasBackgroundedRef.current = true
        return
      }

      if (document.visibilityState === 'visible' && appWasBackgroundedRef.current) {
        appWasBackgroundedRef.current = false
        ghostChartHasPlayed = false
        nutGlowHasPlayed = false
        burnGlowHasPlayed = false
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
    if (loading || !widgetAnimationReady || !nutEmpty || nutGlowHasPlayed) return
    nutGlowHasPlayed = true
    setNutGlowActive(true)
    const t = setTimeout(() => setNutGlowActive(false), 1500)
    return () => clearTimeout(t)
  }, [loading, widgetAnimationReady, nutEmpty, appReturnTick])

  useEffect(() => {
    if (loading || !widgetAnimationReady || burnedToday !== 0 || burnGlowHasPlayed) return
    burnGlowHasPlayed = true
    setBurnGlowActive(true)
    const t = setTimeout(() => setBurnGlowActive(false), 1500)
    return () => clearTimeout(t)
  }, [loading, widgetAnimationReady, burnedToday, appReturnTick])

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
    const unit = weightSheetUnit || profile?.unit_preference || 'kg'
    if (bwSaving) return
    const weightError = validateBodyweight(bwInput, unit)
    if (weightError) { setBwError(weightError); return }

    setBwSaving(true)
    setBwError('')
    const profileUnit = profile?.unit_preference || unit
    const timestamp = new Date().toISOString()
    const nextBodyweight = Math.round(convertWeight(val, unit, profileUnit) * 10) / 10

    try {
      const [{ data: inserted, error: insertError }, { error: profileError }] = await Promise.all([
        supabase
          .from('body_weight_logs')
          .insert({ user_id: userId, weight: val, unit, logged_at: timestamp })
          .select('id, weight, unit, logged_at')
          .single(),
        supabase.from('profiles').update({ bodyweight: nextBodyweight }).eq('id', userId),
      ])

      if (insertError || profileError || !inserted) throw (insertError || profileError || new Error('Could not save your body weight.'))

      invalidateCache('profile', 'ranks', 'home', getCalendarMonthCacheKey(timestamp))
      setProfile(current => current ? { ...current, bodyweight: nextBodyweight } : current)
      setWeightLogs(prev => [...prev, {
        id: inserted.id,
        weight: inserted.weight,
        unit: inserted.unit,
        date: inserted.logged_at.slice(0, 10),
        loggedAt: inserted.logged_at,
      }])
      setBwInput('')
    } catch (error) {
      setBwError(error?.message || 'Could not save your body weight.')
    } finally {
      setBwSaving(false)
    }
  }

  async function saveBurnGoal() {
    const val = parseInt(burnGoalInput, 10)
    if (!userId || burnGoalSaving) return
    const goalError = validateNumber(burnGoalInput, {
      label: 'Calories-burned goal',
      min: VALIDATION_LIMITS.caloriesBurnedGoalMin,
      max: VALIDATION_LIMITS.caloriesBurnedGoalMax,
      integer: true,
      required: true,
    })
    if (goalError) {
      setBurnGoalError(goalError)
      return
    }
    setBurnGoalSaving(true)
    setBurnGoalError('')
    try {
      const { error } = await supabase.from('profiles').update({ calories_burned_goal: val }).eq('id', userId)
      if (error) throw error
      setBurnGoal(val)
      setBurnGoalSheetOpen(false)
      invalidateCache('home', 'profile')
    } catch (error) {
      setBurnGoalError(error?.message || 'Could not save your calories-burned goal.')
    } finally {
      setBurnGoalSaving(false)
    }
  }

  async function saveGoalWeight() {
    if (goalSaving) return
    const trimmed = goalInput.trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)
    const unit = weightSheetUnit || profile?.unit_preference || 'kg'
    if (parsed !== null) {
      const goalError = validateBodyweight(goalInput, unit, { label: 'Goal weight' })
      if (goalError) { setBwError(goalError); return }
    }
    setGoalSaving(true)
    setBwError('')
    const goalKg = parsed === null ? null
      : (unit === 'lbs' ? parsed / 2.20462 : parsed)
    try {
      const { error } = await supabase.from('profiles').update({ weight_goal_kg: goalKg }).eq('id', userId)
      if (error) throw error
      setGoalWeightKg(goalKg)
      if (goalKg === null) {
        setGoalInput('')
        setShowGoalLine(false)
        try {
          localStorage.removeItem('bw_goal_line')
        } catch {
          // localStorage is best-effort for this display preference.
        }
      } else {
        try {
          if (localStorage.getItem('bw_goal_line') === null) {
            setShowGoalLine(true)
            localStorage.setItem('bw_goal_line', 'true')
          }
        } catch {
          // localStorage is best-effort for this display preference.
        }
      }
      invalidateCache('home', 'profile')
    } catch (error) {
      setBwError(error?.message || 'Could not save your goal weight.')
    } finally {
      setGoalSaving(false)
    }
  }

  function saveTrendMode() {
    if (trendModeSaving) return
    setBwError('')

    if (!trendModeInput) {
      clearTrendMode()
      return
    }

    let rateKgPerWeek
    if (trendModeInput === 'custom') {
      const parsed = parseFloat(trendRateInput)
      if (!Number.isFinite(parsed)) { setBwError('Enter a valid rate (e.g. 0.5 or -0.5).'); return }
      const unit = weightSheetUnit || profile?.unit_preference || 'kg'
      rateKgPerWeek = unit === 'lbs' ? parsed / 2.20462 : parsed
    } else {
      rateKgPerWeek = getPresetRate(trendModeInput) ?? 0
    }

    if (!weightLogs.length) { setBwError('Log at least one weigh-in before setting a pace.'); return }

    setPendingTrendRate(rateKgPerWeek)
    const defaultDate = weightLogs.at(-1)?.date
      || weightLogs.at(-1)?.loggedAt?.slice(0, 10)
      || new Date().toISOString().slice(0, 10)
    setTrendDatePickerValue(defaultDate)
    setTrendDatePickerOpen(true)
  }

  async function clearTrendMode() {
    setTrendModeSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        weight_trend_mode: null,
        weight_trend_rate_kg_per_week: null,
        weight_trend_anchor_date: null,
        weight_trend_anchor_weight_kg: null,
      }).eq('id', userId)
      if (error) throw error
      setTrendModeConfig(null)
      setShowTrendMode(false)
      try { localStorage.removeItem('bw_pace_line') } catch { /* best-effort */ }
      invalidateCache('home', 'profile')
    } catch (err) {
      setBwError(err?.message || 'Could not clear pace setting.')
    } finally {
      setTrendModeSaving(false)
    }
  }

  async function confirmTrendMode(selectedDate) {
    if (!selectedDate || pendingTrendRate === null) return
    setTrendModeSaving(true)
    setBwError('')
    try {
      const selectedMs = new Date(selectedDate + 'T23:59:59').getTime()
      const logsOnOrBefore = weightLogs.filter(log => {
        const ms = new Date(log.loggedAt || log.date + 'T12:00:00').getTime()
        return ms <= selectedMs
      })
      const anchorLog = logsOnOrBefore.at(-1) || weightLogs[0]
      const anchorWeightKg = anchorLog.unit === 'lbs'
        ? anchorLog.weight / 2.20462
        : anchorLog.weight

      const { error } = await supabase.from('profiles').update({
        weight_trend_mode: trendModeInput,
        weight_trend_rate_kg_per_week: pendingTrendRate,
        weight_trend_anchor_date: selectedDate,
        weight_trend_anchor_weight_kg: anchorWeightKg,
      }).eq('id', userId)
      if (error) throw error

      setTrendModeConfig({ rateKgPerWeek: pendingTrendRate, anchorDate: selectedDate, anchorWeightKg })
      setTrendDatePickerOpen(false)
      setPendingTrendRate(null)
      setShowTrendMode(true)
      try { localStorage.setItem('bw_pace_line', 'true') } catch { /* best-effort */ }
      invalidateCache('home', 'profile')
    } catch (err) {
      setBwError(err?.message || 'Could not save pace setting.')
    } finally {
      setTrendModeSaving(false)
    }
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

    try {
      const [{ error: deleteError }, { error: profileError }] = await Promise.all([
        supabase.from('body_weight_logs').delete().eq('id', logId),
        supabase.from('profiles').update({ bodyweight: nextBodyweight }).eq('id', userId),
      ])

      if (deleteError || profileError) throw (deleteError || profileError)

      invalidateCache('profile', 'ranks', 'home', getCalendarMonthCacheKey(removedLog?.loggedAt || removedLog?.date || new Date()))
      setWeightLogs(remainingLogs)
      setProfile(current => current ? { ...current, bodyweight: nextBodyweight } : current)
      setWeightDeleteTargetId(null)
    } catch (error) {
      setWeightDeleteError(error?.message || 'Could not delete this weight log.')
    } finally {
      setWeightDeletingId(null)
    }
  }

  const calPct = Math.min(1, todayNut.calories / todayNut.goal)
  const effectiveBurnGoal = burnGoal ?? 0
  const burnPct = effectiveBurnGoal > 0 ? Math.min(1, burnedToday / effectiveBurnGoal) : 0
  const burnComplete = burnedToday >= effectiveBurnGoal
  const burnDash = burnPct * BURN_C
  const calBarWidth = `${barsAnimatedIn ? calPct * 100 : 0}%`
  const activeWeightUnit = weightSheetUnit || profile?.unit_preference || 'kg'
  const homeChartHeight = isPhoneWidth ? 162 : 388
  const homeChartTickCount = 5
  const homeChartPadding = isPhoneWidth ? 'tight-mobile' : 'tight'

  const filteredWeightLogs = useMemo(() => {
    return filterByChartPeriod(weightLogs, weightPeriod, log => log.loggedAt || log.date)
  }, [weightLogs, weightPeriod])
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

  if (loadError && !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>Failed to load. Check your connection and try again.</p>
        <button
          onClick={() => { setLoading(true); load() }}
          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

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
        hasWeightLogs={weightLogs.length > 0}
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
        showTrend={showTrendLine}
        onToggleTrend={() => {
          const next = !showTrendLine
          setShowTrendLine(next)
          try {
            localStorage.setItem('bw_trend_line', String(next))
          } catch {
            // localStorage is best-effort for this display preference.
          }
        }}
        goalWeightKg={goalWeightKg}
        goalInput={goalInput}
        onGoalInputChange={setGoalInput}
        onSaveGoal={saveGoalWeight}
        goalSaving={goalSaving}
        showGoal={showGoalLine}
        onToggleGoal={() => {
          const next = !showGoalLine
          setShowGoalLine(next)
          try {
            localStorage.setItem('bw_goal_line', String(next))
          } catch {
            // localStorage is best-effort for this display preference.
          }
        }}
        trendModeConfig={trendModeConfig}
        trendModeInput={trendModeInput}
        onTrendModeInputChange={setTrendModeInput}
        trendRateInput={trendRateInput}
        onTrendRateInputChange={setTrendRateInput}
        onSaveTrendMode={saveTrendMode}
        trendModeSaving={trendModeSaving}
        trendDatePickerOpen={trendDatePickerOpen}
        trendDatePickerValue={trendDatePickerValue}
        onTrendDateChange={setTrendDatePickerValue}
        onTrendDateConfirm={confirmTrendMode}
        onTrendDateCancel={() => { setTrendDatePickerOpen(false); setPendingTrendRate(null) }}
        showTrendMode={showTrendMode}
        onToggleTrendMode={() => {
          const next = !showTrendMode
          setShowTrendMode(next)
          try {
            localStorage.setItem('bw_pace_line', String(next))
          } catch {
            // localStorage is best-effort for this display preference.
          }
        }}
      />
    )
  }

  return (
    <>
    <div className={`home-screen${animReady ? ' home-screen--ready' : ''}`}>

      {/* ── Today snapshot ── */}
      <div className="home-today-col">
        <div className="home-today-split">

          {/* Nutrition (left) */}
          <div className="home-today-card home-today-card-clickable" onClick={() => onNavigate?.('nutrition')}>
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
            <div className={`home-today-bar home-today-bar-compact${nutGlowActive ? ' home-macro-track-glow' : ''}`} style={nutGlowActive ? { '--glow-color': 'var(--blue)' } : undefined}>
              <div className="home-today-bar-fill" style={{ width: calBarWidth, background: calPct >= 1 ? '#22c55e' : 'var(--blue)' }} />
            </div>
            <div className="home-macro-bars home-macro-bars-compact">
              {[
                { label: 'Protein', val: todayNut.protein, goal: todayNut.proteinGoal },
                { label: 'Carbs', val: todayNut.carbs,   goal: todayNut.carbsGoal   },
                { label: 'Fat', val: todayNut.fat,      goal: todayNut.fatGoal     },
              ].map((m) => (
                <div key={m.label} className="home-macro-row">
                  <div className="home-macro-meta">
                    <span className="home-macro-label">{m.label}</span>
                    <span className="home-macro-right">
                      <span className="home-macro-val">{Math.round(m.val)}g</span>
                      <span className="home-macro-goal"> / {m.goal}g</span>
                    </span>
                  </div>
                  <div
                    className={`home-macro-track${nutGlowActive ? ' home-macro-track-glow' : ''}`}
                    style={nutGlowActive ? { '--glow-color': 'var(--blue)' } : undefined}
                  >
                    <div className="home-macro-fill" style={{ width: `${barsAnimatedIn ? Math.min(100, (m.val / m.goal) * 100) : 0}%`, background: 'var(--blue)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Burned (right) */}
          <div
            className="home-today-card home-today-card-clickable home-burned-widget"
            onClick={() => {
              setBurnGoalInput(burnGoal ? String(burnGoal) : '')
              burnSheetJustOpenedRef.current = true
              setBurnGoalSheetOpen(true)
              setTimeout(() => { burnSheetJustOpenedRef.current = false }, 300)
            }}
          >
            <div className="home-today-card-header">
              <span>Calories Burned</span>
            </div>
            <div className="home-burn-ring-wrap">
              <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true" className={burnGlowActive ? 'home-burn-ring-glow' : undefined}>
                <defs>
                  <linearGradient id="blg" x1="0" y1="0" x2="1" y2="1">
                    {!burnComplete && (
                      <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="4s" repeatCount="indefinite" />
                    )}
                    <stop offset="0%"   stopColor={burnComplete ? '#4ade80' : '#fbbf24'} />
                    <stop offset="40%"  stopColor={burnComplete ? '#22c55e' : '#f97316'} />
                    <stop offset="80%"  stopColor={burnComplete ? '#16a34a' : '#dc2626'} />
                    <stop offset="100%" stopColor={burnComplete ? '#4ade80' : '#fbbf24'} />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r={BURN_R} fill="none" stroke="var(--surface2)" strokeWidth="8" />
                <circle cx="50" cy="50" r={BURN_R} fill="none"
                  stroke="url(#blg)"
                  strokeWidth="8"
                  strokeDasharray={`${barsAnimatedIn ? burnDash : 0} ${BURN_C}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 0.88s cubic-bezier(0.22, 1, 0.36, 1) 80ms' }}
                />
                <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="18" fontWeight="800" fontFamily="inherit">{burnedToday}</text>
                <text x="50" y="62" textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="inherit">kcal</text>
              </svg>
            </div>
            <div className="home-burn-update-btn">Update Goal</div>
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
                    showTrend={showTrendLine}
                    goalWeightKg={goalWeightKg}
                    showGoal={showGoalLine}
                    trendModeConfig={trendModeConfig}
                    showTrendMode={showTrendMode}
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
            onInitialLoadComplete={() => setCalendarInitialReady(true)}
            onDayClick={(sessionIds, dateStr) => setSelectedDay({ sessionIds, dateStr })}
          />
        </div>
      </div>

    </div>
    {burnGoalSheetOpen && createPortal(
      <div
        className="home-weight-modal-overlay"
        onClick={() => { if (!burnSheetJustOpenedRef.current) setBurnGoalSheetOpen(false) }}
      >
        <div className="home-weight-modal" onClick={e => e.stopPropagation()} ref={burnGoalModalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Daily Burn Goal">
          <div className="home-weight-sheet-handle" />
          <div className="home-weight-modal-title">Daily Burn Goal</div>
          <div className="home-weight-panel-log-row">
            <input
              className="home-weight-panel-input"
              type="number"
              min="1"
              max={VALIDATION_LIMITS.caloriesBurnedGoalMax}
              step="1"
              inputMode="numeric"
              placeholder="e.g. 500"
              value={burnGoalInput}
              onChange={e => { setBurnGoalError(''); setBurnGoalInput(e.target.value) }}
              onKeyDown={e => e.key === 'Enter' && saveBurnGoal()}
              autoFocus
            />
            <span className="home-weight-panel-unit">kcal</span>
            <button className="home-weight-panel-save" onClick={saveBurnGoal} disabled={burnGoalSaving}>
              {burnGoalSaving ? '…' : 'Save'}
            </button>
          </div>
          {burnGoalError && <div className="quick-weight-error">{burnGoalError}</div>}
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
