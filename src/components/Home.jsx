import { useState, useEffect, useEffectEvent, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { localDate } from '../lib/dateUtils'
import { computeStreak } from '../lib/streakUtils'
import { useFocusTrap } from '../lib/useFocusTrap'
import { createPortal } from 'react-dom'
import Model from 'react-body-highlighter'
import { supabase } from '../lib/supabase'
import { getCached, getCalendarMonthCacheKey, getStartupSnapshot, invalidateCache, setCached, setStartupSnapshot } from '../lib/cache'
import { DEFAULT_HOME_WEIGHT_PERIOD, filterByChartPeriod } from '../lib/chartPeriods'
import { WEIGHT_TREND_PRESETS, getPresetRate } from '../lib/weightTrend'
import { applyMuscleWorkloadGoal, fetchWeeklyMuscleWorkload, getLocalTrainingWeekRange, MUSCLE_WORKLOAD_GROUPS } from '../lib/muscleWorkload'
import { SECONDARY_MUSCLE_CREDIT } from '../lib/muscleStimulus'
import { detectOvertrain } from '../lib/overtrain'
import WorkoutDayDetail from './profile/WorkoutDayDetail'
import BodyWeightDetail from './profile/BodyWeightDetail'
import WorkoutCalendar from './profile/WorkoutCalendar'
import WeightChart from './profile/WeightChart'
import { convertWeight, fmtCompact } from '../lib/liftMath'
import { VALIDATION_LIMITS, validateBodyweight, validateNumber } from '../lib/inputValidation'
import '../styles/Home.css'

const BODY_WEIGHT_CHART_UNIT_KEY = 'bodyWeightChartUnitOverride'
const HOME_STARTUP_SNAPSHOT_TTL_MS = 15 * 60 * 1000
const HOME_CACHE_KEY = 'home'
const HOME_CACHE_VERSION = 10
const DEFAULT_TODAY_NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0, goal: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 }

function todayStr() {
  return localDate()
}

function getWarmHomeData(userId, useStartupSnapshot) {
  if (useStartupSnapshot) return null
  const cached = getCached(HOME_CACHE_KEY)
  return cached?.version === HOME_CACHE_VERSION && cached?.userId === userId ? cached : null
}

function buildTodayNutrition(prof, nutLogs) {
  const calGoal = prof?.calories_goal || 2000
  const protGoal = prof?.protein_goal || 150
  const carbGoal = prof?.carbs_goal || 200
  const fatGoal = prof?.fat_goal || 65

  if (!nutLogs?.length) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, goal: calGoal, proteinGoal: protGoal, carbsGoal: carbGoal, fatGoal }
  }

  return {
    calories: nutLogs.reduce((s, l) => s + (l.calories || 0), 0),
    protein: nutLogs.reduce((s, l) => s + (l.protein || 0), 0),
    carbs: nutLogs.reduce((s, l) => s + (l.carbs || 0), 0),
    fat: nutLogs.reduce((s, l) => s + (l.fat || 0), 0),
    goal: calGoal,
    proteinGoal: protGoal,
    carbsGoal: carbGoal,
    fatGoal,
  }
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
const MUSCLE_REVEAL_STEP_MS = 80
const MUSCLE_HEAT_COLORS = [
  '#94a3b8',
  '#f59e0b',
  '#22c55e',
  '#f97316',
  '#ef4444',
]

const CHART_MUSCLE_TO_GROUP_KEY = new Map()
MUSCLE_WORKLOAD_GROUPS.forEach(group => {
  group.chartMuscles.forEach(m => CHART_MUSCLE_TO_GROUP_KEY.set(m, group.key))
})

const POSTERIOR_CHART_MUSCLES = new Set([
  'back-deltoids', 'triceps', 'forearm', 'adductor',
  'calves', 'gluteal', 'hamstring', 'lower-back', 'trapezius', 'upper-back',
])

let ghostChartHasPlayed = false
let ghostChartInterrupted = false
let nutGlowHasPlayed = false
let burnGlowHasPlayed = false
let muscleRevealHasPlayed = false
let lastHomeUserId = null
const GHOST_CHART_DRAW_TOTAL_MS = 1920
const GHOST_CHART_ERASE_FALLBACK_MS = 1400
const GHOST_CHART_DONE_TOTAL_MS = GHOST_CHART_DRAW_TOTAL_MS + GHOST_CHART_ERASE_FALLBACK_MS

function SkeletonBlock({ className = '' }) {
  return <span className={`home-skeleton-block ${className}`} aria-hidden="true" />
}

function HomeSkeleton() {
  const calendarCells = Array.from({ length: 35 }, (_, index) => index)

  return (
    <div className="home-screen home-screen-skeleton" aria-hidden="true">
      <div className="home-today-col" aria-hidden="true">
        <div className="home-today-split">
          <div className="home-today-card home-skeleton-card home-skeleton-nutrition">
            <div className="home-today-card-header">
              <SkeletonBlock className="home-skeleton-icon" />
              <SkeletonBlock className="home-skeleton-label" />
            </div>
            <SkeletonBlock className="home-skeleton-value" />
            <SkeletonBlock className="home-skeleton-subtitle" />
            <SkeletonBlock className="home-skeleton-bar" />
            <div className="home-skeleton-macros">
              {[0, 1, 2].map(index => (
                <div className="home-skeleton-macro" key={index}>
                  <div className="home-skeleton-macro-top">
                    <SkeletonBlock className="home-skeleton-macro-label" />
                    <SkeletonBlock className="home-skeleton-macro-value" />
                  </div>
                  <SkeletonBlock className="home-skeleton-track" />
                </div>
              ))}
            </div>
          </div>

          <div className="home-today-card home-skeleton-card home-skeleton-burn">
            <div className="home-today-card-header">
              <SkeletonBlock className="home-skeleton-label home-skeleton-label-short" />
            </div>
            <div className="home-skeleton-ring">
              <SkeletonBlock className="home-skeleton-ring-center" />
            </div>
            <SkeletonBlock className="home-skeleton-subtitle home-skeleton-subtitle-center" />
          </div>
        </div>
      </div>

      <div className="home-insights-grid" aria-hidden="true">
        <div className="home-section home-section-weight">
          <div className="home-weight-card home-skeleton-card home-skeleton-weight">
            <div className="home-weight-cap home-skeleton-cap">
              <SkeletonBlock className="home-skeleton-cap-line" />
              <SkeletonBlock className="home-skeleton-cap-subline" />
            </div>
            <div className="home-skeleton-chart" />
          </div>
        </div>

        <div className="home-section home-section-calendar">
          <div className="cal-card cal-card-compact cal-card-hybrid cal-card-loading home-skeleton-calendar">
            <div className="cal-nav">
              <SkeletonBlock className="home-skeleton-cal-arrow" />
              <SkeletonBlock className="home-skeleton-cal-title" />
              <SkeletonBlock className="home-skeleton-cal-arrow" />
            </div>
            <div className="cal-body cal-body-loading">
              <div className="cal-day-headers">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div className="cal-day-header" key={`${day}-${index}`}>{day}</div>
                ))}
              </div>
              <div className="cal-grid">
                {calendarCells.map(index => (
                  <div
                    className="cal-cell cal-cell-loading"
                    key={index}
                    style={{ '--cal-load-delay': `${(index % 7) * 70}ms` }}
                  >
                    <span className="cal-day-num cal-day-num-loading" />
                    <div className="cal-dots cal-dots-loading">
                      <span className="cal-dot cal-dot-loading" />
                      <span className="cal-dot cal-dot-loading" />
                      <span className="cal-dot cal-dot-loading" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home({ userId, splashDone, introMotionReady, useStartupSnapshot = false, onNavigate, onWorkoutStreakChange, onStreakMetaChange, onInitialReady, weightRefreshTick = 0, workoutRefreshTick = 0, onWorkoutDeleted, onBodyweightChanged, workoutActive = false, bottomBannerVisible = false, onOvertrain, isVisible = true, appForegroundTick = 0 }) {
  const initialHomeDataRef = useRef(getWarmHomeData(userId, useStartupSnapshot))
  const hasWarmInitialHomeData = Boolean(initialHomeDataRef.current)
  const [profile, setProfile]         = useState(() => initialHomeDataRef.current?.prof ?? null)
  const [renderedHomeUserId, setRenderedHomeUserId] = useState(() => initialHomeDataRef.current?.userId ?? null)
  const [todayNut, setTodayNut]       = useState(() => initialHomeDataRef.current ? buildTodayNutrition(initialHomeDataRef.current.prof, initialHomeDataRef.current.nutLogs) : DEFAULT_TODAY_NUTRITION)
  const [workoutStreak, setWorkoutStreak] = useState(() => initialHomeDataRef.current ? computeStreak(initialHomeDataRef.current.prof?.streak_start_date, initialHomeDataRef.current.prof?.streak_last_workout_at) : 0)
  const [weightLogs, setWeightLogs] = useState(() => initialHomeDataRef.current?.weightLogs ?? [])
  const [ghostChartPhase, setGhostChartPhase] = useState(() => (ghostChartHasPlayed || ghostChartInterrupted) ? 'done' : 'idle') // 'idle' | 'drawing' | 'erasing' | 'done'
  const [ghostChartRunId, setGhostChartRunId] = useState(0)
  const [appReturnTick, setAppReturnTick] = useState(0)
  const [, setLoading]                 = useState(() => !hasWarmInitialHomeData)
  const [initialShellReady, setInitialShellReady] = useState(() => hasWarmInitialHomeData)
  const [loadError, setLoadError]     = useState(false)
  const [showWeightDetail, setShowWeightDetail] = useState(false)
  const [weightSheetUnit, setWeightSheetUnit] = useState(() => loadStoredBodyWeightChartUnit())
  const [bwInput, setBwInput] = useState('')
  const [bwSaving, setBwSaving] = useState(false)
  const [bwError, setBwError] = useState('')
  const [weightPeriod, setWeightPeriod] = useState(DEFAULT_HOME_WEIGHT_PERIOD)
  const [weightAllLoading, setWeightAllLoading] = useState(false)
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
  const burnSheetJustOpenedRef = useRef(false)

  const [isPhoneWidth, setIsPhoneWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  ))
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 780
  ))
  const [burnedToday, setBurnedToday] = useState(() => (initialHomeDataRef.current?.todaySessions || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0))
  const [burnGoal, setBurnGoal] = useState(() => initialHomeDataRef.current?.prof?.calories_burned_goal || null)
  const [burnGoalSheetOpen, setBurnGoalSheetOpen] = useState(false)
  const [burnGoalInput, setBurnGoalInput] = useState('')
  const [burnGoalError, setBurnGoalError] = useState('')
  const [burnGoalSaving, setBurnGoalSaving] = useState(false)
  const [burnWidgetSide, setBurnWidgetSide] = useState(() => {
    const saved = localStorage.getItem('liftlog:burnWidgetSide')
    return saved === 'muscle-front' || saved === 'muscle-back' ? saved : 'calories'
  })
  const [weeklyMuscleWorkload, setWeeklyMuscleWorkload] = useState(() => initialHomeDataRef.current?.weeklyMuscleWorkload ?? null)
  const [priorWeekMuscleWorkload, setPriorWeekMuscleWorkload] = useState(() => initialHomeDataRef.current?.priorWeekMuscleWorkload ?? null)
  const [muscleRevealStep, setMuscleRevealStep] = useState(0)
  const [muscleDetailOpen, setMuscleDetailOpen] = useState(false)
  const [muscleDetailSelectedKey, setMuscleDetailSelectedKey] = useState(null)
  const [expandedMuscleRows, setExpandedMuscleRows] = useState(new Set())
  const [muscleWorkloadGoal, setMuscleWorkloadGoal] = useState(() => {
    try { return localStorage.getItem('muscle_workload_goal') || 'hypertrophy' } catch { return 'hypertrophy' }
  })
  const burnGoalModalRef = useRef(null)
  const muscleDetailModalRef = useRef(null)
  const muscleTouchRef = useRef({ startY: null, dragging: false })
  const prevBurnWidgetSideRef = useRef(burnWidgetSide)
  const muscleRevealStepRef = useRef(0)
  const ghostChartPhaseRef = useRef(ghostChartPhase)
  const ghostChartEraseTimerRef = useRef(null)
  const ghostChartDoneTimerRef = useRef(null)
  const lastHandledAppForegroundTickRef = useRef(appForegroundTick)
  // Incremented by the on-demand wide-weight effect each time it writes new data.
  // load() snapshots this before Promise.all and compares after to detect a race.
  const weightDataVersionRef = useRef(0)
  // Holds the actual wide weight rows written by the on-demand effect.
  // Set synchronously inside .then() so any stale async closure can read it via .current.
  const wideWeightLogsRef = useRef(null)
  const lockedContentHeightRef = useRef(null)
  const clearGhostChartTimers = useCallback(() => {
    clearTimeout(ghostChartEraseTimerRef.current)
    clearTimeout(ghostChartDoneTimerRef.current)
    ghostChartEraseTimerRef.current = null
    ghostChartDoneTimerRef.current = null
  }, [])

  const finishGhostChartAnimation = useCallback(() => {
    clearGhostChartTimers()
    ghostChartHasPlayed = true
    ghostChartInterrupted = true
    ghostChartPhaseRef.current = 'done'
    setGhostChartPhase('done')
  }, [clearGhostChartTimers])

  const handleGhostChartAnimationEnd = useCallback((event) => {
    if (event.animationName === 'ghost-draw' && ghostChartPhaseRef.current === 'drawing') {
      clearTimeout(ghostChartEraseTimerRef.current)
      ghostChartEraseTimerRef.current = null
      ghostChartPhaseRef.current = 'erasing'
      setGhostChartPhase('erasing')
      return
    }

    if (event.animationName === 'ghost-erase' && ghostChartPhaseRef.current === 'erasing') {
      finishGhostChartAnimation()
    }
  }, [finishGhostChartAnimation])

  const handleMuscleTouchStart = (e) => {
    if (muscleDetailModalRef.current?.scrollTop !== 0) return
    muscleTouchRef.current = { startY: e.touches[0].clientY, dragging: true }
  }

  const handleMuscleTouchMove = (e) => {
    if (!muscleTouchRef.current.dragging) return
    const deltaY = e.touches[0].clientY - muscleTouchRef.current.startY
    if (deltaY <= 0) return
    if (muscleDetailModalRef.current) {
      muscleDetailModalRef.current.style.transition = 'none'
      muscleDetailModalRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }

  const handleMuscleTouchEnd = () => {
    if (!muscleTouchRef.current.dragging) return
    const el = muscleDetailModalRef.current
    const raw = el?.style.transform ?? ''
    const deltaY = raw ? parseFloat(raw.replace('translateY(', '')) : 0
    muscleTouchRef.current = { startY: null, dragging: false }
    if (deltaY > 80) {
      setMuscleDetailOpen(false)
      setMuscleDetailSelectedKey(null)
      if (el) el.style.transform = ''
    } else if (el) {
      el.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
      el.style.transform = ''
    }
  }
  useFocusTrap(burnGoalModalRef, { active: burnGoalSheetOpen, onEscape: () => setBurnGoalSheetOpen(false) })
  useFocusTrap(muscleDetailModalRef, { active: muscleDetailOpen, onEscape: () => setMuscleDetailOpen(false) })
  const nutEmpty = todayNut.calories === 0 && todayNut.protein === 0 && todayNut.carbs === 0 && todayNut.fat === 0
  const [barsAnimatedIn, setBarsAnimatedIn] = useState(false)
  const [burnRingAnimatedIn, setBurnRingAnimatedIn] = useState(false)
  const [nutGlowActive, setNutGlowActive] = useState(false)
  const [burnGlowActive, setBurnGlowActive] = useState(false)
  const [animReady, setAnimReady] = useState(() => hasWarmInitialHomeData)
  const [skeletonDone, setSkeletonDone] = useState(() => hasWarmInitialHomeData)
  const [skeletonOut, setSkeletonOut] = useState(() => hasWarmInitialHomeData)
  const hasRenderableHomeData = profile !== null && renderedHomeUserId === userId
  const entryAnimationReady = hasRenderableHomeData && splashDone && introMotionReady && isVisible
  const widgetAnimationReady = animReady

  useLayoutEffect(() => {
    if (lastHomeUserId !== userId) {
      lastHomeUserId = userId
      ghostChartHasPlayed = false
      ghostChartInterrupted = false
      nutGlowHasPlayed = false
      burnGlowHasPlayed = false
      muscleRevealHasPlayed = false
      muscleRevealStepRef.current = 0
      clearGhostChartTimers()
      setGhostChartPhase('idle')
      setGhostChartRunId(0)
      setMuscleRevealStep(0)
      setSkeletonDone(false)
      setSkeletonOut(false)
    }
  }, [clearGhostChartTimers, userId])

  useEffect(() => {
    const onResize = () => {
      setIsPhoneWidth(window.innerWidth <= 640)
      setViewportHeight(window.visualViewport?.height || window.innerHeight)
    }

    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])
  useLayoutEffect(() => {
    const contentNode = document.querySelector('.content')
    if (!(contentNode instanceof HTMLElement)) return undefined
    const shouldLock = isVisible && isPhoneWidth && !selectedDay && !showWeightDetail && !workoutActive && !bottomBannerVisible
    contentNode.classList.toggle('content-home-locked', shouldLock)
    if (shouldLock) {
      contentNode.scrollTop = 0
      lockedContentHeightRef.current = contentNode.clientHeight
    }
    return () => { contentNode.classList.remove('content-home-locked') }
  }, [isVisible, isPhoneWidth, selectedDay, showWeightDetail, workoutActive, bottomBannerVisible])

  function handleDeletedWorkout({ remainingSessionIds = [], dateStr }) {
    setSelectedDay({ sessionIds: remainingSessionIds, dateStr })
    setLoading(true)
    load()
    onWorkoutDeleted?.()
  }

  function applyData({ userId: dataUserId, prof, nutLogs, todaySessions, weightLogs: logs, weeklyMuscleWorkload: muscleWorkload, priorWeekMuscleWorkload }) {
    setRenderedHomeUserId(dataUserId || userId)
    setProfile(prof)
    setWeightLogs(logs || [])
    setBurnGoal(prof?.calories_burned_goal || null)
    setWeeklyMuscleWorkload(muscleWorkload || null)
    setPriorWeekMuscleWorkload(priorWeekMuscleWorkload || null)

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
    const todayBurned = (todaySessions || []).reduce((sum, s) => sum + (s.calories_burned || 0), 0)
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

    const streak = computeStreak(prof?.streak_start_date, prof?.streak_last_workout_at)
    setWorkoutStreak(streak)
    onStreakMetaChange?.({ startDate: prof?.streak_start_date ?? null, lastWorkoutAt: prof?.streak_last_workout_at ?? null })
  }

  async function load() {
    const today = todayStr()
    const requireFreshInitialData = useStartupSnapshot
    let hasWarmData = false
    setLoadError(false)
    // Snapshot the ref BEFORE the first await. Refs are shared across renders so
    // reading .current after the await always gives the live value — unlike state
    // or props which are captured in the closure and go stale.
    const weightVersionSnapshot = weightDataVersionRef.current

    try {
      const cached = getCached(HOME_CACHE_KEY)
      if (cached?.version === HOME_CACHE_VERSION && cached?.userId === userId) {
        applyData(cached)
        hasWarmData = true
      }

      if (!hasWarmData && useStartupSnapshot) {
        const storedSnapshot = getStartupSnapshot(HOME_CACHE_KEY, userId)
        if (storedSnapshot?.version === HOME_CACHE_VERSION && storedSnapshot?.userId === userId) {
          setCached(HOME_CACHE_KEY, storedSnapshot)
          applyData(storedSnapshot)
          hasWarmData = true
        }
      }

      setInitialShellReady(true)

      if (hasWarmData) {
        if (!requireFreshInitialData) {
          setLoading(false)
          return
        }
      }

      // Build the weight query to match the currently viewed period.
      // loadLatest() is a useEffectEvent so it always sees the latest weightPeriod —
      // this prevents a background refresh from truncating wider data the user is viewing.
      let weightQuery = supabase.from('body_weight_logs')
        .select('id, weight, unit, logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: true })
      if (weightPeriod !== 'all') {
        const weightDays = weightPeriod === '1y' ? 365 : 90
        const weightFetchStart = new Date()
        weightFetchStart.setDate(weightFetchStart.getDate() - weightDays)
        weightQuery = weightQuery.gte('logged_at', weightFetchStart.toISOString())
      }

      const priorWeekDate = new Date(Date.now() - 7 * 86400000)
      const priorWeekMuscleKey = `muscle-workload:prior:${getLocalTrainingWeekRange(priorWeekDate).startIso.slice(0, 10)}`
      const cachedPriorWeekMuscle = getCached(priorWeekMuscleKey)

      const tomorrow = localDate(new Date(Date.now() + 86400000))

      const [
        profileResponse,
        nutritionResponse,
        todaySessionsResponse,
        weightResponse,
        weeklyMuscleWorkloadResult,
        priorWeekMuscleWorkloadResult,
      ] = await Promise.all([
        supabase.from('profiles')
          .select('full_name, username, calories_goal, protein_goal, carbs_goal, fat_goal, unit_preference, bodyweight, calories_burned_goal, gender, weight_goal_kg, weight_trend_mode, weight_trend_rate_kg_per_week, weight_trend_anchor_date, weight_trend_anchor_weight_kg, streak_start_date, streak_last_workout_at')
          .eq('id', userId).single(),
        supabase.from('nutrition_logs')
          .select('calories, protein, carbs, fat')
          .eq('user_id', userId).eq('log_date', today),
        supabase.from('workout_sessions')
          .select('calories_burned')
          .eq('user_id', userId)
          .gte('finished_at', `${today}T00:00:00`)
          .lt('finished_at', `${tomorrow}T00:00:00`),
        weightQuery,
        fetchWeeklyMuscleWorkload(userId),
        cachedPriorWeekMuscle ?? fetchWeeklyMuscleWorkload(userId, priorWeekDate),
      ])
      if (!cachedPriorWeekMuscle) setCached(priorWeekMuscleKey, priorWeekMuscleWorkloadResult, 7 * 24 * 60 * 60 * 1000)

      const loadError = profileResponse.error
        || nutritionResponse.error
        || todaySessionsResponse.error
        || weightResponse.error
      if (loadError) throw loadError

      // If the on-demand effect wrote wider weight data while Promise.all was in
      // flight, use that data in the result so both the cache and applyData receive
      // the correct wide rows — not the narrow fetch we issued.
      // wideWeightLogsRef is a ref so .current is always live even in a stale closure.
      const onDemandRanMidFlight = weightDataVersionRef.current !== weightVersionSnapshot
      const result = {
        version: HOME_CACHE_VERSION,
        userId,
        prof: profileResponse.data,
        nutLogs: nutritionResponse.data,
        todaySessions: todaySessionsResponse.data,
        weeklyMuscleWorkload: weeklyMuscleWorkloadResult,
        priorWeekMuscleWorkload: priorWeekMuscleWorkloadResult,
        weightLogs: onDemandRanMidFlight
          ? (wideWeightLogsRef.current ?? weightResponse.data?.map(log => ({
              id: log.id,
              weight: log.weight,
              unit: log.unit,
              date: log.logged_at.slice(0, 10),
              loggedAt: log.logged_at,
            })) ?? [])
          : (weightResponse.data?.map(log => ({
              id: log.id,
              weight: log.weight,
              unit: log.unit,
              date: log.logged_at.slice(0, 10),
              loggedAt: log.logged_at,
            })) || []),
        today,
      }
      setCached(HOME_CACHE_KEY, result)
      setStartupSnapshot(HOME_CACHE_KEY, result, HOME_STARTUP_SNAPSHOT_TTL_MS, userId)
      applyData(result)
    } catch (error) {
      console.error('Home load failed:', error)
      setLoadError(true)
    } finally {
      setInitialShellReady(true)
      setLoading(false)
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    if (!hasWarmInitialHomeData) {
      setInitialShellReady(false)
      setLoading(true)
    }
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [hasWarmInitialHomeData, userId])

  useEffect(() => {
    if (weightRefreshTick === 0) return
    loadLatest()
  }, [weightRefreshTick])

  useEffect(() => {
    if (workoutRefreshTick === 0) return
    loadLatest()
  }, [workoutRefreshTick])

  useEffect(() => {
    if (weightPeriod !== 'all' && weightPeriod !== '1y') return
    let cancelled = false
    setWeightAllLoading(true)
    let query = supabase.from('body_weight_logs')
      .select('id, weight, unit, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true })
    if (weightPeriod === '1y') {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      query = query.gte('logged_at', oneYearAgo.toISOString())
    }
    query
      .then(({ data }) => {
        if (cancelled || !data) return
        const wideLogs = data.map(log => ({
          id: log.id,
          weight: log.weight,
          unit: log.unit,
          date: log.logged_at.slice(0, 10),
          loggedAt: log.logged_at,
        }))
        // Write ref synchronously so any in-flight load() can read it via .current
        // regardless of which render closure is executing.
        wideWeightLogsRef.current = wideLogs
        weightDataVersionRef.current++
        // Keep the cache consistent so cache-hit paths in load() always serve
        // the widest data that has been fetched, not a stale narrow result.
        const currentCache = getCached(HOME_CACHE_KEY)
        if (currentCache) setCached(HOME_CACHE_KEY, { ...currentCache, weightLogs: wideLogs })
        setWeightLogs(wideLogs)
      })
      .finally(() => { if (!cancelled) setWeightAllLoading(false) })
    return () => { cancelled = true; setWeightAllLoading(false) }
  }, [weightPeriod, userId])

  useEffect(() => {
    onWorkoutStreakChange?.(workoutStreak)
  }, [onWorkoutStreakChange, workoutStreak])

  useEffect(() => {
    if (!initialShellReady) return
    onInitialReady?.()
  }, [initialShellReady, onInitialReady])

  useEffect(() => {
    if (!entryAnimationReady) {
      setAnimReady(false)
      return undefined
    }

    setAnimReady(false)
    let timer = null
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setAnimReady(true), 80)
    })

    return () => {
      cancelAnimationFrame(frame)
      if (timer !== null) clearTimeout(timer)
    }
  }, [entryAnimationReady])

  useEffect(() => {
    if (!entryAnimationReady || skeletonDone) return
    setSkeletonOut(true)
    const timer = setTimeout(() => setSkeletonDone(true), 780)
    return () => clearTimeout(timer)
  }, [entryAnimationReady, skeletonDone])

  useEffect(() => {
    if (!hasRenderableHomeData || !widgetAnimationReady || selectedDay || showWeightDetail) {
      setBarsAnimatedIn(false)
      return undefined
    }

    setBarsAnimatedIn(false)
    const timer = setTimeout(() => setBarsAnimatedIn(true), 120)
    return () => clearTimeout(timer)
  }, [hasRenderableHomeData, widgetAnimationReady, selectedDay, showWeightDetail, todayNut.calories, todayNut.protein, todayNut.carbs, todayNut.fat, appReturnTick])

  useEffect(() => {
    if (!hasRenderableHomeData || !widgetAnimationReady || selectedDay || showWeightDetail || burnWidgetSide !== 'calories') {
      setBurnRingAnimatedIn(false)
      return undefined
    }

    setBurnRingAnimatedIn(false)
    const timer = setTimeout(() => setBurnRingAnimatedIn(true), 120)
    return () => clearTimeout(timer)
  }, [hasRenderableHomeData, widgetAnimationReady, selectedDay, showWeightDetail, burnWidgetSide, burnedToday, burnGoal, appReturnTick])

  useEffect(() => {
    if (!isVisible) return
    nutGlowHasPlayed = false
    burnGlowHasPlayed = false
    muscleRevealHasPlayed = false
    muscleRevealStepRef.current = 0
    setMuscleRevealStep(0)
    setAppReturnTick(t => t + 1)
  }, [isVisible])

  useEffect(() => {
    if (!appForegroundTick || !isVisible) return
    if (lastHandledAppForegroundTickRef.current === appForegroundTick) return
    lastHandledAppForegroundTickRef.current = appForegroundTick
    clearGhostChartTimers()
    ghostChartHasPlayed = false
    ghostChartInterrupted = false
    ghostChartPhaseRef.current = 'idle'
    setGhostChartPhase('idle')
    nutGlowHasPlayed = false
    burnGlowHasPlayed = false
    muscleRevealHasPlayed = false
    setAppReturnTick(t => t + 1)
  }, [appForegroundTick, isVisible, clearGhostChartTimers])

  useEffect(() => {
    ghostChartPhaseRef.current = ghostChartPhase
  }, [ghostChartPhase])

  useEffect(() => {
    if (!isVisible || !hasRenderableHomeData || !widgetAnimationReady || weightLogs.length > 0 || ghostChartHasPlayed) return
    clearGhostChartTimers()
    ghostChartHasPlayed = true
    setGhostChartRunId(id => id + 1)
    ghostChartPhaseRef.current = 'drawing'
    setGhostChartPhase('drawing')
    ghostChartEraseTimerRef.current = setTimeout(() => {
      ghostChartEraseTimerRef.current = null
      ghostChartPhaseRef.current = 'erasing'
      setGhostChartPhase('erasing')
    }, GHOST_CHART_DRAW_TOTAL_MS)
    ghostChartDoneTimerRef.current = setTimeout(() => {
      ghostChartDoneTimerRef.current = null
      ghostChartPhaseRef.current = 'done'
      setGhostChartPhase('done')
    }, GHOST_CHART_DONE_TOTAL_MS)
    return () => {
      const wasAnimating = ghostChartPhaseRef.current === 'drawing' || ghostChartPhaseRef.current === 'erasing'
      clearGhostChartTimers()
      if (wasAnimating) {
        ghostChartHasPlayed = true
        ghostChartInterrupted = true
        ghostChartPhaseRef.current = 'done'
      }
    }
  }, [isVisible, hasRenderableHomeData, widgetAnimationReady, weightLogs.length, appReturnTick, clearGhostChartTimers])

  useEffect(() => {
    if (isVisible) return
    if (ghostChartPhase !== 'drawing' && ghostChartPhase !== 'erasing') return
    finishGhostChartAnimation()
  }, [finishGhostChartAnimation, ghostChartPhase, isVisible])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return
      const phase = ghostChartPhaseRef.current
      if (phase !== 'drawing' && phase !== 'erasing') return
      finishGhostChartAnimation()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [finishGhostChartAnimation])

  useEffect(() => {
    if (!hasRenderableHomeData || !widgetAnimationReady || !nutEmpty || nutGlowHasPlayed) return
    nutGlowHasPlayed = true
    setNutGlowActive(true)
    const t = setTimeout(() => setNutGlowActive(false), 2800)
    return () => clearTimeout(t)
  }, [hasRenderableHomeData, widgetAnimationReady, nutEmpty, appReturnTick])

  useEffect(() => {
    if (!hasRenderableHomeData || !widgetAnimationReady || burnedToday !== 0 || burnGlowHasPlayed) return
    burnGlowHasPlayed = true
    setBurnGlowActive(true)
    const t = setTimeout(() => setBurnGlowActive(false), 2800)
    return () => clearTimeout(t)
  }, [hasRenderableHomeData, widgetAnimationReady, burnedToday, appReturnTick])

  const goalAdjustedWeeklyMuscleWorkload = useMemo(
    () => applyMuscleWorkloadGoal(weeklyMuscleWorkload, muscleWorkloadGoal),
    [weeklyMuscleWorkload, muscleWorkloadGoal]
  )
  const goalAdjustedPriorMuscleWorkload = useMemo(
    () => applyMuscleWorkloadGoal(priorWeekMuscleWorkload, muscleWorkloadGoal),
    [priorWeekMuscleWorkload, muscleWorkloadGoal]
  )
  const muscleWorkloadGroups = goalAdjustedWeeklyMuscleWorkload?.groups || []
  const goalChartData = muscleWorkloadGroups
    .filter(g => g.heatBucket > 0)
    .map(g => ({ name: g.label, muscles: g.chartMuscles, frequency: g.heatBucket }))
  const visibleGoalChartData = burnWidgetSide === 'muscle-back'
    ? goalChartData.filter(g => g.muscles.some(m => POSTERIOR_CHART_MUSCLES.has(m)))
    : goalChartData
  const muscleDetailRows = [...muscleWorkloadGroups]
    .filter(group => group.effectiveSets > 0)
    .sort((a, b) => b.targetRatio - a.targetRatio || b.effectiveSets - a.effectiveSets || a.label.localeCompare(b.label))
  const muscleDetailSelectedGroup = muscleDetailSelectedKey
    ? (muscleWorkloadGroups.find(g => g.key === muscleDetailSelectedKey) ?? null)
    : null
  const hasWeeklyMuscleWork = (goalAdjustedWeeklyMuscleWorkload?.trainedGroupCount || 0) > 0
  const formatMuscleDate = (timestamp) => timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Not this week'

  useEffect(() => {
    const sideChanged = prevBurnWidgetSideRef.current !== burnWidgetSide
    prevBurnWidgetSideRef.current = burnWidgetSide
    if (sideChanged && burnWidgetSide !== 'calories') {
      muscleRevealHasPlayed = false
      muscleRevealStepRef.current = 0
      setMuscleRevealStep(0)
    }
    if (!hasRenderableHomeData || !widgetAnimationReady || !visibleGoalChartData.length || muscleRevealHasPlayed) return
    const total = visibleGoalChartData.length
    if (muscleRevealStepRef.current >= total) {
      muscleRevealHasPlayed = true
      return
    }
    let step = muscleRevealStepRef.current
    const id = setInterval(() => {
      step++
      muscleRevealStepRef.current = step
      setMuscleRevealStep(step)
      if (step >= total) {
        clearInterval(id)
        muscleRevealHasPlayed = true
      }
    }, MUSCLE_REVEAL_STEP_MS)
    return () => clearInterval(id)
  }, [hasRenderableHomeData, widgetAnimationReady, appReturnTick, burnWidgetSide, visibleGoalChartData.length])


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
    const previousBodyweight = profile?.bodyweight ?? null
    const tempId = `_opt_${Date.now()}`
    const optimisticEntry = { id: tempId, weight: val, unit, date: timestamp.slice(0, 10), loggedAt: timestamp }

    setWeightLogs(prev => [...prev, optimisticEntry])
    setProfile(current => current ? { ...current, bodyweight: nextBodyweight } : current)
    setBwInput('')

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

      setWeightLogs(prev => prev.map(log =>
        log.id === tempId
          ? { id: inserted.id, weight: inserted.weight, unit: inserted.unit, date: inserted.logged_at.slice(0, 10), loggedAt: inserted.logged_at }
          : log
      ))
      invalidateCache('profile', 'ranks', 'home', getCalendarMonthCacheKey(timestamp))
      onBodyweightChanged?.()
    } catch (error) {
      setWeightLogs(prev => prev.filter(log => log.id !== tempId))
      setProfile(current => {
        if (!current) return current
        return current.bodyweight === nextBodyweight
          ? { ...current, bodyweight: previousBodyweight }
          : current
      })
      setBwInput(String(val))
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

    try {
      // Fetch true latest remaining row from DB (not in-memory) so profiles.bodyweight
      // is correct even when the startup window only loaded 90 days of history.
      const [{ error: deleteError }, { data: latestRows, error: latestError }] = await Promise.all([
        supabase.from('body_weight_logs').delete().eq('id', logId),
        supabase.from('body_weight_logs')
          .select('weight, unit')
          .eq('user_id', userId)
          .neq('id', logId)
          .order('logged_at', { ascending: false })
          .limit(1),
      ])

      if (deleteError) throw deleteError
      if (latestError) throw latestError

      const latestRemainingLog = latestRows?.[0] ?? null
      const nextBodyweight = latestRemainingLog
        ? convertWeight(latestRemainingLog.weight, latestRemainingLog.unit || profile?.unit_preference || 'kg', profile?.unit_preference || 'kg')
        : null

      const { error: profileError } = await supabase.from('profiles').update({ bodyweight: nextBodyweight }).eq('id', userId)
      if (profileError) throw profileError

      invalidateCache('profile', 'ranks', 'home', getCalendarMonthCacheKey(removedLog?.loggedAt || removedLog?.date || new Date()))
      setWeightLogs(remainingLogs)
      setProfile(current => current ? { ...current, bodyweight: nextBodyweight } : current)
      setWeightDeleteTargetId(null)
      onBodyweightChanged?.()
    } catch (error) {
      setWeightDeleteError(error?.message || 'Could not delete this weight log.')
    } finally {
      setWeightDeletingId(null)
    }
  }

  const calPct = Math.min(1, todayNut.calories / todayNut.goal)
  const effectiveBurnGoal = burnGoal ?? 0
  const noGoalSet = effectiveBurnGoal === 0
  const burnEmpty = burnedToday === 0
  const burnPct = noGoalSet ? (burnEmpty ? 0 : 1) : Math.min(1, burnedToday / effectiveBurnGoal)
  const burnComplete = !noGoalSet && burnedToday >= effectiveBurnGoal
  const burnDash = burnPct * BURN_C
  const calBarWidth = `${barsAnimatedIn ? calPct * 100 : 0}%`
  const activeWeightUnit = weightSheetUnit || profile?.unit_preference || 'kg'
  const homeChartHeight = isPhoneWidth ? Math.round(Math.min(188, Math.max(108, viewportHeight * 0.202))) : 388
  const homeChartTickCount = 5
  const homeChartPadding = isPhoneWidth ? 'tight-mobile' : 'tight'
  const ghostChartAnimating = ghostChartPhase === 'drawing' || ghostChartPhase === 'erasing'
  const showGhostChartEmptyLabel = ghostChartPhase === 'done' || (ghostChartHasPlayed && !ghostChartAnimating)

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
  const burnWidgetIsMuscle = burnWidgetSide === 'muscle-front' || burnWidgetSide === 'muscle-back'

  useEffect(() => {
    if (!goalAdjustedWeeklyMuscleWorkload) return
    onOvertrain?.(detectOvertrain({
      currentWorkload: goalAdjustedWeeklyMuscleWorkload,
      priorWorkload: goalAdjustedPriorMuscleWorkload,
    }))
  }, [goalAdjustedWeeklyMuscleWorkload, goalAdjustedPriorMuscleWorkload, onOvertrain])

  if (loadError && !hasRenderableHomeData) {
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
        weightAllLoading={weightAllLoading}
        hasWeightLogs={weightLogs.length > 0}
        weightLogs={weightLogs}
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
        dailyCalorieGoal={todayNut.goal}
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
    <div className="home-container">
      {!skeletonDone && (
        <div
          className={`home-skeleton-overlay${skeletonOut ? ' home-skeleton-overlay--exit' : ''}`}
          role="status"
          aria-label="Loading Home"
          aria-live="polite"
        >
          <HomeSkeleton />
        </div>
      )}
    <div
      className={`home-screen${animReady ? ' home-screen--ready' : ''}`}
      style={bottomBannerVisible && isPhoneWidth ? { minHeight: lockedContentHeightRef.current ?? 'calc(100% + 52px)' } : undefined}
    >

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
                <div className="home-today-val">{fmtCompact(Math.round(todayNut.calories))}</div>
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
            className={`home-today-card home-today-card-clickable home-burned-widget home-burned-widget-${burnWidgetSide}`}
            onClick={() => {
              if (burnWidgetIsMuscle) {
                setMuscleDetailSelectedKey(null)
                setExpandedMuscleRows(new Set())
                setMuscleDetailOpen(true)
                return
              }
              setBurnGoalInput(burnGoal ? String(burnGoal) : '')
              burnSheetJustOpenedRef.current = true
              setBurnGoalSheetOpen(true)
              setTimeout(() => { burnSheetJustOpenedRef.current = false }, 300)
            }}
          >
            <button
              type="button"
              className="home-widget-flip-btn"
              aria-label={
                burnWidgetSide === 'calories'
                  ? 'Show front muscles worked'
                  : burnWidgetSide === 'muscle-front'
                    ? 'Show back muscles worked'
                    : 'Show calories burned'
              }
              onClick={(event) => {
                event.stopPropagation()
                const next = burnWidgetSide === 'calories' ? 'muscle-front' : burnWidgetSide === 'muscle-front' ? 'muscle-back' : 'calories'
                localStorage.setItem('liftlog:burnWidgetSide', next)
                setBurnWidgetSide(next)
                if (next === 'calories') {
                  burnGlowHasPlayed = true
                  setBurnGlowActive(true)
                  setTimeout(() => setBurnGlowActive(false), 2800)
                }
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 7h11l-3-3" />
                <path d="M18 7l-3 3" />
                <path d="M17 17H6l3 3" />
                <path d="M6 17l3-3" />
              </svg>
            </button>
            {burnWidgetSide === 'calories' ? (
              <>
                <div className="home-today-card-header">
                  <span>Calories Burned</span>
                </div>
                <div className="home-burn-ring-wrap">
                  <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
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
                    <circle
                      className={burnGlowActive && burnEmpty ? 'home-burn-track-pulse' : undefined}
                      cx="50"
                      cy="50"
                      r={BURN_R}
                      fill="none"
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth="8"
                    />
                    <circle cx="50" cy="50" r={BURN_R} fill="none"
                      stroke="url(#blg)"
                      strokeWidth="8"
                      strokeDasharray={`${burnRingAnimatedIn ? burnDash : 0} ${BURN_C}`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dasharray 0.88s cubic-bezier(0.22, 1, 0.36, 1) 80ms' }}
                    />
                    <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="18" fontWeight="800" fontFamily="inherit">{fmtCompact(burnedToday)}</text>
                    <text x="50" y="62" textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="inherit">kcal</text>
                  </svg>
                </div>
                <div className="home-burn-update-btn">Update Goal</div>
              </>
            ) : (
              <>
                <div className="home-today-card-header home-muscle-card-header">
                  <span>Muscles Worked</span>
                </div>
                <div className={`home-muscle-mini-models${hasWeeklyMuscleWork ? '' : ' home-muscle-mini-models-empty'}`} aria-hidden="true">
                  <Model
                    data={visibleGoalChartData.slice(0, muscleRevealStep)}
                    type={burnWidgetSide === 'muscle-front' ? 'anterior' : 'posterior'}
                    bodyColor="rgba(255, 255, 255, 0.14)"
                    highlightedColors={MUSCLE_HEAT_COLORS}
                    style={{ width: '100%', height: '100%' }}
                    svgStyle={{ display: 'block', width: '100%', height: '100%' }}
                  />
                </div>
              </>
            )}
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
                    key={`home-weight-chart-${appReturnTick}`}
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
                  <div className="home-chart-ghost-frame" style={{ height: homeChartHeight }}>
                    {ghostChartAnimating && (
                      <div
                        key={ghostChartRunId}
                        className={`home-chart-ghost-mask home-chart-ghost-mask--${ghostChartPhase}`}
                        onAnimationEnd={handleGhostChartAnimationEnd}
                      >
                        <svg className="home-chart-ghost" viewBox="0 0 300 162" width="100%" height="100%" style={{ display: 'block' }}>
                          <polyline
                            className="home-chart-ghost-path"
                            points="30,118 55,124 80,110 105,115 130,100 155,88 175,92 200,75 225,68 250,58 275,45 292,38"
                            fill="none"
                            stroke="var(--blue)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={`home-chart-empty-label${showGhostChartEmptyLabel ? ' home-chart-empty-label--visible' : ''}`}>
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
            visualLoading={!widgetAnimationReady}
            refreshKey={calendarRefreshKey}
            onDayClick={(sessionIds, dateStr) => setSelectedDay({ sessionIds, dateStr })}
          />
        </div>
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
    {muscleDetailOpen && createPortal(
      <div className="home-weight-modal-overlay" onClick={() => setMuscleDetailOpen(false)}>
        <div
          className="home-weight-modal home-muscle-detail-modal"
          onClick={e => e.stopPropagation()}
          ref={muscleDetailModalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Weekly Muscle Work"
          onTouchStart={handleMuscleTouchStart}
          onTouchMove={handleMuscleTouchMove}
          onTouchEnd={handleMuscleTouchEnd}
        >
          <div className="home-weight-sheet-handle" />
          <div className="home-weight-panel-header">
            <div>
              <div className="home-weight-modal-title">Weekly Muscle Work</div>
              <div className="home-muscle-detail-subtitle">{weeklyMuscleWorkload?.week?.label || 'This week'}</div>
            </div>
            <button className="home-weight-panel-close" onClick={() => { setMuscleDetailOpen(false); setMuscleDetailSelectedKey(null) }} aria-label="Close muscle work details">×</button>
          </div>
          <div className="home-muscle-detail-stats">
            <div>
              <strong>{weeklyMuscleWorkload?.totalEffectiveSets || 0}</strong>
              <span>Effective Sets</span>
            </div>
            <div>
              <strong>{weeklyMuscleWorkload?.trainedDays?.length || 0}</strong>
              <span>Training Days</span>
            </div>
            <div>
              <strong>{formatMuscleDate(weeklyMuscleWorkload?.lastTrainedAt)}</strong>
              <span>Last Trained</span>
            </div>
          </div>
          <div className="home-muscle-goal-toggle" role="group" aria-label="Training goal">
            {[
              { key: 'strength',     label: 'Strength' },
              { key: 'hypertrophy',  label: 'Hypertrophy' },
              { key: 'endurance',    label: 'Endurance' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`home-muscle-goal-btn${muscleWorkloadGoal === key ? ' active' : ''}`}
	                onClick={() => {
	                  setMuscleWorkloadGoal(key)
	                  try { localStorage.setItem('muscle_workload_goal', key) } catch { /* best-effort */ }
	                }}
              >{label}</button>
            ))}
          </div>
          <div className="home-muscle-detail-models" aria-hidden="true">
            {['anterior', 'posterior'].map(type => (
              <div key={type} className="home-muscle-detail-model">
                <Model
                  data={goalChartData}
                  type={type}
                  bodyColor="rgba(255, 255, 255, 0.14)"
                  highlightedColors={MUSCLE_HEAT_COLORS}
                  onClick={({ muscle }) => {
                    const groupKey = CHART_MUSCLE_TO_GROUP_KEY.get(muscle)
                    if (!groupKey) return
                    setMuscleDetailSelectedKey(prev => prev === groupKey ? null : groupKey)
                  }}
                  style={{ width: '100%', height: '100%' }}
                  svgStyle={{ display: 'block', width: '100%', height: '100%' }}
                />
              </div>
            ))}
          </div>
          {muscleDetailSelectedGroup ? (
            <div className="home-muscle-detail-selected">
              <div className="home-muscle-detail-row-top">
                <strong>{muscleDetailSelectedGroup.label}</strong>
                <span>{muscleDetailSelectedGroup.effectiveSets} / {muscleDetailSelectedGroup.weeklyTarget} sets</span>
              </div>
              {muscleDetailSelectedGroup.effectiveSets > 0 ? (
                <>
                  <div className="home-muscle-detail-track">
                    <div className={`home-muscle-detail-fill heat-${muscleDetailSelectedGroup.heatBucket}`} style={{ width: `${Math.min(100, muscleDetailSelectedGroup.targetRatio * 100)}%` }} />
                  </div>
                  {muscleDetailSelectedGroup.contributors.length > 0 && (
                    <div className="home-muscle-detail-contributors-list">
                      {muscleDetailSelectedGroup.contributors.map(c => (
                        <div key={c.name} className="home-muscle-detail-contributor-item">
                          <span>{c.rawSets} sets from {c.name}</span>
                          <span className={`home-muscle-detail-contributor-credit ${c.creditPerSet === 1 ? 'credit-primary' : 'credit-secondary'}`}>{c.rawSets} (↑ {c.creditPerSet})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="home-muscle-detail-contributors">Not trained this week</div>
              )}
            </div>
          ) : (
            <div className="home-muscle-detail-model-hint">Tap a muscle to see set details</div>
          )}
          <div className="home-muscle-detail-note">
            <div><span className="home-muscle-detail-note-credit credit-primary">↑ 1.0</span> Sets where muscle group is primary</div>
            <div><span className="home-muscle-detail-note-credit credit-secondary">↑ {SECONDARY_MUSCLE_CREDIT}</span> Sets where muscle group is secondary</div>
          </div>
          {muscleDetailRows.length > 0 ? (
            <div className="home-muscle-detail-list">
              {muscleDetailRows.map(group => {
                const isExpanded = expandedMuscleRows.has(group.key)
                return (
                  <div key={group.key} className="home-muscle-detail-row">
                    <div
                      className="home-muscle-detail-row-top home-muscle-detail-row-toggle"
                      onClick={() => setExpandedMuscleRows(prev => {
                        const next = new Set(prev)
                        isExpanded ? next.delete(group.key) : next.add(group.key)
                        return next
                      })}
                    >
                      <strong>{group.label}</strong>
                      <div className="home-muscle-detail-row-top-right">
                        <span>{group.effectiveSets} / {group.weeklyTarget} sets</span>
                        <span className={`home-muscle-detail-chevron${isExpanded ? ' expanded' : ''}`}>›</span>
                      </div>
                    </div>
                    <div className="home-muscle-detail-track">
                      <div className={`home-muscle-detail-fill heat-${group.heatBucket}`} style={{ width: `${Math.min(100, group.targetRatio * 100)}%` }} />
                    </div>
                    <div className="home-muscle-detail-meta">
                      <span>{group.trainedDayCount} day{group.trainedDayCount === 1 ? '' : 's'}</span>
                      <span>Last: {formatMuscleDate(group.lastTrainedAt)}</span>
                    </div>
                    {isExpanded && group.contributors.length > 0 && (
                      <div className="home-muscle-detail-contributors-list">
                        {group.contributors.map(c => (
                          <div key={c.name} className="home-muscle-detail-contributor-item">
                            <span>{c.rawSets} sets from {c.name}</span>
                            <span className="home-muscle-detail-contributor-right"><span className="home-muscle-detail-contributor-count">{c.rawSets} ×</span> <span className={`home-muscle-detail-contributor-credit ${c.creditPerSet === 1 ? 'credit-primary' : 'credit-secondary'}`}>(↑ {c.creditPerSet})</span></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="home-muscle-detail-empty">No completed strength sets are logged for this week yet.</div>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
