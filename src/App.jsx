import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { clearCache, invalidateCache } from './lib/cache'
import LoadingSpinner from './components/LoadingSpinner'
import RestTimePicker from './components/RestWheelPicker'
import {
  createBattleInvite,
  loadActiveBattleRoom,
  loadBattleRecap,
  loadLatestDeclinedBattleInvite,
  loadUnseenBattleResult,
  loadPendingBattleInvite,
  markBattleResultSeen,
  respondToBattleInvite,
} from './lib/battles'
import { cancelRestNotification, scheduleRestEndNotification } from './lib/restNotification'
import { convertWeight } from './lib/liftMath'
import { useNetworkStatus } from './hooks/useNetworkStatus'
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

function getCalendarMonthCacheKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  return `cal_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const TAB_ORDER = ['home', 'workout', 'ranks', 'nutrition']
const INTRO_MIN_DURATION_MS = 900
const INTRO_EXIT_DURATION_MS = 520
const INTRO_BAR_SETTLE_MS = 420

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
  const [tab, setTab] = useState('home')
  const [tabTransitionDirection, setTabTransitionDirection] = useState('forward')
  const [tabTransitionTick, setTabTransitionTick] = useState(0)
  const [quickActionSheetOpen, setQuickActionSheetOpen] = useState(false)
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
  const quickTimerNotificationRef = useRef({ running: false, secondsLeft: null })
  const tabSwipeRef = useRef({
    active: false,
    ignore: false,
    startX: 0,
    startY: 0,
  })
  const onWorkoutStatus = useCallback((status) => setWorkoutStatus(status), [])
  const onWorkoutFinish = useCallback((summary) => setWorkoutSummary(summary), [])
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
    if (!session?.user?.id || !Number.isFinite(value) || value <= 0 || quickWeightSaving) return

    const unit = quickWeightUnit || 'kg'
    if (convertWeight(value, unit, 'kg') > 600) {
      setQuickWeightError('Weight cannot exceed 600 kg.')
      return
    }

    setQuickWeightSaving(true)
    setQuickWeightError('')
    const timestamp = new Date().toISOString()

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

    if (profileFetchError || insertError || profileUpdateError) {
      setQuickWeightSaving(false)
      setQuickWeightError(profileFetchError?.message || insertError?.message || profileUpdateError?.message || 'Could not save your weight.')
      return
    }

    setQuickWeightUnit(unit2)
    invalidateCache('home', 'profile', 'ranks', getCalendarMonthCacheKey(timestamp))
    setWeightRefreshTick(t => t + 1)
    setQuickWeightInput('')
    setShowQuickWeight(false)
    setQuickActionSheetOpen(false)
    setQuickWeightSaving(false)
  }, [quickWeightInput, quickWeightSaving, quickWeightUnit, session?.user?.id])

  useEffect(() => {
    if (!quickTimer?.running) return
    if (quickTimer.secondsLeft <= 0) return
    const timer = setTimeout(() => {
      setQuickTimer(current => current ? { ...current, secondsLeft: current.secondsLeft - 1 } : null)
    }, 1000)
    return () => clearTimeout(timer)
  }, [quickTimer])

  useEffect(() => {
    const prev = quickTimerNotificationRef.current

    if (!quickTimer || !quickTimer.running || quickTimer.secondsLeft <= 0) {
      if (prev.running || (prev.secondsLeft ?? 0) > 0) {
        cancelRestNotification('quick')
      }
      quickTimerNotificationRef.current = {
        running: !!quickTimer?.running,
        secondsLeft: quickTimer?.secondsLeft ?? null,
      }
      return
    }

    const shouldReschedule = (
      !prev.running
      || prev.secondsLeft === null
      || quickTimer.secondsLeft !== prev.secondsLeft - 1
    )

    if (shouldReschedule) {
      scheduleRestEndNotification(quickTimer.secondsLeft, null, {
        kind: 'quick',
        title: 'Timer Complete',
        body: 'Your quick rest timer has finished.',
      })
    }

    quickTimerNotificationRef.current = {
      running: quickTimer.running,
      secondsLeft: quickTimer.secondsLeft,
    }
  }, [quickTimer])

  const navigateToTab = useCallback((nextTab) => {
    const currentTab = tabRef.current
    if (!nextTab || nextTab === currentTab) return
    setQuickActionSheetOpen(false)
    setTabTransitionDirection(getTabDirection(currentTab, nextTab))
    setTabTransitionTick(tick => tick + 1)
    setTab(nextTab)
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
    if (!quickTimer?.running || quickTimer.secondsLeft !== 0) return

    setQuickTimer(current => (current ? { ...current, running: false } : null))
    setRestDoneToast(current => current || 'quick')
  }, [quickTimer?.running, quickTimer?.secondsLeft])

  const dismissRestDoneToast = useCallback(() => {
    if (restDoneToast === 'quick' && quickTimer?.secondsLeft === 0) {
      setQuickTimer(null)
      setShowQuickTimer(false)
    }
    setRestDoneToast(null)
  }, [quickTimer?.secondsLeft, restDoneToast])

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    if (!battleToast) return undefined
    const timer = setTimeout(() => setBattleToast(''), 1800)
    return () => clearTimeout(timer)
  }, [battleToast])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      authUserIdRef.current = session?.user?.id ?? null
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setSession(session)
        return
      }
      const nextUserId = session?.user?.id ?? null
      if (authUserIdRef.current !== nextUserId) {
        clearCache()
        authUserIdRef.current = nextUserId
      }
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

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

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      setIncomingBattleInvite(null)
      setBattleRoom(null)
      battleRoomIdRef.current = null
      return
    }

    refreshBattleState(userId)

    const refreshNow = () => { refreshBattleState(userId) }

    const channel = supabase
      .channel(`battle-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_invites', filter: `challenged_id=eq.${userId}` },
        () => { refreshBattleState(userId) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battle_invites', filter: `challenger_id=eq.${userId}` },
        () => { refreshBattleState(userId) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenger_id=eq.${userId}` },
        () => { refreshBattleState(userId) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workout_rooms', filter: `challenged_id=eq.${userId}` },
        () => { refreshBattleState(userId) }
      )
      .subscribe()

    const poll = setInterval(refreshNow, 30000)
    window.addEventListener('focus', refreshNow)
    document.addEventListener('visibilitychange', refreshNow)

    return () => {
      clearInterval(poll)
      window.removeEventListener('focus', refreshNow)
      document.removeEventListener('visibilitychange', refreshNow)
      supabase.removeChannel(channel)
    }
  }, [refreshBattleState, session?.user?.id])

  async function handleChallengeFriend(friendship) {
    const userId = session?.user?.id
    if (!userId) return

    const invite = await createBattleInvite(userId, friendship.otherUserId)
    setBattleToast(
      invite?.reused
        ? `A challenge with ${displayName(friendship.otherProfile)} is already pending.`
        : `Challenge sent to ${displayName(friendship.otherProfile)}.`
    )
  }

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

  async function handleBattleInviteResponse(action) {
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
  }

  const introSplash = showIntroSplash ? <AppIntroSplash exiting={introSplashExiting} ready={initialScreenReady} /> : null
  const appFallback = showIntroSplash ? null : <LoadingSpinner fullPage />

  if (session === undefined) return introSplash || <LoadingSpinner fullPage />
  if (!session || recoveryMode) {
    return (
      <>
        <Suspense fallback={appFallback}>
          <InitialReadyMarker onReady={markInitialScreenReady} />
          <Auth recoveryMode={recoveryMode} onRecoveryDone={() => setRecoveryMode(false)} />
        </Suspense>
        {introSplash}
      </>
    )
  }
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
  const otherScreens = {
    home: <Home userId={session.user.id} splashDone={!showIntroSplash} introMotionReady={homeIntroMotionReady} useStartupSnapshot={!initialScreenReady} onNavigate={handleNavigate} onWorkoutStreakChange={setHomeWorkoutStreak} onInitialReady={markInitialScreenReady} weightRefreshTick={weightRefreshTick} />,
    ranks: <Ranks />,
    nutrition: <Nutrition openAddFoodTick={openAddFoodTick} />,
    profile: <Profile onChallenge={handleChallengeFriend} />,
  }
  const contentScreenClassName = `content-screen content-screen-${tabTransitionDirection} content-screen-${tabTransitionTick % 2}`

  return (
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
              <button
                className={`topbar-profile-btn ${tab === 'profile' ? 'active' : ''}`}
                onClick={() => handleNavigate('profile')}
                aria-label={`Open profile for ${profileButtonLabel}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main
          className="content"
          onTouchStart={handleTabSwipeStart}
          onTouchEnd={handleTabSwipeEnd}
          onTouchCancel={handleTabSwipeCancel}
        >
          <Suspense fallback={appFallback}>
            <div className={tab === 'workout' ? contentScreenClassName : 'content-screen-hidden'}>
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
                Accept to jump into a shared battle workout. You will both start in a new empty workout, and completed sets will update live.
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
                <span>Log Meal</span>
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
                <span>{quickTimer ? `Rest Timer ${fmtRest(quickTimer.secondsLeft)}` : 'Rest Timer'}</span>
              </button>
              {(showQuickTimer || quickTimer) && (
                <div className="quick-timer-card">
                  {!quickTimer ? (
                    <>
                      <RestTimePicker value={quickTimerValue} onChange={setQuickTimerValue} />
                      <button
                        className="quick-timer-start"
                        onClick={() => setQuickTimer({ secondsLeft: quickTimerValue, total: quickTimerValue, running: true })}
                      >
                        Start
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="quick-timer-name">{quickTimer.secondsLeft === 0 ? "Time's up!" : 'Countdown'}</div>
                      <div className="quick-timer-countdown" style={{ color: quickTimer.secondsLeft === 0 ? '#22c55e' : 'var(--blue)' }}>
                        {fmtRest(quickTimer.secondsLeft)}
                      </div>
                      <div className="quick-timer-track">
                        <div
                          className="quick-timer-fill"
                          style={{
                            width: `${(quickTimer.secondsLeft / quickTimer.total) * 100}%`,
                            background: quickTimer.secondsLeft === 0 ? '#22c55e' : 'var(--blue)',
                          }}
                        />
                      </div>
                      <div className="quick-timer-actions">
                        <button className="quick-timer-step" onClick={() => setQuickTimer(current => current ? { ...current, secondsLeft: Math.max(0, current.secondsLeft - 5) } : null)}>−5s</button>
                        {quickTimer.secondsLeft > 0 ? (
                          <button className="quick-timer-pause" onClick={() => setQuickTimer(current => current ? { ...current, running: !current.running } : null)}>
                            {quickTimer.running ? 'Pause' : 'Resume'}
                          </button>
                        ) : (
                          <button className="quick-timer-pause" onClick={() => { setQuickTimer(null); setShowQuickTimer(false) }}>
                            Done
                          </button>
                        )}
                        <button className="quick-timer-step" onClick={() => setQuickTimer(current => current ? { ...current, secondsLeft: current.secondsLeft + 5 } : null)}>+5s</button>
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
            {quickTimer && <span className="tab-plus-timer-badge">{fmtRest(quickTimer.secondsLeft)}</span>}
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
  )
}
