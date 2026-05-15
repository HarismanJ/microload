import { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { App as CapApp } from '@capacitor/app'
import { supabase } from './lib/supabase'
import { clearCache, getCalendarMonthCacheKey, invalidateCache } from './lib/cache'
import LoadingSpinner from './components/LoadingSpinner'
import RestTimePicker from './components/RestWheelPicker'
import {
  createBattleInvite,
  getBattleModeLabel,
  loadActiveBattleRoom,
  loadBattleRecap,
  loadLatestDeclinedBattleInvite,
  loadUnseenBattleResult,
  loadPendingBattleInvite,
  markBattleResultSeen,
  respondToBattleInvite,
} from './lib/battles'
import { cancelRestNotification, scheduleRestEndNotification } from './lib/restNotification'
import { readStoredWorkoutDraft } from './lib/workoutDraft'
import { validateBodyweight } from './lib/inputValidation'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useTheme } from './context/ThemeContext'
import { UserProvider } from './context/UserContext'
import { clearCachedTheme, getCachedThemeForUser, saveThemeForUser } from './lib/theme'
import './App.css'



const Home = lazy(() => import('./components/Home'))
const Workout = lazy(() => import('./components/Workout'))
const Ranks = lazy(() => import('./components/Ranks'))
const Nutrition = lazy(() => import('./components/Nutrition'))
const Profile = lazy(() => import('./components/Profile'))
const Auth = lazy(() => import('./components/Auth'))
const WorkoutSummary = lazy(() => import('./components/WorkoutSummary'))

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function fmtRest(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function displayName(profile) {
  return profile?.full_name || profile?.username || 'Someone'
}

const TAB_ORDER = ['home', 'workout', 'ranks', 'nutrition']
const INTRO_MIN_DURATION_MS = 900
const INTRO_EXIT_DURATION_MS = 520
const INTRO_BAR_SETTLE_MS = 420
const BATTLE_REALTIME_REFRESH_DEBOUNCE_MS = 120
const BATTLE_FOREGROUND_REFRESH_DEBOUNCE_MS = 180
const BATTLE_FALLBACK_POLL_MS = 120 * 1000

function shouldIgnoreTabSwipeTarget(target) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, option, button, a, label, [role="button"], [contenteditable="true"], [draggable="true"], [data-tab-swipe-ignore="true"]'
    )
  )
}

function getTabDirection(currentTab, nextTab) {
  const currentIndex = TAB_ORDER.indexOf(currentTab)
  const nextIndex = TAB_ORDER.indexOf(nextTab)
  if (currentIndex === -1 || nextIndex === -1 || currentIndex === nextIndex) return 'forward'
  return nextIndex > currentIndex ? 'forward' : 'backward'
}

function BrandLogo({ width = 158, height = 36 }) {
  return (
    <svg width={width} height={height} viewBox="-16 0 210 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--blue)' }}/>
      <rect x="9" y="4" width="6" height="40" rx="2" style={{ fill: 'var(--blue)' }}/>
      <rect x="18" y="0" width="6" height="48" rx="2" style={{ fill: 'var(--blue)' }}/>
      <rect x="27" y="4" width="6" height="40" rx="2" style={{ fill: 'var(--blue)' }}/>
      <rect x="36" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--blue)' }}/>
      <text x="50" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="700" fill="#ffffff" letterSpacing="-0.5">
        micro<tspan style={{ fill: 'var(--blue)' }}>load</tspan>
      </text>
    </svg>
  )
}

function InitialReadyMarker({ onReady }) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return null
}

function AppIntroSplash({ exiting = false, ready = false }) {
  const barHeights = [18, 28, 40, 28, 18]
  const [progress, setProgress] = useState(0)
  const readyRef = useRef(ready)
  useEffect(() => { readyRef.current = ready }, [ready])

  useEffect(() => {
    const FILL_DURATION = 1450
    const FILL_TARGET = 83
    const CREEP_TARGET = 92
    const CREEP_DURATION = 9000
    const COMPLETE_DURATION = 360
    const startTime = Date.now()
    let phase = 'filling'
    let idleStart = null
    let completeStart = null
    let completeFromPct = FILL_TARGET
    let raf

    function tick() {
      const now = Date.now()

      if (phase === 'filling') {
        const t = Math.min((now - startTime) / FILL_DURATION, 1)
        setProgress((1 - Math.pow(1 - t, 3)) * FILL_TARGET)
        if (t >= 1) { phase = 'idle'; idleStart = now }
      } else if (phase === 'idle') {
        const t = Math.min((now - idleStart) / CREEP_DURATION, 1)
        const pct = FILL_TARGET + (1 - Math.pow(1 - t, 2)) * (CREEP_TARGET - FILL_TARGET)
        setProgress(pct)
        if (readyRef.current) {
          completeFromPct = pct
          completeStart = now
          phase = 'completing'
        }
      } else if (phase === 'completing') {
        const t = Math.min((now - completeStart) / COMPLETE_DURATION, 1)
        setProgress(completeFromPct + (1 - Math.pow(1 - t, 2)) * (100 - completeFromPct))
        if (t >= 1) return
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={`app-intro ${exiting ? 'app-intro-exit' : ''}`} role="status" aria-live="polite">
      <div className="app-intro-orb app-intro-orb-left" />
      <div className="app-intro-orb app-intro-orb-right" />
      <div className="app-intro-panel">
        <div className="app-intro-logo-shell">
          <div className="app-intro-logo-aura" aria-hidden="true" />
          <div className="app-intro-logo">
            <BrandLogo width={192} height={44} />
          </div>
        </div>
        <div className="app-intro-bars" aria-hidden="true">
          {barHeights.map((height, index) => (
            <span
              key={height + index}
              className="app-intro-bar"
              style={{ height: `${height}px`, animationDelay: `${index * 120}ms` }}
            />
          ))}
        </div>
        <div className="app-intro-progress" aria-hidden="true">
          <div className="app-intro-track">
            <span className="app-intro-track-fill" style={{ width: `${progress}%` }}>
              <span className="app-intro-track-shimmer" />
            </span>
          </div>
          <span className="app-intro-track-pct">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { isOnline, justCameOnline } = useNetworkStatus()
  const { switchTheme } = useTheme()
  const [tab, setTab] = useState('home')
  const [tabTransitionDirection, setTabTransitionDirection] = useState('forward')
  const [tabTransitionTick, setTabTransitionTick] = useState(0)
  const [quickActionSheetOpen, setQuickActionSheetOpen] = useState(false)
  const [overtrain, setOvertrain] = useState(null)
  const [overtrainDismissedKey, setOvertrainDismissedKey] = useState(() => localStorage.getItem('liftlog:overtrainDismissedKey') || null)
  const [startEmptyWorkoutTick, setStartEmptyWorkoutTick] = useState(0)
  const [resumeWorkoutTick, setResumeWorkoutTick] = useState(0)
  const [openAddFoodTick, setOpenAddFoodTick] = useState(0)
  const [quickTimer, setQuickTimer] = useState(null)
  const [quickTimerValue, setQuickTimerValue] = useState(300)
  const [showQuickTimer, setShowQuickTimer] = useState(false)
  const [showQuickWeight, setShowQuickWeight] = useState(false)
  const [quickWeightInput, setQuickWeightInput] = useState('')
  const [quickWeightUnit, setQuickWeightUnit] = useState('kg')
  const [quickWeightSaving, setQuickWeightSaving] = useState(false)
  const [quickWeightError, setQuickWeightError] = useState('')
  const [weightRefreshTick, setWeightRefreshTick] = useState(0)
  const [workoutRefreshTick, setWorkoutRefreshTick] = useState(0)
  const [ranksRefreshTick, setRanksRefreshTick] = useState(0)
  const [appForegroundTick, setAppForegroundTick] = useState(0)
  const [homeWorkoutStreak, setHomeWorkoutStreak] = useState(0)
  const [showStreakInfo, setShowStreakInfo] = useState(false)
  const [session, setSession] = useState(undefined)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [workoutStatus, setWorkoutStatus] = useState({ active: false, resumable: false, seconds: 0 })
  const [restDoneToast, setRestDoneToast] = useState(null)
  const [workoutSummary, setWorkoutSummary] = useState(null)
  const [incomingBattleInvite, setIncomingBattleInvite] = useState(null)
  const [battleDecisionBusy, setBattleDecisionBusy] = useState(false)
  const [battleRoom, setBattleRoom] = useState(null)
  const [battleToast, setBattleToast] = useState('')
  const [initialScreenReady, setInitialScreenReady] = useState(false)
  const [showIntroSplash, setShowIntroSplash] = useState(true)
  const [introSplashExiting, setIntroSplashExiting] = useState(false)
  const [homeIntroMotionReady, setHomeIntroMotionReady] = useState(false)
  const tabRef = useRef('home')
  const battleRoomIdRef = useRef(null)
  const authUserIdRef = useRef(null)
  const lastDeclinedInviteIdRef = useRef(null)
  const surfacedBattleResultRoomIdsRef = useRef(new Set())
  const ignoredActiveBattleRoomIdsRef = useRef(new Set())
  const initialScreenReadyRef = useRef(false)
  const introStartedAtRef = useRef(Date.now())
  const introHideTimerRef = useRef(null)
  const introRemoveTimerRef = useRef(null)
  const homeIntroMotionTimerRef = useRef(null)
  const quickTimerNotificationRef = useRef({ scheduled: false })
  const appWasBackgroundedRef = useRef(false)
  const battleRefreshTimerRef = useRef(null)
  const battleFallbackPollRef = useRef(null)
  const battleRefreshInFlightRef = useRef(false)
  const battleQueuedUserIdRef = useRef(null)
  const battleRealtimeHealthyRef = useRef(true)
  const runBattleRefreshRef = useRef(null)
  const tabSwipeRef = useRef({
    active: false,
    ignore: false,
    startX: 0,
    startY: 0,
  })
  const onWorkoutStatus = useCallback((status) => setWorkoutStatus(status), [])

  // Seed resumable flag immediately from localStorage when session first resolves,
  // before the Workout component's async init (network calls) completes.
  // Workout's onStatusChange will overwrite this with the authoritative value later.
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    const { draft } = readStoredWorkoutDraft(uid)
    if (draft) {
      setWorkoutStatus(s => s.resumable || s.active ? s : { ...s, resumable: true })
    }
  }, [session?.user?.id])

  const onWorkoutFinish = useCallback((summary) => {
    setWorkoutSummary(summary)
    setWorkoutRefreshTick(t => t + 1)
  }, [])
  const markInitialScreenReady = useCallback(() => {
    if (initialScreenReadyRef.current) return
    initialScreenReadyRef.current = true
    setInitialScreenReady(true)
  }, [])

  const dismissIntroSplash = useCallback(() => {
    if (!showIntroSplash || introSplashExiting) return

    const elapsed = Date.now() - introStartedAtRef.current
    const waitMs = Math.max(INTRO_BAR_SETTLE_MS, INTRO_MIN_DURATION_MS - elapsed)

    clearTimeout(introHideTimerRef.current)
    clearTimeout(introRemoveTimerRef.current)

    introHideTimerRef.current = setTimeout(() => {
      setIntroSplashExiting(true)
      introRemoveTimerRef.current = setTimeout(() => {
        setShowIntroSplash(false)
      }, INTRO_EXIT_DURATION_MS)
    }, waitMs)
  }, [introSplashExiting, showIntroSplash])

  const closeQuickActionSheet = useCallback(() => {
    setQuickActionSheetOpen(false)
    setShowQuickWeight(false)
    setQuickWeightError('')
  }, [])

  useEffect(() => {
    if (!showQuickWeight || !session?.user?.id) return
    let cancelled = false

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('unit_preference')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!cancelled && (data?.unit_preference === 'kg' || data?.unit_preference === 'lbs')) {
        setQuickWeightUnit(data.unit_preference)
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [session?.user?.id, showQuickWeight])

  const handleQuickWeightSave = useCallback(async () => {
    const value = Number.parseFloat(quickWeightInput)
    const unit = quickWeightUnit || 'kg'
    if (!session?.user?.id || quickWeightSaving) return
    const weightError = validateBodyweight(quickWeightInput, unit)
    if (weightError) {
      setQuickWeightError(weightError)
      return
    }

    setQuickWeightSaving(true)
    setQuickWeightError('')
    const timestamp = new Date().toISOString()

    try {
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('unit_preference')
        .eq('id', session.user.id)
        .single()

      const unit2 = profileData?.unit_preference || quickWeightUnit || 'kg'

      const [{ error: insertError }, { error: profileUpdateError }] = await Promise.all([
        supabase
          .from('body_weight_logs')
          .insert({ user_id: session.user.id, weight: value, unit: unit2, logged_at: timestamp }),
        supabase
          .from('profiles')
          .update({ bodyweight: value })
          .eq('id', session.user.id),
      ])

      const saveError = profileFetchError || insertError || profileUpdateError
      if (saveError) throw saveError

      setQuickWeightUnit(unit2)
      invalidateCache('home', 'profile', 'ranks', getCalendarMonthCacheKey(timestamp))
      setWeightRefreshTick(t => t + 1)
      setQuickWeightInput('')
      setShowQuickWeight(false)
      setQuickActionSheetOpen(false)
    } catch (error) {
      setQuickWeightError(error?.message || 'Could not save your weight.')
    } finally {
      setQuickWeightSaving(false)
    }
  }, [quickWeightInput, quickWeightSaving, quickWeightUnit, session?.user?.id])

  // Drive the quick timer display with a 250ms interval reading from endTime.
  // No countdown state — seconds are derived from the timestamp so there's no drift.
  const [quickTimerDisplay, setQuickTimerDisplay] = useState(0)
  useEffect(() => {
    if (!quickTimer?.running) {
      const remaining = quickTimer
        ? quickTimer.pausedSecondsLeft ?? 0
        : 0
      setQuickTimerDisplay(remaining)
      return
    }
    const tick = () => {
      if (document.visibilityState === 'hidden') return
      const remaining = Math.max(0, Math.ceil((quickTimer.endTime - Date.now()) / 1000))
      setQuickTimerDisplay(remaining)
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [quickTimer])

  // Schedule notification once when the timer starts or time is adjusted.
  // Only cancel when the user explicitly resets (quickTimer === null) or pauses.
  // Do NOT cancel when the timer completes naturally — the notification should fire.
  useEffect(() => {
    if (!quickTimer) {
      // User reset — cancel any pending notification
      if (quickTimerNotificationRef.current.scheduled) {
        cancelRestNotification('quick')
        quickTimerNotificationRef.current.scheduled = false
      }
      return
    }
    if (!quickTimer.running) {
      // Paused manually — cancel so it doesn't fire while paused
      if (quickTimerNotificationRef.current.scheduled && quickTimer.endTime > Date.now()) {
        cancelRestNotification('quick')
        quickTimerNotificationRef.current.scheduled = false
      }
      return
    }
    const secondsLeft = Math.max(0, Math.ceil((quickTimer.endTime - Date.now()) / 1000))
    scheduleRestEndNotification(secondsLeft, null, {
      kind: 'quick',
      title: 'Timer Complete',
      body: 'Your quick rest timer has finished.',
    })
    quickTimerNotificationRef.current.scheduled = true
  // Re-schedule when endTime changes (user adjusts +5s/-5s) or running flips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickTimer?.endTime, quickTimer?.running, !!quickTimer])

  const navigateToTab = useCallback((nextTab) => {
    const currentTab = tabRef.current
    if (!nextTab || nextTab === currentTab) return
    setQuickActionSheetOpen(false)
    setTabTransitionDirection(getTabDirection(currentTab, nextTab))
    setTabTransitionTick(tick => tick + 1)
    setTab(nextTab)
  }, [])

  useEffect(() => {
    const markBackgrounded = () => {
      appWasBackgroundedRef.current = true
    }

    const markForegrounded = () => {
      if (!appWasBackgroundedRef.current) return
      appWasBackgroundedRef.current = false
      setAppForegroundTick(tick => tick + 1)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markBackgrounded()
        return
      }

      if (document.visibilityState === 'visible') markForegrounded()
    }

    const handlePageShow = () => markForegrounded()

    let cancelled = false
    let appStateListener
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        markForegrounded()
      } else {
        markBackgrounded()
      }
    }).then(handle => {
      if (cancelled) {
        handle.remove()
        return
      }
      appStateListener = handle
    }).catch(() => {})

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', markForegrounded)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      cancelled = true
      appStateListener?.remove()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', markForegrounded)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  const refreshBattleSummary = useCallback(async (roomId) => {
    const userId = session?.user?.id
    if (!roomId || !userId) return

    try {
      const battle = await loadBattleRecap(roomId, userId)
      if (!battle) return
      if (battle.status !== 'waiting') {
        surfacedBattleResultRoomIdsRef.current.add(roomId)
      }
      setWorkoutSummary(prev => (
        prev?.battle?.roomId === roomId
          ? { ...prev, battle }
          : prev
      ))
    } catch {
      // Keep the existing summary if the recap cannot refresh.
    }
  }, [session?.user?.id])

  const maybeShowPendingBattleResult = useCallback(async (userId, hasActiveRoom) => {
    if (!userId || hasActiveRoom) return

    try {
      const battle = await loadUnseenBattleResult(userId)
      if (!battle) return
      if (surfacedBattleResultRoomIdsRef.current.has(battle.roomId)) return

      surfacedBattleResultRoomIdsRef.current.add(battle.roomId)
      ignoredActiveBattleRoomIdsRef.current.delete(battle.roomId)

      setWorkoutSummary(prev => {
        if (prev?.battle?.roomId === battle.roomId) {
          return {
            ...prev,
            battle,
            battleOnly: prev.battleOnly || false,
          }
        }
        if (prev) return prev
        return {
          durationSeconds: battle.yourStats.durationSeconds ?? 0,
          totalSets: battle.yourStats.totalSets ?? 0,
          totalVolume: Math.round(battle.yourStats.totalVolume ?? 0),
          unit: battle.yourStats.unit || 'kg',
          exercises: [],
          rankUps: [],
          newAchievements: [],
          battle,
          battleOnly: true,
        }
      })
    } catch {
      // Keep app usable even if the unseen-result check fails.
    }
  }, [])

  useEffect(() => {
    if (workoutStatus.restTimer?.secondsLeft === 0) {
      setRestDoneToast(current => current || 'workout')
    }
  }, [workoutStatus.restTimer?.secondsLeft])

  useEffect(() => {
    if (!quickTimer?.running || quickTimerDisplay !== 0) return
    if (Date.now() < quickTimer.endTime) return

    setQuickTimer(current => (current ? { ...current, running: false } : null))
    setRestDoneToast(current => current || 'quick')
  }, [quickTimer?.running, quickTimer?.endTime, quickTimerDisplay])

  const dismissRestDoneToast = useCallback(() => {
    if (restDoneToast === 'quick' && quickTimerDisplay === 0) {
      setQuickTimer(null)
      setShowQuickTimer(false)
    }
    setRestDoneToast(null)
  }, [quickTimerDisplay, restDoneToast])

  const hydratePreferredTheme = useCallback(async (userId, { force = false } = {}) => {
    if (!userId) return

    const cachedTheme = getCachedThemeForUser(userId)
    if (cachedTheme && !force) {
      switchTheme(cachedTheme)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('theme')
      .eq('id', userId)
      .single()

    if (data?.theme) {
      saveThemeForUser(data.theme, userId)
      switchTheme(data.theme)
    }
  }, [switchTheme])

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    if (!battleToast) return undefined
    const timer = setTimeout(() => setBattleToast(''), 1800)
    return () => clearTimeout(timer)
  }, [battleToast])

  useEffect(() => {
    // Read synchronously before ANYTHING async runs — onAuthStateChange fires
    // INITIAL_SESSION which triggers clearCache(), which would wipe a localStorage
    // flag before getSession().then() ever gets to check it.
    const pendingRecovery = localStorage.getItem('microload:pendingRecovery') === '1'
    // Detect a fresh web recovery redirect (reset-password.html forwards these params).
    // Used to distinguish a fresh flow (show reset form) from an abandoned one (sign out).
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const isRecoveryUrl = urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery'

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Abandoned recovery: the user opened the reset link before but closed the reset
      // form without completing it. Sign them out so they land on the sign-in page,
      // same as the native flow. Fresh recoveries have isRecoveryUrl=true and are
      // handled by onAuthStateChange instead.
      if (session && pendingRecovery && !isRecoveryUrl) {
        localStorage.removeItem('microload:pendingRecovery')
        await supabase.auth.signOut()
        return
      }
      authUserIdRef.current = session?.user?.id ?? null
      await hydratePreferredTheme(session?.user?.id)
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setSession(session)
        return
      }
      // PKCE recovery flow fires SIGNED_IN, not PASSWORD_RECOVERY — detect via flag
      // set by reset-password.html before it forwards to the main app.
      // Also cover INITIAL_SESSION: if Supabase processed the recovery URL before this
      // listener was registered, new subscribers only get INITIAL_SESSION (not the
      // original SIGNED_IN/PASSWORD_RECOVERY), so we catch it here with the flag.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && localStorage.getItem('microload:pendingRecovery') === '1') {
        // Don't remove pendingRecovery here — it must persist so that if the user
        // closes the reset form without completing it, the next load's getSession
        // check sees the flag and signs them out (abandoned recovery).
        // It is removed by onRecoveryDone on success, or SIGNED_OUT on sign-out.
        setRecoveryMode(true)
        setSession(session)
        return
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('microload:pendingRecovery')
        clearCachedTheme()
        setRecoveryMode(false)
      }
      const nextUserId = session?.user?.id ?? null
      const prevUserId = authUserIdRef.current
      if (prevUserId !== nextUserId) {
        clearCache()
        authUserIdRef.current = nextUserId
        await hydratePreferredTheme(nextUserId, { force: Boolean(nextUserId && prevUserId) })
      }
      setSession(session)
    })

    // Handle deep links from password reset emails on native (microload://reset-password?...)
    let deepLinkListener
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith('microload://')) return
      const parsed = new URL(url)

      // PKCE flow: Supabase sends a `code` query param
      const code = parsed.searchParams.get('code')
      const type = parsed.searchParams.get('type')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        // PKCE flow fires SIGNED_IN, not PASSWORD_RECOVERY — detect type from URL
        if (type === 'recovery') {
          localStorage.setItem('microload:pendingRecovery', '1')
          setRecoveryMode(true)
        }
        return
      }

      // Implicit flow: tokens arrive in the hash fragment
      const params = new URLSearchParams(parsed.hash.slice(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const hashType = params.get('type')
      if (hashType === 'recovery' && accessToken && refreshToken) {
        localStorage.setItem('microload:pendingRecovery', '1')
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        setRecoveryMode(true)
      }
    }).then(handle => { deepLinkListener = handle })

    return () => {
      subscription.unsubscribe()
      deepLinkListener?.remove()
    }
  }, [hydratePreferredTheme])

  useEffect(() => {
    if (session === undefined || !initialScreenReady) return
    dismissIntroSplash()
  }, [dismissIntroSplash, initialScreenReady, session])

  useEffect(() => () => {
    clearTimeout(introHideTimerRef.current)
    clearTimeout(introRemoveTimerRef.current)
    clearTimeout(homeIntroMotionTimerRef.current)
  }, [])

  useEffect(() => {
    clearTimeout(homeIntroMotionTimerRef.current)
    setHomeIntroMotionReady(false)
  }, [session?.user?.id])

  useEffect(() => {
    if (showIntroSplash || !session?.user?.id || homeIntroMotionReady) return

    homeIntroMotionTimerRef.current = setTimeout(() => {
      setHomeIntroMotionReady(true)
    }, 180)

    return () => clearTimeout(homeIntroMotionTimerRef.current)
  }, [homeIntroMotionReady, session?.user?.id, showIntroSplash])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      lastDeclinedInviteIdRef.current = null
      surfacedBattleResultRoomIdsRef.current = new Set()
      ignoredActiveBattleRoomIdsRef.current = new Set()
      return
    }

    try {
      lastDeclinedInviteIdRef.current = localStorage.getItem(`battleDeclinedSeen:${userId}`)
    } catch {
      lastDeclinedInviteIdRef.current = null
    }
    surfacedBattleResultRoomIdsRef.current = new Set()
    ignoredActiveBattleRoomIdsRef.current = new Set()
  }, [session?.user?.id])

  useEffect(() => {
    const roomId = workoutSummary?.battle?.roomId
    if (!roomId || workoutSummary?.battle?.status === 'waiting') return
    surfacedBattleResultRoomIdsRef.current.add(roomId)
  }, [workoutSummary])

  const refreshBattleState = useCallback(async (userId) => {
    if (!userId) return

    const [invite, room, declinedInvite] = await Promise.all([
      loadPendingBattleInvite(userId),
      loadActiveBattleRoom(userId),
      loadLatestDeclinedBattleInvite(userId),
    ])

    const visibleRoom = room?.id && ignoredActiveBattleRoomIdsRef.current.has(room.id) ? null : room

    setIncomingBattleInvite(invite)
    setBattleRoom(visibleRoom)

    if (visibleRoom?.id && battleRoomIdRef.current !== visibleRoom.id) {
      battleRoomIdRef.current = visibleRoom.id
      navigateToTab('workout')
      setBattleToast(`${displayName(visibleRoom.opponentProfile)} is ready to battle.`)
    } else if (!visibleRoom) {
      battleRoomIdRef.current = null
    }

    if (declinedInvite?.id && declinedInvite.id !== lastDeclinedInviteIdRef.current) {
      lastDeclinedInviteIdRef.current = declinedInvite.id
      try {
        localStorage.setItem(`battleDeclinedSeen:${userId}`, declinedInvite.id)
      } catch {
        // Ignore storage issues and still show the toast once for this session.
      }
      setBattleToast(`${displayName(declinedInvite.challengedProfile)} declined your battle challenge.`)
    }

    await maybeShowPendingBattleResult(userId, Boolean(visibleRoom))
  }, [maybeShowPendingBattleResult, navigateToTab])

  const clearBattleRefreshTimer = useCallback(() => {
    clearTimeout(battleRefreshTimerRef.current)
    battleRefreshTimerRef.current = null
  }, [])

  const clearBattleFallbackPoll = useCallback(() => {
    clearInterval(battleFallbackPollRef.current)
    battleFallbackPollRef.current = null
  }, [])

  const runBattleRefresh = useCallback(async (userId) => {
    if (!userId) return

    if (battleRefreshInFlightRef.current) {
      battleQueuedUserIdRef.current = userId
      return
    }

    battleRefreshInFlightRef.current = true

    try {
      await refreshBattleState(userId)
    } finally {
      battleRefreshInFlightRef.current = false
      const queuedUserId = battleQueuedUserIdRef.current
      if (queuedUserId) {
        battleQueuedUserIdRef.current = null
        Promise.resolve().then(() => runBattleRefreshRef.current?.(queuedUserId)).catch(err => console.error('battle refresh failed:', err))
      }
    }
  }, [refreshBattleState])

  useLayoutEffect(() => { runBattleRefreshRef.current = runBattleRefresh })

  const scheduleBattleRefresh = useCallback((userId, { delayMs = 0 } = {}) => {
    if (!userId) return

    clearBattleRefreshTimer()

    if (delayMs <= 0) {
      runBattleRefresh(userId).catch(err => console.error('battle refresh failed:', err))
      return
    }

    battleRefreshTimerRef.current = setTimeout(() => {
      battleRefreshTimerRef.current = null
      runBattleRefresh(userId).catch(err => console.error('battle refresh failed:', err))
    }, delayMs)
  }, [clearBattleRefreshTimer, runBattleRefresh])

  const restartBattleFallbackPoll = useCallback((userId) => {
    clearBattleFallbackPoll()
    if (!userId || battleRealtimeHealthyRef.current) return

    battleFallbackPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      scheduleBattleRefresh(userId)
    }, BATTLE_FALLBACK_POLL_MS)
  }, [clearBattleFallbackPoll, scheduleBattleRefresh])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      clearBattleRefreshTimer()
      clearBattleFallbackPoll()
      battleRefreshInFlightRef.current = false
      battleQueuedUserIdRef.current = null
      battleRealtimeHealthyRef.current = true
      setIncomingBattleInvite(null)
      setBattleRoom(null)
      battleRoomIdRef.current = null
      return
    }

    battleRealtimeHealthyRef.current = true
    scheduleBattleRefresh(userId)

    const scheduleRealtimeRefresh = () => {
      scheduleBattleRefresh(userId, { delayMs: BATTLE_REALTIME_REFRESH_DEBOUNCE_MS })
    }

    const scheduleForegroundRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      scheduleBattleRefresh(userId, { delayMs: BATTLE_FOREGROUND_REFRESH_DEBOUNCE_MS })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      scheduleForegroundRefresh()
    }

    const handleChannelStatus = (status) => {
      if (status === 'SUBSCRIBED') {
        const wasHealthy = battleRealtimeHealthyRef.current
        battleRealtimeHealthyRef.current = true
        clearBattleFallbackPoll()
        if (!wasHealthy) {
          scheduleBattleRefresh(userId)
        }
        return
      }

      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        battleRealtimeHealthyRef.current = false
        restartBattleFallbackPoll(userId)
      }
    }

    const channel = supabase
      .channel(`battle-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_invites', filter: `challenged_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_invites', filter: `challenger_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenger_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenged_id=eq.${userId}` },
        scheduleRealtimeRefresh
      )
      .subscribe(handleChannelStatus)

    window.addEventListener('focus', scheduleForegroundRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearBattleRefreshTimer()
      clearBattleFallbackPoll()
      battleQueuedUserIdRef.current = null
      window.removeEventListener('focus', scheduleForegroundRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [
    clearBattleFallbackPoll,
    clearBattleRefreshTimer,
    restartBattleFallbackPoll,
    scheduleBattleRefresh,
    session?.user?.id,
  ])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !justCameOnline) return
    scheduleBattleRefresh(userId)
  }, [justCameOnline, scheduleBattleRefresh, session?.user?.id])

  const handleChallengeFriend = useCallback(async (friendship, battleMode = 'hybrid') => {
    const userId = session?.user?.id
    if (!userId) return

    const invite = await createBattleInvite(userId, friendship.otherUserId, battleMode)
    setBattleToast(
      invite?.reused
        ? `A challenge with ${displayName(friendship.otherProfile)} is already pending.`
        : `${getBattleModeLabel(battleMode)} challenge sent to ${displayName(friendship.otherProfile)}.`
    )
  }, [session])

  const handleNavigate = useCallback((nextTarget) => {
    if (typeof nextTarget !== 'string') return
    navigateToTab(nextTarget)
  }, [navigateToTab])


  const switchTabByOffset = useCallback((offset) => {
    const currentIndex = TAB_ORDER.indexOf(tab)
    if (currentIndex === -1) return

    const nextTab = TAB_ORDER[currentIndex + offset]
    if (!nextTab) return

    handleNavigate(nextTab)
  }, [handleNavigate, tab])

  const handleTabSwipeStart = useCallback((event) => {
    const touch = event.touches?.[0]
    if (!touch) return

    tabSwipeRef.current = {
      active: true,
      ignore: event.touches.length > 1 || shouldIgnoreTabSwipeTarget(event.target),
      startX: touch.clientX,
      startY: touch.clientY,
    }
  }, [])

  const handleTabSwipeEnd = useCallback((event) => {
    const state = tabSwipeRef.current
    tabSwipeRef.current = { active: false, ignore: false, startX: 0, startY: 0 }

    if (!state.active || state.ignore) return

    const touch = event.changedTouches?.[0]
    if (!touch) return

    const deltaX = touch.clientX - state.startX
    const deltaY = touch.clientY - state.startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX < 56) return
    if (absX <= absY * 1.2) return

    switchTabByOffset(deltaX < 0 ? 1 : -1)
  }, [switchTabByOffset])

  const handleTabSwipeCancel = useCallback(() => {
    tabSwipeRef.current = { active: false, ignore: false, startX: 0, startY: 0 }
  }, [])

  const handleBattleInviteResponse = useCallback(async (action) => {
    if (!incomingBattleInvite || !session?.user?.id) return

    setBattleDecisionBusy(true)
    try {
      await respondToBattleInvite(incomingBattleInvite, action)
      await refreshBattleState(session.user.id)
      if (action === 'declined') {
        setBattleToast(`You declined ${displayName(incomingBattleInvite.challengerProfile)}'s battle.`)
      }
    } finally {
      setBattleDecisionBusy(false)
    }
  }, [incomingBattleInvite, session, refreshBattleState])

  const introSplash = showIntroSplash ? <AppIntroSplash exiting={introSplashExiting} ready={initialScreenReady} /> : null
  const appFallback = showIntroSplash ? null : <LoadingSpinner fullPage />

  const handleWorkoutDeleted = useCallback(() => setRanksRefreshTick(t => t + 1), [])
  const otherScreens = useMemo(() => {
    if (!session?.user?.id) return {}
    return {
      home: <Home userId={session.user.id} splashDone={!showIntroSplash} introMotionReady={homeIntroMotionReady} useStartupSnapshot={!initialScreenReady} onNavigate={handleNavigate} onWorkoutStreakChange={setHomeWorkoutStreak} onInitialReady={markInitialScreenReady} weightRefreshTick={weightRefreshTick} workoutRefreshTick={workoutRefreshTick} onWorkoutDeleted={handleWorkoutDeleted} workoutActive={workoutStatus.active} onOvertrain={setOvertrain} isVisible={tab === 'home'} appForegroundTick={appForegroundTick} />,
      ranks: <Ranks refreshTick={ranksRefreshTick} />,
      nutrition: <Nutrition openAddFoodTick={openAddFoodTick} />,
      profile: <Profile onChallenge={handleChallengeFriend} onWorkoutDeleted={handleWorkoutDeleted} workoutActive={workoutStatus.active} />,
    }
  }, [session, showIntroSplash, homeIntroMotionReady, initialScreenReady, handleNavigate, setHomeWorkoutStreak, markInitialScreenReady, weightRefreshTick, workoutRefreshTick, handleWorkoutDeleted, ranksRefreshTick, openAddFoodTick, handleChallengeFriend, workoutStatus.active, setOvertrain, tab, appForegroundTick])

  if (session === undefined) return introSplash || <LoadingSpinner fullPage />
  if (!session || recoveryMode) {
    return (
      <>
        <Suspense fallback={appFallback}>
          <InitialReadyMarker onReady={markInitialScreenReady} />
          <Auth recoveryMode={recoveryMode} onRecoveryDone={() => { localStorage.removeItem('microload:pendingRecovery'); setRecoveryMode(false) }} />
        </Suspense>
        {introSplash}
      </>
    )
  }

  const overtrainKey = overtrain?.hasWarning
    ? `${overtrain.goal || 'default'}:${overtrain.signals.map(s => `${s.type}:${s.key}`).sort().join(',')}`
    : null
  const overtrainBannerVisible = overtrainKey !== null && overtrainKey !== overtrainDismissedKey

  const overtrainBannerContent = (() => {
    const ps = overtrain?.primarySignal
    if (!ps) return null
    const multipleSignals = (overtrain?.signals?.length ?? 0) > 1
    const suffix = multipleSignals ? ' Review the Muscles Worked section for details.' : ''
    if (ps.type === 'overuse') {
      const ratio = ps.targetRatio != null ? ps.targetRatio.toFixed(1) : '?'
      return {
        title: `${ps.label} trained at ${ratio}× weekly target`,
        body: `Repeating this without extra recovery may increase fatigue and injury risk.${suffix}`,
      }
    }
    if (ps.type === 'volume_spike') {
      const pct = Math.round((ps.spikePct ?? 0) * 100)
      return {
        title: `Volume for ${ps.label} jumped ${pct}% vs last week`,
        body: `A sudden spike beyond 50% week-over-week is a common overreaching trigger. Ease back to last week's level before progressing.${suffix}`,
      }
    }
    if (ps.type === 'low_baseline_high_volume') {
      return {
        title: `High volume for ${ps.label} after low recent training`,
        body: `${ps.label} accumulated ${ps.currentSets} effective sets this week with little volume the week before. Ramp up more gradually to let your body adapt.${suffix}`,
      }
    }
    if (ps.type === 'high_frequency') {
      return {
        title: `${ps.label} trained ${ps.trainedDayCount} times this week`,
        body: `${ps.label} was last worked ${ps.hoursSinceLast} hours ago. Allowing 48 hours before the next session supports full recovery.${suffix}`,
      }
    }
    return null
  })()

  const profileButtonLabel = displayName(session?.user?.user_metadata) || session?.user?.email || 'Profile'
  const tabs = [
    {
      id: 'home', label: 'Home',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    },
    {
      id: 'workout', label: 'Workout',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
    },
    {
      id: 'ranks', label: 'Ranks',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    },
    {
      id: 'nutrition', label: 'Nutrition',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="10" ry="4"/><path d="M2 12c0 4.42 4.48 8 10 8s10-3.58 10-8"/><path d="M2 12c0-1.5 1.5-3 4-4"/></svg>
    },
  ]
  const leftTabs = tabs.slice(0, 2)
  const rightTabs = tabs.slice(2)
  const contentScreenClassName = `content-screen content-screen-${tabTransitionDirection} content-screen-${tabTransitionTick % 2}`

  return (
    <UserProvider user={session.user}>
      <>
        <div className="app">
        <header className="topbar">
          <div className="topbar-inner">
            <button className="topbar-brand" onClick={() => handleNavigate('home')} aria-label="Go to Home">
              <BrandLogo />
            </button>
            <div className="topbar-actions">
              {tab === 'home' && (
                <button
                  type="button"
                  className={`topbar-home-streak ${homeWorkoutStreak === 0 ? 'topbar-home-streak-none' : ''}${homeIntroMotionReady ? ' topbar-home-streak--animate' : ''}`}
                  onClick={() => setShowStreakInfo(true)}
                >
                  <span className="topbar-home-streak-fire">{homeWorkoutStreak > 0 ? '🔥' : '—'}</span>
                  <span className="topbar-home-streak-text">
                    {homeWorkoutStreak > 0 ? `${homeWorkoutStreak} ${homeWorkoutStreak === 1 ? 'day' : 'days'} streak` : 'No streak'}
                  </span>
                </button>
              )}
              {tab === 'workout' && overtrainKey !== null && (
                <button
                  type="button"
                  className="topbar-bell-btn"
                  onClick={() => {
                    if (overtrainBannerVisible) {
                      localStorage.setItem('liftlog:overtrainDismissedKey', overtrainKey)
                      setOvertrainDismissedKey(overtrainKey)
                    } else {
                      localStorage.removeItem('liftlog:overtrainDismissedKey')
                      setOvertrainDismissedKey(null)
                    }
                  }}
                  aria-label="View training load advisory"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                  {!overtrainBannerVisible && <span className="topbar-bell-dot" />}
                </button>
              )}
              <button
                className={`topbar-profile-btn ${tab === 'profile' ? 'active' : ''}`}
                onClick={() => handleNavigate('profile')}
                aria-label={`Open profile for ${profileButtonLabel}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="topbar-profile-plus">+</span>
              </button>
            </div>
          </div>
        </header>

        <main
          className={`content${workoutStatus.active && tab !== 'workout' ? ' content-workout-banner' : ''}`}
          onTouchStart={handleTabSwipeStart}
          onTouchEnd={handleTabSwipeEnd}
          onTouchCancel={handleTabSwipeCancel}
        >
          <Suspense fallback={appFallback}>
            <div className={tab === 'workout' ? contentScreenClassName : 'content-screen-hidden'}>
              {overtrainBannerVisible && overtrainBannerContent && (
                <div className={`home-overtrain-banner severity-${overtrain.severity}`}>
                  <div className="home-overtrain-banner-header">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>Training Load Advisory</span>
                    <span className={`home-overtrain-banner-severity-chip severity-${overtrain.severity}`}>
                      {overtrain.severity === 'high' ? 'High Risk' : overtrain.severity === 'moderate' ? 'Moderate Risk' : 'Low Risk'}
                    </span>
                    <button
                      type="button"
                      className="home-overtrain-banner-dismiss"
                      onClick={() => { localStorage.setItem('liftlog:overtrainDismissedKey', overtrainKey); setOvertrainDismissedKey(overtrainKey) }}
                      aria-label="Dismiss training load advisory"
                    >×</button>
                  </div>
                  <p className="home-overtrain-banner-title">{overtrainBannerContent.title}</p>
                  <p className="home-overtrain-banner-body">{overtrainBannerContent.body}</p>
                </div>
              )}
              <Workout
                onStatusChange={onWorkoutStatus}
                onFinish={onWorkoutFinish}
                battleRoom={battleRoom}
                startEmptyWorkoutTick={startEmptyWorkoutTick}
                resumeWorkoutTick={resumeWorkoutTick}
                isVisible={tab === 'workout'}
                onBattleRoomClosed={(status) => {
                  const closedRoomId = battleRoomIdRef.current
                  if ((status === 'waiting' || status === 'left') && closedRoomId) {
                    ignoredActiveBattleRoomIdsRef.current.add(closedRoomId)
                  } else if (closedRoomId) {
                    ignoredActiveBattleRoomIdsRef.current.delete(closedRoomId)
                  }
                  setBattleRoom(null)
                  battleRoomIdRef.current = null
                  if (status === 'cancelled') {
                    setBattleToast('Your friend left the battle. Your workout is continuing solo.')
                  } else if (status === 'left') {
                    setBattleToast('You left the battle.')
                  } else if (status === 'finished') {
                    setBattleToast('Battle finished.')
                    if (closedRoomId) refreshBattleSummary(closedRoomId)
                  }
                }}
              />
            </div>
            {tab !== 'workout' && (
              <div className={contentScreenClassName}>
                {otherScreens[tab]}
              </div>
            )}
          </Suspense>
        </main>

        {workoutStatus.active && tab !== 'workout' && (
          <div className={`workout-banner ${workoutStatus.restTimer?.secondsLeft > 0 ? 'workout-banner-resting' : ''}`} onClick={() => navigateToTab('workout')}>
            <div className="workout-banner-left">
              <span className="workout-banner-dot" />
              <span className="workout-banner-label">
                {workoutStatus.restTimer?.secondsLeft > 0 ? 'Resting' : 'Workout in progress'}
              </span>
            </div>
            {workoutStatus.restTimer?.secondsLeft > 0
              ? <span className="workout-banner-rest">{fmtRest(workoutStatus.restTimer.secondsLeft)}</span>
              : <span className="workout-banner-time">{fmtTime(workoutStatus.seconds)}</span>
            }
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        )}

        {workoutSummary && (
          <Suspense fallback={null}>
            <WorkoutSummary
              summary={workoutSummary}
              onDismiss={async () => {
                const battleResultRoomId = workoutSummary?.battle?.roomId ?? null
                const shouldMarkBattleSeen = Boolean(
                  battleResultRoomId
                  && workoutSummary?.battle
                  && workoutSummary.battle.status !== 'waiting'
                )
                if (shouldMarkBattleSeen) {
                  surfacedBattleResultRoomIdsRef.current.add(battleResultRoomId)
                }
                setWorkoutSummary(null)
                if (shouldMarkBattleSeen && session?.user?.id) {
                  try {
                    await markBattleResultSeen(battleResultRoomId, session.user.id)
                  } catch {
                    // If marking as seen fails, the result can appear again later.
                  }
                }
              }}
            />
          </Suspense>
        )}

        {incomingBattleInvite && !battleRoom && (
          <div className="battle-invite-overlay">
            <div className="battle-invite-modal">
              <div className="battle-invite-pill">Battle Invite</div>
              <div className="battle-invite-title">{`${displayName(incomingBattleInvite.challengerProfile)} challenged you`}</div>
              <div className="battle-invite-body">
                {`${getBattleModeLabel(incomingBattleInvite.battle_mode)} battle. Accept to jump into a shared workout. You will both start in a new empty workout, and completed sets will update live.`}
              </div>
              <div className="battle-invite-actions">
                <button
                  className="battle-invite-decline"
                  onClick={() => handleBattleInviteResponse('declined')}
                  disabled={battleDecisionBusy}
                >
                  {battleDecisionBusy ? 'Working...' : 'Decline'}
                </button>
                <button
                  className="battle-invite-accept"
                  onClick={() => handleBattleInviteResponse('accepted')}
                  disabled={battleDecisionBusy}
                >
                  {battleDecisionBusy ? 'Working...' : 'Accept'}
                </button>
              </div>
            </div>
          </div>
        )}

        {battleToast && (
          <div className="battle-toast" onClick={() => setBattleToast('')}>
            {battleToast}
          </div>
        )}

        {restDoneToast && (
          <div className="rest-done-overlay">
            <div className="rest-done-modal">
              <div className="rest-done-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="rest-done-title">{restDoneToast === 'quick' ? 'Timer Complete' : 'Rest Complete'}</div>
              <div className="rest-done-body">
                {restDoneToast === 'quick' ? 'Your quick rest timer has finished.' : 'Your workout rest timer has finished.'}
              </div>
              <button className="rest-done-btn" onClick={dismissRestDoneToast}>OK</button>
            </div>
          </div>
        )}

        {showStreakInfo && (
          <div className="rest-done-overlay" onClick={() => setShowStreakInfo(false)}>
            <div className="rest-done-modal streak-info-modal" onClick={event => event.stopPropagation()}>
              <div className="rest-done-icon streak-info-icon">
                <span>🔥</span>
              </div>
              <div className="rest-done-title">Streak Info</div>
              <div className="rest-done-body streak-info-body">
                Your streak stays alive as long as you do not miss more than 3 days in a row without a workout. If you go 4 straight days without training, your streak resets.
              </div>
              <button className="rest-done-btn" onClick={() => setShowStreakInfo(false)}>OK</button>
            </div>
          </div>
        )}

        {quickActionSheetOpen && (
          <div className="quick-action-overlay" data-tab-swipe-ignore="true" onClick={() => {
            closeQuickActionSheet()
          }}>
            <div className="quick-action-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="quick-action-handle" />
              <div className="quick-action-title">Quick Add</div>
              <button className="quick-action-btn quick-action-btn-primary" onClick={() => {
                closeQuickActionSheet()
                if (workoutStatus.resumable) {
                  navigateToTab('workout')
                  setResumeWorkoutTick(t => t + 1)
                } else {
                  navigateToTab('workout')
                  setStartEmptyWorkoutTick(t => t + 1)
                }
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8h12M6 16h12"/>
                  <rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/>
                  <rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/>
                </svg>
                <span>{workoutStatus.resumable ? 'Resume Workout' : 'Start Empty Workout'}</span>
              </button>
              <button className="quick-action-btn quick-action-btn-secondary" onClick={() => {
                closeQuickActionSheet()
                navigateToTab('nutrition')
                setOpenAddFoodTick(t => t + 1)
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2a2 2 0 012 2"/>
                  <path d="M17 6c1.7 1.4 3 3.7 3 7 0 4.4-3.6 8-8 8S4 17.4 4 13c0-3.3 1.3-5.6 3-7"/>
                  <path d="M12 6v4"/>
                </svg>
                <span>Log Food</span>
              </button>
              <button
                className={`quick-action-btn quick-action-btn-secondary ${showQuickWeight ? 'quick-action-btn-timer-active' : ''}`}
                onClick={() => {
                  setShowQuickWeight(open => !open)
                  setShowQuickTimer(false)
                  setQuickWeightError('')
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4h12" />
                  <path d="M8 4v4a4 4 0 0 0 8 0V4" />
                  <path d="M12 8v12" />
                  <path d="M9 20h6" />
                </svg>
                <span>Add Body Weight</span>
              </button>
              <button
                className={`quick-action-btn quick-action-btn-secondary ${showQuickTimer || quickTimer ? 'quick-action-btn-timer-active' : ''}`}
                onClick={() => {
                  setShowQuickTimer(open => !open)
                  setShowQuickWeight(false)
                  setQuickWeightError('')
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="13" r="8"/>
                  <path d="M12 9v4l2.5 2.5"/>
                  <path d="M9 2h6"/>
                </svg>
                <span>{quickTimer ? `Rest Timer ${fmtRest(quickTimerDisplay)}` : 'Rest Timer'}</span>
              </button>
              {(showQuickTimer || quickTimer) && (
                <div className="quick-timer-card">
                  {!quickTimer ? (
                    <>
                      <RestTimePicker value={quickTimerValue} onChange={setQuickTimerValue} />
                      <button
                        className="quick-timer-start"
                        onClick={() => setQuickTimer({ endTime: Date.now() + quickTimerValue * 1000, total: quickTimerValue, running: true })}
                      >
                        Start
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="quick-timer-name">{quickTimerDisplay === 0 ? "Time's up!" : 'Countdown'}</div>
                      <div className="quick-timer-countdown" style={{ color: quickTimerDisplay === 0 ? '#22c55e' : 'var(--blue)' }}>
                        {fmtRest(quickTimerDisplay)}
                      </div>
                      <div className="quick-timer-track">
                        <div
                          className="quick-timer-fill"
                          style={{
                            width: `${(quickTimerDisplay / quickTimer.total) * 100}%`,
                            background: quickTimerDisplay === 0 ? '#22c55e' : 'var(--blue)',
                          }}
                        />
                      </div>
                      <div className="quick-timer-actions">
                        <button className="quick-timer-step" onClick={() => setQuickTimer(current => {
                          if (!current) return null
                          if (current.running) {
                            const newEnd = Math.max(Date.now(), current.endTime - 5000)
                            return { ...current, endTime: newEnd }
                          }
                          return { ...current, pausedSecondsLeft: Math.max(0, (current.pausedSecondsLeft ?? 0) - 5) }
                        })}>−5s</button>
                        {quickTimerDisplay > 0 ? (
                          <button className="quick-timer-pause" onClick={() => setQuickTimer(current => {
                            if (!current) return null
                            if (current.running) {
                              // Pause: store remaining seconds
                              return { ...current, running: false, pausedSecondsLeft: Math.max(0, Math.ceil((current.endTime - Date.now()) / 1000)) }
                            }
                            // Resume: set new endTime from remaining
                            return { ...current, running: true, endTime: Date.now() + (current.pausedSecondsLeft ?? 0) * 1000 }
                          })}>
                            {quickTimer.running ? 'Pause' : 'Resume'}
                          </button>
                        ) : (
                          <button className="quick-timer-pause" onClick={() => { setQuickTimer(null); setShowQuickTimer(false) }}>
                            Done
                          </button>
                        )}
                        <button className="quick-timer-step" onClick={() => setQuickTimer(current => {
                          if (!current) return null
                          if (current.running) {
                            return { ...current, endTime: current.endTime + 5000 }
                          }
                          return { ...current, pausedSecondsLeft: (current.pausedSecondsLeft ?? 0) + 5 }
                        })}>+5s</button>
                      </div>
                      <button className="quick-timer-reset" onClick={() => { setQuickTimer(null); setShowQuickTimer(false) }}>
                        Reset
                      </button>
                    </>
                  )}
                </div>
              )}
              {showQuickWeight && (
                <div className="quick-weight-card">
                  <div className="quick-weight-note">Uses your preferred unit: {quickWeightUnit}</div>
                  <div className="quick-weight-row">
                    <input
                      className="quick-weight-input"
                      type="number"
                      inputMode="decimal"
                      min={quickWeightUnit === 'lbs' ? '44.1' : '20'}
                      max={quickWeightUnit === 'lbs' ? '1322.8' : '600'}
                      step="0.1"
                      placeholder={`Enter weight (${quickWeightUnit})`}
                      value={quickWeightInput}
                      onChange={(event) => setQuickWeightInput(event.target.value)}
                    />
                    <button
                      className="quick-weight-save"
                      onClick={handleQuickWeightSave}
                      disabled={quickWeightSaving || !quickWeightInput.trim()}
                    >
                      {quickWeightSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {quickWeightError && <div className="quick-weight-error">{quickWeightError}</div>}
                </div>
              )}
              <button className="quick-action-cancel" onClick={() => {
                closeQuickActionSheet()
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {(!isOnline || justCameOnline) && (
          <div className={`offline-banner${justCameOnline ? ' offline-banner-back' : ''}`}>
            <span className="offline-banner-dot" />
            {justCameOnline ? 'Back online' : 'No internet — changes won\'t save'}
          </div>
        )}

        <nav className="tabbar">
          <div className="tabbar-group">
            {leftTabs.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => handleNavigate(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
          <button
            className={`tab-plus-btn ${quickActionSheetOpen ? 'active' : ''}`}
            onClick={() => {
              setQuickActionSheetOpen(open => !open)
              if (quickTimer) setShowQuickTimer(true)
            }}
            aria-label="Open quick actions"
            data-tab-swipe-ignore="true"
          >
            <span className="tab-plus-icon">+</span>
            {quickTimer && <span className="tab-plus-timer-badge">{fmtRest(quickTimerDisplay)}</span>}
          </button>
          <div className="tabbar-group">
            {rightTabs.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => handleNavigate(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
        </div>
        {introSplash}
      </>
    </UserProvider>
  )
}
