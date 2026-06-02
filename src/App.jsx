import { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { App as CapApp } from '@capacitor/app'
import { push as pushBack, remove as removeBack, hasHandlers as hasBackHandlers, isBackHandlingSuppressed, onPopState as onBackStackPopState } from './lib/backStack'
import { initAdMob, showWorkoutCompleteAd } from './lib/admob'
import { initPurchases, loginUser, logoutUser, refreshPremiumStatus, isPremiumSync } from './lib/purchases'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
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
import * as Sentry from '@sentry/react'
import { cancelRestNotification, scheduleRestEndNotification } from './lib/restNotification'
import { readStoredWorkoutDraft } from './lib/workoutDraft'
import { validateBodyweight } from './lib/inputValidation'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useTheme } from './context/ThemeContext'
import { UserProvider } from './context/UserContext'
import { clearCachedTheme, getCachedThemeForUser, saveThemeForUser } from './lib/theme'
import { fetchExercises } from './data/exercises'
import './App.css'
import ForceUpdate from './components/ForceUpdate'
import { checkForceUpdate } from './lib/appVersion'



const Home = lazy(() => import('./components/Home'))
const Workout = lazy(() => import('./components/Workout'))
const Ranks = lazy(() => import('./components/Ranks'))
const Nutrition = lazy(() => import('./components/Nutrition'))
const Profile = lazy(() => import('./components/Profile'))
const Auth = lazy(() => import('./components/Auth'))
const WorkoutSummary = lazy(() => import('./components/WorkoutSummary'))
const Paywall = lazy(() => import('./components/Paywall'))

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
const TAB_TRANSITION_GUARD_MS = 200
const INTRO_MIN_DURATION_MS = 3600
const INTRO_EXIT_DURATION_MS = 2200
const INTRO_BAR_SETTLE_MS = 760
const INTRO_BLACK_HOLD_MS = 600
const INTRO_START_SETTLE_FRAMES = 6
const PULSE_PERIOD_MS = 1400
const PULSE_START_DELAY_MS = 1500
const INTRO_MIN_VISIBLE_PULSE_CYCLES = 2
const INTRO_EXIT_PULSE_PHASE_MS = Math.round(PULSE_PERIOD_MS * 0.66)
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

function BrandLogo({ width = 158, height = 36, animated = false, golden = false, transformTick = 0, className = '' }) {
  const [transforming, setTransforming] = useState(false)
  const prevTransformTickRef = useRef(0)

  useEffect(() => {
    if (transformTick > prevTransformTickRef.current) {
      prevTransformTickRef.current = transformTick
      let timeoutId = null
      const frameId = requestAnimationFrame(() => {
        setTransforming(true)
        timeoutId = setTimeout(() => setTransforming(false), 2600)
      })
      return () => {
        cancelAnimationFrame(frameId)
        if (timeoutId !== null) clearTimeout(timeoutId)
      }
    }
  }, [transformTick])

  if (animated) {
    return (
      <svg
        className={['brand-wordmark', 'brand-wordmark--animated', className].filter(Boolean).join(' ')}
        width={width} height={height}
        viewBox="-19 0 213 48"
        xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label="microload"
      >
        <g className="brand-wordmark-mark" aria-hidden="true">
          <rect className="brand-wordmark-bar brand-wordmark-bar-1" x="0"  y="10" width="6" height="28" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-2" x="9"  y="4"  width="6" height="40" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-3" x="18" y="0"  width="6" height="48" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-4" x="27" y="4"  width="6" height="40" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-5" x="36" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
        </g>
        <text className="brand-wordmark-text" x="50" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="700" fill="#ffffff" letterSpacing="0">
          <tspan className="brand-wordmark-text-micro">micro</tspan>
          <tspan className="brand-wordmark-text-load" style={{ fill: 'var(--bwm-load-fill, var(--blue))' }}>load</tspan>
        </text>
      </svg>
    )
  }

  const wrapClass = [
    'brand-wordmark-golden-wrap',
    golden ? 'brand-wordmark--golden' : '',
    (golden && transforming) ? 'brand-wordmark--transforming' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={wrapClass}>
      <svg
        className={['brand-wordmark', className].filter(Boolean).join(' ')}
        width={width} height={height}
        viewBox="-19 0 213 48"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
        role="img"
        aria-label={golden ? 'microload Pro' : 'microload'}
      >
        <g className="brand-wordmark-mark" aria-hidden="true">
          <rect className="brand-wordmark-bar brand-wordmark-bar-1" x="0"  y="10" width="6" height="28" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-2" x="9"  y="4"  width="6" height="40" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-3" x="18" y="0"  width="6" height="48" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-4" x="27" y="4"  width="6" height="40" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
          <rect className="brand-wordmark-bar brand-wordmark-bar-5" x="36" y="10" width="6" height="28" rx="2" style={{ fill: 'var(--bwm-bar-fill, var(--blue))' }}/>
        </g>
        <text className="brand-wordmark-text" x="50" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="700" fill="#ffffff" letterSpacing="0">
          <tspan className="brand-wordmark-text-micro">micro</tspan>
          <tspan className="brand-wordmark-text-load" style={{ fill: 'var(--bwm-load-fill, var(--blue))' }}>load</tspan>
        </text>
        {golden && (
          <text
            className={transforming ? 'blt-pro-write' : undefined}
            x="197" y="45"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="15" fontWeight="800"
            fill="#f0c040"
            textAnchor="end"
            letterSpacing="0.5"
            aria-hidden="true"
          >Pro</text>
        )}
      </svg>
      {golden && (
        <>
          <svg className={`brand-logo-sparkle brand-logo-sparkle-1${transforming ? ' blt-sparkle' : ''}`} width="9" height="9" viewBox="-4.5 -4.5 9 9" aria-hidden="true"><path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#fde68a"/></svg>
          <svg className={`brand-logo-sparkle brand-logo-sparkle-2${transforming ? ' blt-sparkle' : ''}`} width="7" height="7" viewBox="-3.5 -3.5 7 7" aria-hidden="true"><path d="M0-3L0.7-0.7L3 0L0.7 0.7L0 3L-0.7 0.7L-3 0L-0.7-0.7Z" fill="#f0c040"/></svg>
          <svg className={`brand-logo-sparkle brand-logo-sparkle-3${transforming ? ' blt-sparkle' : ''}`} width="8" height="8" viewBox="-4 -4 8 8" aria-hidden="true"><path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#fde68a"/></svg>
          <svg className={`brand-logo-sparkle brand-logo-sparkle-4${transforming ? ' blt-sparkle' : ''}`} width="6" height="6" viewBox="-3 -3 6 6" aria-hidden="true"><path d="M0-2.5L0.6-0.6L2.5 0L0.6 0.6L0 2.5L-0.6 0.6L-2.5 0L-0.6-0.6Z" fill="#f0c040"/></svg>
        </>
      )}
    </div>
  )
}

function UnlockPopup({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div className="unlock-overlay" onClick={onClose} aria-hidden="true">
      <div className="unlock-card">
        <div className="unlock-badge-wrap">
          <svg className="unlock-badge-svg" viewBox="252 200 520 624" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="unlockGold" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%"   stopColor="#fde68a"/>
                <stop offset="40%"  stopColor="#f0c040"/>
                <stop offset="100%" stopColor="#b8720a"/>
              </linearGradient>
            </defs>
            <rect x="272" y="386" width="72" height="252" rx="28" fill="url(#unlockGold)"/>
            <rect x="374" y="290" width="72" height="444" rx="28" fill="url(#unlockGold)"/>
            <rect x="476" y="220" width="72" height="584" rx="28" fill="url(#unlockGold)"/>
            <rect x="578" y="290" width="72" height="444" rx="28" fill="url(#unlockGold)"/>
            <rect x="680" y="386" width="72" height="252" rx="28" fill="url(#unlockGold)"/>
          </svg>
          <svg className="unlock-spark unlock-spark-1" width="12" height="12" viewBox="-6 -6 12 12"       aria-hidden="true"><path d="M0-5L1.2-1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2-1.2Z" fill="#fde68a"/></svg>
          <svg className="unlock-spark unlock-spark-2" width="9"  height="9"  viewBox="-4.5 -4.5 9 9"     aria-hidden="true"><path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#f0c040"/></svg>
          <svg className="unlock-spark unlock-spark-3" width="11" height="11" viewBox="-5.5 -5.5 11 11"   aria-hidden="true"><path d="M0-4.6L1.1-1.1L4.6 0L1.1 1.1L0 4.6L-1.1 1.1L-4.6 0L-1.1-1.1Z" fill="#fde68a"/></svg>
          <svg className="unlock-spark unlock-spark-4" width="8"  height="8"  viewBox="-4 -4 8 8"         aria-hidden="true"><path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#f0c040"/></svg>
          <svg className="unlock-spark unlock-spark-5" width="10" height="10" viewBox="-5 -5 10 10"       aria-hidden="true"><path d="M0-4.2L1-1L4.2 0L1 1L0 4.2L-1 1L-4.2 0L-1-1Z" fill="#fde68a"/></svg>
          <svg className="unlock-spark unlock-spark-6" width="8"  height="8"  viewBox="-4 -4 8 8"         aria-hidden="true"><path d="M0-3.5L0.8-0.8L3.5 0L0.8 0.8L0 3.5L-0.8 0.8L-3.5 0L-0.8-0.8Z" fill="#f0c040"/></svg>
        </div>
        <p className="unlock-title">microload Pro</p>
        <p className="unlock-subtitle">Unlocked</p>
      </div>
    </div>,
    document.body
  )
}

function InitialReadyMarker({ onReady }) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return null
}

function AppIntroSplash({ exiting = false, isPremium = false }) {
  const [animationStarted, setAnimationStarted] = useState(false)
  const [introGolding, setIntroGolding] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer = null
    const frameIds = []

    const beginBlackHold = () => {
      if (cancelled) return
      timer = window.setTimeout(() => {
        if (!cancelled) setAnimationStarted(true)
      }, INTRO_BLACK_HOLD_MS)
    }

    const waitForPaints = framesRemaining => {
      if (cancelled) return
      if (framesRemaining <= 0 || typeof window.requestAnimationFrame !== 'function') {
        beginBlackHold()
        return
      }
      const frameId = window.requestAnimationFrame(() => {
        waitForPaints(framesRemaining - 1)
      })
      frameIds.push(frameId)
    }

    waitForPaints(INTRO_START_SETTLE_FRAMES)

    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      frameIds.forEach(frameId => window.cancelAnimationFrame?.(frameId))
    }
  }, [])

  useEffect(() => {
    if (!animationStarted) return undefined
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return undefined

    const timers = [
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}), 900),
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}), 1200),
    ]

    return () => timers.forEach(clearTimeout)
  }, [animationStarted])

  // Fire gold transform after "load" text has fully appeared (~1760ms into animation)
  useEffect(() => {
    if (!animationStarted || !isPremium) return undefined
    const t = setTimeout(() => {
      setIntroGolding(true)
    }, 1820)
    return () => clearTimeout(t)
  }, [animationStarted, isPremium])

  return (
    <div className={`app-intro ${exiting ? 'app-intro-exit' : ''}`} role="status" aria-live="polite">
      {animationStarted && (
        <>
          <div className="app-intro-panel">
            <div className="app-intro-logo-shell">
              <div className={`app-intro-logo${introGolding ? ' intro-golding' : ''}`}>
                <BrandLogo width={238} height={56} animated className="app-intro-wordmark" />
                {introGolding && (
                  <div className="intro-blt-overlay">
                    <svg className="intro-blt-sparkle intro-blt-sparkle-1" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true"><path d="M0-6L1.4-1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4-1.4Z" fill="#fde68a"/></svg>
                    <svg className="intro-blt-sparkle intro-blt-sparkle-2" width="11" height="11" viewBox="-5.5 -5.5 11 11" aria-hidden="true"><path d="M0-4.6L1.1-1.1L4.6 0L1.1 1.1L0 4.6L-1.1 1.1L-4.6 0L-1.1-1.1Z" fill="#f0c040"/></svg>
                    <svg className="intro-blt-sparkle intro-blt-sparkle-3" width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true"><path d="M0-5L1.2-1.2L5 0L1.2 1.2L0 5L-1.2 1.2L-5 0L-1.2-1.2Z" fill="#fde68a"/></svg>
                    <svg className="intro-blt-sparkle intro-blt-sparkle-4" width="9" height="9" viewBox="-4.5 -4.5 9 9" aria-hidden="true"><path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#f0c040"/></svg>
                    <svg className="intro-blt-sparkle intro-blt-sparkle-5" width="11" height="11" viewBox="-5.5 -5.5 11 11" aria-hidden="true"><path d="M0-4.6L1.1-1.1L4.6 0L1.1 1.1L0 4.6L-1.1 1.1L-4.6 0L-1.1-1.1Z" fill="#fde68a"/></svg>
                    <svg className="intro-blt-sparkle intro-blt-sparkle-6" width="9" height="9" viewBox="-4.5 -4.5 9 9" aria-hidden="true"><path d="M0-3.8L0.9-0.9L3.8 0L0.9 0.9L0 3.8L-0.9 0.9L-3.8 0L-0.9-0.9Z" fill="#f0c040"/></svg>
                    <div className="intro-blt-pro-layer">
                      <svg width={238} height={56} viewBox="-19 0 213 48" xmlns="http://www.w3.org/2000/svg" overflow="visible" aria-hidden="true">
                        <text className="blt-pro-write" x="197" y="45" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="800" fill="#f0c040" textAnchor="end" letterSpacing="0.5">Pro</text>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const { isOnline, justCameOnline } = useNetworkStatus()
  const { switchTheme } = useTheme()
  const [tab, setTab] = useState('home')
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['home']))
  const [optimisticTab, setOptimisticTab] = useState('home')
  const [tabTransitionDirection, setTabTransitionDirection] = useState('forward')
  const [tabTransitionTick, setTabTransitionTick] = useState(0)
  const [quickActionSheetOpen, setQuickActionSheetOpen] = useState(false)
  const [overtrain, setOvertrain] = useState(null)
  const [overtrainDismissedKey, setOvertrainDismissedKey] = useState(() => localStorage.getItem('liftlog:overtrainDismissedKey') || null)
  const [startEmptyWorkoutTick, setStartEmptyWorkoutTick] = useState(0)
  const [resumeWorkoutTick, setResumeWorkoutTick] = useState(0)
  const [openWeightDetailTick, setOpenWeightDetailTick] = useState(0)
  const [openAddFoodTick, setOpenAddFoodTick] = useState(0)
  const [quickTimer, setQuickTimer] = useState(null)
  const [quickTimerValue, setQuickTimerValue] = useState(300)
  const [showQuickTimer, setShowQuickTimer] = useState(false)
  const [showQuickWeight, setShowQuickWeight] = useState(false)
  const [quickWeightInput, setQuickWeightInput] = useState('')
  const [quickWeightUnit, setQuickWeightUnit] = useState('lbs')
  const [quickWeightSaving, setQuickWeightSaving] = useState(false)
  const [quickWeightError, setQuickWeightError] = useState('')
  const [weightRefreshTick, setWeightRefreshTick] = useState(0)
  const [workoutRefreshTick, setWorkoutRefreshTick] = useState(0)
  const [ranksRefreshTick, setRanksRefreshTick] = useState(0)
  const [profileRefreshTick, setProfileRefreshTick] = useState(0)
  const [nutritionRefreshTick, setNutritionRefreshTick] = useState(0)
  const [appForegroundTick, setAppForegroundTick] = useState(0)
  const [homeWorkoutStreak, setHomeWorkoutStreak] = useState(0)
  const [homeStreakStartDate, setHomeStreakStartDate] = useState(null)
  const [homeStreakLastWorkoutAt, setHomeStreakLastWorkoutAt] = useState(null)
  const [showStreakInfo, setShowStreakInfo] = useState(false)
  const [session, setSession] = useState(undefined)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [workoutStatus, setWorkoutStatus] = useState({ active: false, resumable: false, seconds: 0 })
  const [restDoneToast, setRestDoneToast] = useState(null)
  const [workoutSummary, setWorkoutSummary] = useState(null)
  const [summaryHadAd, setSummaryHadAd] = useState(false)
  const [showPostWorkoutPaywall, setShowPostWorkoutPaywall] = useState(false)
  const [isPremium, setIsPremium] = useState(() => isPremiumSync())
  const [goldTransformTick, setGoldTransformTick] = useState(0)
  const [showUnlockPopup, setShowUnlockPopup] = useState(false)
  const [adGateCountdown, setAdGateCountdown] = useState(null)
  const [adGateLoading, setAdGateLoading] = useState(false)
  const [adGateStuck, setAdGateStuck] = useState(false)
  const adGateContinueRef = useRef(null)
  const adGateStateRef = useRef(null)
  const [incomingBattleInvite, setIncomingBattleInvite] = useState(null)
  const [battleDecisionBusy, setBattleDecisionBusy] = useState(false)
  const [battleRoom, setBattleRoom] = useState(null)
  const [battleToast, setBattleToast] = useState('')
  const [initialScreenReady, setInitialScreenReady] = useState(false)
  const [themeReady, setThemeReady] = useState(false)
  const [showIntroSplash, setShowIntroSplash] = useState(true)
  const [introSplashExiting, setIntroSplashExiting] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(false)
  const [forceUpdateChecked, setForceUpdateChecked] = useState(false)
  const [homeIntroMotionReady, setHomeIntroMotionReady] = useState(false)
  const tabRef = useRef('home')
  const optimisticTabRef = useRef('home')
  const tabCommitFrameRef = useRef(null)
  const tabCommitTimerRef = useRef(null)
  const pendingTabRef = useRef(null)
  const tabTransitionGuardUntilRef = useRef(0)
  const battleRoomIdRef = useRef(null)
  const authUserIdRef = useRef(null)
  const lastDeclinedInviteIdRef = useRef(null)
  const surfacedBattleResultRoomIdsRef = useRef(new Set())
  const ignoredActiveBattleRoomIdsRef = useRef(new Set())
  const initialScreenReadyRef = useRef(false)
  const themeReadyRef = useRef(false)
  const themeReadyTimerRef = useRef(null)
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

  useEffect(() => {
    const uid = session?.user?.id
    if (uid) {
      loginUser(uid).then(() => setIsPremium(isPremiumSync()))
      fetchExercises(uid).catch(() => {})
    }
    // logoutUser() removed — only fires when markIntentionalLogout() was called first,
    // preventing RC logout during transient Supabase session interruptions.
  }, [session?.user?.id])

  const onWorkoutFinish = useCallback((summary) => {
    if (isPremiumSync()) {
      setWorkoutSummary(summary)
      setWorkoutRefreshTick(t => t + 1)
      setRanksRefreshTick(t => t + 1)
    } else {
      setAdGateCountdown({ seconds: 10, summary })
    }
  }, [])

  const triggerAdNow = useCallback(() => {
    if (!adGateCountdown) return
    const { summary } = adGateCountdown
    setAdGateCountdown(null)
    setAdGateLoading(true)
    setAdGateStuck(false)

    const state = { done: false, stuckTimerId: null }
    state.stuckTimerId = setTimeout(() => setAdGateStuck(true), 20_000)
    adGateStateRef.current = state

    const complete = () => {
      if (state.done) return
      state.done = true
      clearTimeout(state.stuckTimerId)
      adGateStateRef.current = null
      adGateContinueRef.current = null
      setAdGateLoading(false)
      setAdGateStuck(false)
      setSummaryHadAd(true)
      setWorkoutSummary(summary)
      setWorkoutRefreshTick(t => t + 1)
      setRanksRefreshTick(t => t + 1)
    }

    adGateContinueRef.current = complete

    showWorkoutCompleteAd().finally(complete)
  }, [adGateCountdown])

  useEffect(() => {
    if (!adGateCountdown) return
    if (adGateCountdown.seconds <= 0) {
      triggerAdNow()
      return
    }
    const timer = setTimeout(() => {
      setAdGateCountdown(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null)
    }, 1000)
    return () => clearTimeout(timer)
  }, [adGateCountdown, triggerAdNow])

  // Cleanup in-flight ad gate state on unmount (safe in React Strict Mode).
  // App.jsx never unmounts in practice, but this guards against stale timer callbacks.
  useEffect(() => {
    return () => {
      const state = adGateStateRef.current
      if (state) {
        state.done = true
        clearTimeout(state.stuckTimerId)
        adGateStateRef.current = null
        adGateContinueRef.current = null
      }
    }
  }, [])

  const markInitialScreenReady = useCallback(() => {
    if (initialScreenReadyRef.current) return
    initialScreenReadyRef.current = true
    setInitialScreenReady(true)
  }, [])

  const markThemeReady = useCallback(() => {
    if (themeReadyRef.current) return
    themeReadyRef.current = true
    setThemeReady(true)
  }, [])

  const dismissIntroSplash = useCallback(() => {
    if (!showIntroSplash || introSplashExiting) return

    const elapsed = Date.now() - introStartedAtRef.current
    const visualPulseStartMs = INTRO_BLACK_HOLD_MS + PULSE_START_DELAY_MS
    const minPulseWaitMs = visualPulseStartMs + (INTRO_MIN_VISIBLE_PULSE_CYCLES * PULSE_PERIOD_MS) - elapsed
    const baseWaitMs = Math.max(INTRO_BAR_SETTLE_MS, INTRO_MIN_DURATION_MS - elapsed, minPulseWaitMs)
    const pulseElapsed = (elapsed + baseWaitMs) - visualPulseStartMs
    const cycleProgress = ((pulseElapsed % PULSE_PERIOD_MS) + PULSE_PERIOD_MS) % PULSE_PERIOD_MS
    const msToExitPhase = (INTRO_EXIT_PULSE_PHASE_MS - cycleProgress + PULSE_PERIOD_MS) % PULSE_PERIOD_MS
    const waitMs = baseWaitMs + msToExitPhase

    clearTimeout(introHideTimerRef.current)
    clearTimeout(introRemoveTimerRef.current)

    introHideTimerRef.current = setTimeout(() => {
      const bars = document.querySelectorAll('.app-intro .brand-wordmark--animated .brand-wordmark-bar')
      bars.forEach(bar => {
        const { opacity, transform } = getComputedStyle(bar)
        bar.getAnimations().forEach(animation => animation.cancel())
        bar.animate(
          [
            { opacity, transform },
            { opacity: '0', transform: 'scaleY(0.4) translateY(24px)' }
          ],
          { duration: 900, easing: 'cubic-bezier(0.2, 0.82, 0.24, 1)', fill: 'forwards' }
        )
      })
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
    const unit = quickWeightUnit || 'lbs'
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

      const unit2 = profileData?.unit_preference || quickWeightUnit || 'lbs'

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
      handleBodyweightChanged()
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

  const clearScheduledTabCommit = useCallback(() => {
    if (tabCommitFrameRef.current !== null) {
      cancelAnimationFrame(tabCommitFrameRef.current)
      tabCommitFrameRef.current = null
    }
    if (tabCommitTimerRef.current !== null) {
      clearTimeout(tabCommitTimerRef.current)
      tabCommitTimerRef.current = null
    }
    pendingTabRef.current = null
  }, [])

  const commitTab = useCallback((nextTab) => {
    if (!nextTab) return
    const currentTab = tabRef.current
    pendingTabRef.current = null
    if (nextTab === currentTab) return

    setTabTransitionDirection(getTabDirection(currentTab, nextTab))
    setTabTransitionTick(tick => tick + 1)
    setTab(nextTab)
    tabRef.current = nextTab
    tabTransitionGuardUntilRef.current = Date.now() + TAB_TRANSITION_GUARD_MS
  }, [])

  const scheduleTabCommit = useCallback((nextTab, delay = 0) => {
    clearScheduledTabCommit()
    pendingTabRef.current = nextTab

    const queueCommitFrame = () => {
      tabCommitTimerRef.current = null
      tabCommitFrameRef.current = requestAnimationFrame(() => {
        tabCommitFrameRef.current = null
        commitTab(pendingTabRef.current)
      })
    }

    if (delay > 0) {
      tabCommitTimerRef.current = setTimeout(queueCommitFrame, delay)
      return
    }

    queueCommitFrame()
  }, [clearScheduledTabCommit, commitTab])

  const navigateToTab = useCallback((nextTab) => {
    const currentOptimisticTab = optimisticTabRef.current
    if (!nextTab || nextTab === currentOptimisticTab) return
    setQuickActionSheetOpen(false)
    optimisticTabRef.current = nextTab
    setOptimisticTab(nextTab)

    const guardRemaining = Math.max(0, tabTransitionGuardUntilRef.current - Date.now())
    scheduleTabCommit(nextTab, guardRemaining)
  }, [scheduleTabCommit])

  const handleRequestLogBodyweight = useCallback(() => {
    navigateToTab('home')
    setOpenWeightDetailTick(t => t + 1)
  }, [navigateToTab])

  useEffect(() => {
    initAdMob()
    initPurchases().then(() => {
      // RC is now initialized. loginUser may have been a no-op earlier because
      // initialized was false — re-identify the user now to get correct entitlements.
      const uid = authUserIdRef.current
      if (uid) {
        loginUser(uid).then(() => setIsPremium(isPremiumSync()))
      } else {
        setIsPremium(isPremiumSync())
      }
    })
  }, [])

  useEffect(() => {
    const handler = () => {
      // Wait for Paywall close animation (340ms) then trigger the gold transform + unlock popup
      setTimeout(() => {
        refreshPremiumStatus().then(status => {
          setIsPremium(status)
          setGoldTransformTick(t => t + 1)
          setShowUnlockPopup(true)
        })
      }, 380)
    }
    window.addEventListener('liftlog:premium-purchased', handler)
    return () => window.removeEventListener('liftlog:premium-purchased', handler)
  }, [])

  // Re-verify premium whenever the app returns from background.
  // appForegroundTick is 0 on mount — skip the first fire.
  // refreshPremiumStatus() is a no-op on web/dev (returns cached value).
  useEffect(() => {
    if (appForegroundTick === 0) return
    refreshPremiumStatus().then(setIsPremium)
  }, [appForegroundTick])

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

  // Android back gesture + iOS edge swipe (via popstate).
  // Single source of truth: backStack module tracks what's open and handles it.
  useEffect(() => {
    let backButtonListener
    CapApp.addListener('backButton', () => {
      if (isBackHandlingSuppressed()) return
      if (hasBackHandlers()) {
        window.history.back()
      } else {
        CapApp.minimizeApp().catch(() => {})
      }
    }).then(h => { backButtonListener = h }).catch(() => {})

    const handlePopState = () => onBackStackPopState()
    window.addEventListener('popstate', handlePopState)

    return () => {
      backButtonListener?.remove()
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (!quickActionSheetOpen) return
    const id = pushBack(() => {
      setQuickActionSheetOpen(false)
      setShowQuickWeight(false)
      setQuickWeightError('')
    })
    return () => removeBack(id)
  }, [quickActionSheetOpen])

  useEffect(() => {
    if (!showStreakInfo) return
    const id = pushBack(() => setShowStreakInfo(false))
    return () => removeBack(id)
  }, [showStreakInfo])

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
          totalSets: battle.yourStats.totalWorkingSets ?? battle.yourStats.totalSets ?? 0,
          totalWorkingSets: battle.yourStats.totalWorkingSets ?? battle.yourStats.totalSets ?? 0,
          totalDropSets: battle.yourStats.totalDropSets ?? 0,
          totalVolume: Math.round(battle.yourStats.totalVolume ?? 0),
          totalLoadVolume: Math.round(battle.yourStats.totalLoadVolume ?? battle.yourStats.totalVolume ?? 0),
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
    if (pendingTabRef.current && pendingTabRef.current !== tab) return
    if (optimisticTabRef.current !== tab) {
      optimisticTabRef.current = tab
      setOptimisticTab(tab)
    }
  }, [tab])

  useLayoutEffect(() => {
    if (tab !== 'workout') {
      setMountedTabs(prev => {
        if (prev.has(tab)) return prev
        const next = new Set(prev)
        next.add(tab)
        return next
      })
    }
  }, [tab])

  useEffect(() => {
    if (!battleToast) return undefined
    const timer = setTimeout(() => setBattleToast(''), 1800)
    return () => clearTimeout(timer)
  }, [battleToast])

  useEffect(() => {
    themeReadyTimerRef.current = setTimeout(markThemeReady, 1500)
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
      setSession(session)
      hydratePreferredTheme(session?.user?.id).finally(markThemeReady)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      const nextUserId = session?.user?.id ?? null
      const prevUserId = authUserIdRef.current
      const shouldLandOnHomeAfterAuth = nextUserId && event === 'SIGNED_IN' && !prevUserId
      if (shouldLandOnHomeAfterAuth && tabRef.current !== 'home') {
        setQuickActionSheetOpen(false)
        clearScheduledTabCommit()
        tabTransitionGuardUntilRef.current = 0
        optimisticTabRef.current = 'home'
        setOptimisticTab('home')
        setTabTransitionDirection(getTabDirection(tabRef.current, 'home'))
        setTabTransitionTick(tick => tick + 1)
        setTab('home')
        tabRef.current = 'home'
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('microload:pendingRecovery')
        clearCachedTheme()
        setRecoveryMode(false)
        logoutUser() // no-op unless markIntentionalLogout() was called first
      }
      if (prevUserId !== nextUserId) {
        clearCache()
        authUserIdRef.current = nextUserId
        if (nextUserId) {
          Sentry.setUser({ id: session.user.id, email: session.user.email })
        } else {
          Sentry.setUser(null)
        }
        hydratePreferredTheme(nextUserId, { force: Boolean(nextUserId && prevUserId) }).finally(markThemeReady)
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
      if (accessToken && refreshToken) {
        // Recovery links must open the reset screen; signup/confirm links just sign the user in.
        if (hashType === 'recovery') {
          localStorage.setItem('microload:pendingRecovery', '1')
        }
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (hashType === 'recovery') {
          setRecoveryMode(true)
        }
      }
    }).then(handle => { deepLinkListener = handle })

    return () => {
      clearTimeout(themeReadyTimerRef.current)
      subscription.unsubscribe()
      deepLinkListener?.remove()
    }
  }, [clearScheduledTabCommit, hydratePreferredTheme, markThemeReady])

  useEffect(() => {
    if (session === undefined || !themeReady || !forceUpdateChecked) return
    if (!forceUpdate && !initialScreenReady) return   // normal path still requires app content ready
    dismissIntroSplash()
  }, [dismissIntroSplash, forceUpdate, forceUpdateChecked, initialScreenReady, session, themeReady])

  useEffect(() => {
    if (!homeIntroMotionReady || !session?.user?.id) return
    import('./components/Workout')
    import('./components/Ranks')
    import('./components/Nutrition')
    import('./components/Profile')
    import('./components/WorkoutSummary')
  }, [homeIntroMotionReady, session?.user?.id])

  useEffect(() => () => {
    clearTimeout(themeReadyTimerRef.current)
    clearTimeout(introHideTimerRef.current)
    clearTimeout(introRemoveTimerRef.current)
    clearTimeout(homeIntroMotionTimerRef.current)
    clearScheduledTabCommit()
  }, [clearScheduledTabCommit])

  // Version gate — runs once on mount, in parallel with session init.
  // The `settled` flag ensures a response arriving after the 5s timeout
  // is silently discarded — it must never affect a user already in the app.
  useEffect(() => {
    let cancelled = false
    let settled = false

    const timeoutId = setTimeout(() => {
      settled = true
      if (!cancelled) setForceUpdateChecked(true)
    }, 5000)

    checkForceUpdate()
      .then(({ required }) => {
        if (settled) return          // timeout already fired — discard late result
        settled = true
        clearTimeout(timeoutId)
        if (!cancelled) {
          setForceUpdate(required)
          setForceUpdateChecked(true)
        }
      })
      .catch(() => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        if (!cancelled) setForceUpdateChecked(true)
      })

    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [])

  useEffect(() => {
    clearTimeout(homeIntroMotionTimerRef.current)
    setHomeIntroMotionReady(false)
  }, [session?.user?.id])

  useEffect(() => {
    if (showIntroSplash || !session?.user?.id || homeIntroMotionReady) return

    homeIntroMotionTimerRef.current = setTimeout(() => {
      setHomeIntroMotionReady(true)
    }, 80)

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
    const currentIndex = TAB_ORDER.indexOf(optimisticTab)
    if (currentIndex === -1) return

    const nextTab = TAB_ORDER[currentIndex + offset]
    if (!nextTab) return

    handleNavigate(nextTab)
  }, [handleNavigate, optimisticTab])

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

  const introSplash = showIntroSplash ? <AppIntroSplash exiting={introSplashExiting} isPremium={isPremium} /> : null
  const appFallback = showIntroSplash ? null : <LoadingSpinner fullPage />

  const handleWorkoutDeleted = useCallback(() => {
    setWorkoutRefreshTick(t => t + 1)
    setRanksRefreshTick(t => t + 1)
  }, [])
  const handleBodyweightChanged = useCallback(() => {
    setWeightRefreshTick(t => t + 1)
    setRanksRefreshTick(t => t + 1)
  }, [])
  const handleProfileSaved = useCallback(() => setProfileRefreshTick(t => t + 1), [])
  const handleNutritionChanged = useCallback(() => setNutritionRefreshTick(t => t + 1), [])
  const handleWorkoutDataChanged = useCallback(() => {
    setWorkoutRefreshTick(t => t + 1)
    setRanksRefreshTick(t => t + 1)
  }, [])
  const homeIsVisible = tab === 'home'
  const homeBottomBannerVisible = workoutStatus.active || !isOnline || justCameOnline
  const otherScreens = useMemo(() => {
    if (!session?.user?.id) return {}
    return {
      home: <Home userId={session.user.id} splashDone={!showIntroSplash} introMotionReady={homeIntroMotionReady} useStartupSnapshot={!initialScreenReady} onNavigate={handleNavigate} onWorkoutStreakChange={setHomeWorkoutStreak} onStreakMetaChange={({ startDate, lastWorkoutAt }) => { setHomeStreakStartDate(startDate); setHomeStreakLastWorkoutAt(lastWorkoutAt) }} onInitialReady={markInitialScreenReady} weightRefreshTick={weightRefreshTick} workoutRefreshTick={workoutRefreshTick} profileRefreshTick={profileRefreshTick} nutritionRefreshTick={nutritionRefreshTick} onWorkoutDeleted={handleWorkoutDeleted} onBodyweightChanged={handleBodyweightChanged} workoutActive={workoutStatus.active} bottomBannerVisible={homeBottomBannerVisible} onOvertrain={setOvertrain} isVisible={homeIsVisible} appForegroundTick={appForegroundTick} openWeightDetailTick={openWeightDetailTick} />,
      ranks: <Ranks refreshTick={ranksRefreshTick} profileRefreshTick={profileRefreshTick} onBodyweightChanged={handleBodyweightChanged} onWorkoutDataChanged={handleWorkoutDataChanged} />,
      nutrition: <Nutrition openAddFoodTick={openAddFoodTick} profileRefreshTick={profileRefreshTick} onNutritionChanged={handleNutritionChanged} />,
      profile: <Profile onChallenge={handleChallengeFriend} onWorkoutDeleted={handleWorkoutDeleted} onBodyweightChanged={handleBodyweightChanged} onProfileSaved={handleProfileSaved} workoutActive={workoutStatus.active} />,
    }
  }, [session, showIntroSplash, homeIntroMotionReady, initialScreenReady, handleNavigate, setHomeWorkoutStreak, markInitialScreenReady, weightRefreshTick, workoutRefreshTick, profileRefreshTick, nutritionRefreshTick, handleWorkoutDeleted, handleBodyweightChanged, handleProfileSaved, handleNutritionChanged, handleWorkoutDataChanged, ranksRefreshTick, openWeightDetailTick, openAddFoodTick, handleChallengeFriend, workoutStatus.active, homeBottomBannerVisible, setOvertrain, homeIsVisible, appForegroundTick])

  if (forceUpdate) {
    return (
      <>
        <ForceUpdate />
        {introSplash}
      </>
    )
  }

  if (session === undefined) {
    return (
      <>
        {!showIntroSplash && <LoadingSpinner fullPage />}
        {introSplash}
      </>
    )
  }
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
  const trainingLoadAdvisory = overtrainBannerVisible && overtrainBannerContent ? (
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
  ) : null

  const profileButtonLabel = displayName(session?.user?.user_metadata) || session?.user?.email || 'Profile'
  const tabs = [
    {
      id: 'home', label: 'Dashboard',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="1" y="1" width="10" height="6" rx="1.5"/><rect x="13" y="1" width="10" height="6" rx="1.5"/><rect x="1" y="9" width="22" height="6" rx="1.5"/><rect x="1" y="17" width="22" height="6" rx="1.5"/></svg>
    },
    {
      id: 'workout', label: 'Workout',
      icon: <svg width="22" height="22" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M654.16 444.152c-4.248 0-8.32-1.688-11.32-4.688l-8.24-8.248c-10.224-3.928-20.016-10.408-28.536-18.928-8.52-8.528-15-18.32-18.936-28.552l-9.96-9.96a16.008 16.008 0 0 1 0-22.632l274.264-274.256c7.216-7.224 17.008-11.04 28.312-11.04 16.632 0 35.192 8.64 49.656 23.104 24.68 24.68 29.184 57.4 10.496 76.112l-274.416 274.4a16.04 16.04 0 0 1-11.32 4.688z m-43.056-81.696l1.208 1.208c1.816 1.816 3.168 4.032 3.936 6.48 2.12 6.68 6.536 13.608 12.44 19.512 5.888 5.888 12.824 10.304 19.488 12.416 2.216 0.704 4.264 1.88 5.976 3.456l263.104-263.088c4.816-4.824 1.696-18.68-10.488-30.864-10.136-10.136-20.888-13.728-27.032-13.728-1.84 0-4.304 0.288-5.688 1.664L611.104 362.456z"/><path d="M880.632 397.824a15.96 15.96 0 0 1-11.312-4.68l-49.208-49.2c-33.264-13.8-66.408-36.664-96.056-66.312-29.64-29.64-52.504-62.776-66.312-96.048l-44.36-44.376a16 16 0 0 1 0-22.624l52.056-52.056c14.016-14.024 33.88-21.44 57.432-21.44 47.872 0 108.288 30.68 157.672 80.064 78.136 78.136 106.6 176.808 63.464 219.944l-52.056 52.056a16 16 0 0 1-11.32 4.672zM647.32 125.888l35.336 35.352c1.536 1.536 2.752 3.376 3.552 5.4 11.88 29.864 33.36 61.24 60.472 88.36 27.128 27.12 58.504 48.592 88.368 60.464 2.024 0.808 3.856 2.008 5.4 3.552l40.184 40.184 40.744-40.744c26.248-26.248 4.688-106.536-63.464-174.688-42.944-42.944-95.952-70.688-135.048-70.688-15.088 0-26.8 4.056-34.808 12.064l-40.736 40.744z"/><path d="M835.336 414.112c-48.44 0-110.024-31.504-160.728-82.208-35.976-35.976-62.552-77.384-74.84-116.616-13.4-42.768-8.496-78.608 13.808-100.904 13.856-13.848 33.488-21.168 56.792-21.168 48.44 0 110.032 31.504 160.736 82.2 35.976 35.976 62.552 77.392 74.84 116.616 13.4 42.776 8.504 78.608-13.808 100.904-13.848 13.856-33.488 21.176-56.8 21.176zM670.36 125.216c-14.84 0-26.336 3.968-34.168 11.792-13.264 13.264-15.416 38.312-5.888 68.712 10.768 34.392 34.536 71.168 66.928 103.552 44.24 44.24 98.456 72.832 138.104 72.832 14.848 0 26.344-3.968 34.168-11.792 13.264-13.264 15.416-38.312 5.888-68.712-10.776-34.384-34.536-71.168-66.928-103.56-44.24-44.232-98.448-72.824-138.104-72.824z"/><path d="M829.512 540.816a16 16 0 0 1-11.312-4.688l-67.672-67.672c-44.872-18.408-89.664-49.232-129.728-89.304-40.08-40.08-70.896-84.864-89.296-129.72l-61.112-61.112a16 16 0 0 1 0-22.624l70.736-70.744c17.968-17.968 43.56-27.464 74-27.464 63.584 0 144.136 41.048 210.208 107.128 103.928 103.928 142.608 234.368 86.224 290.768l-70.744 70.744a15.976 15.976 0 0 1-11.304 4.688zM504.328 177.008l52.104 52.104c1.536 1.536 2.752 3.376 3.552 5.4 16.408 41.28 46.04 84.608 83.44 122.016 37.392 37.392 80.728 67.032 122.016 83.44 2.032 0.808 3.864 2.008 5.408 3.552l58.664 58.664 59.432-59.424c42.416-42.432 2.128-157.16-86.224-245.52-60.296-60.296-132.168-97.752-187.584-97.752-22.088 0-39.376 6.088-51.376 18.088l-59.432 59.432z"/><path d="M769.04 561.872c-64.36 0-146.504-42.16-214.376-110.024C450.8 347.984 414.368 221.704 471.712 164.36c17.72-17.712 43-27.08 73.128-27.08 64.36 0 146.504 42.16 214.368 110.024 48.248 48.248 83.864 103.696 100.288 156.144 17.536 55.984 11.384 102.64-17.336 131.344-17.72 17.72-43 27.08-73.12 27.08zM544.84 169.28c-21.76 0-38.744 5.96-50.496 17.704-43.168 43.168-5.176 154.096 82.952 242.232 61.152 61.144 136.416 100.656 191.752 100.656 21.752 0 38.744-5.96 50.496-17.704 19.88-19.88 23.224-55.096 9.432-99.16-14.912-47.608-47.72-98.416-92.384-143.08-61.16-61.136-136.416-100.648-191.752-100.648z"/><path d="M414.088 684.216a16 16 0 0 1-11.312-4.688l-8.256-8.248c-10.232-3.936-20.032-10.424-28.536-18.928-8.52-8.512-15.008-18.312-18.936-28.552l-9.96-9.96a16 16 0 0 1 0-22.624L611.344 316.96c7.224-7.224 17.016-11.04 28.312-11.04 16.632 0 35.192 8.64 49.664 23.104 11.168 11.168 18.664 24.52 21.112 37.608 2.8 14.92-1.08 28.96-10.632 38.504l-274.4 274.392a16 16 0 0 1-11.312 4.688z m-43.056-81.688l1.208 1.216a16 16 0 0 1 3.936 6.472c2.12 6.68 6.536 13.616 12.432 19.512 5.896 5.888 12.824 10.304 19.504 12.424 2.216 0.704 4.256 1.88 5.968 3.448l263.096-263.096c2.696-2.696 2.288-7.416 1.808-9.992-1.272-6.808-5.64-14.224-12.28-20.872-10.136-10.136-20.896-13.728-27.04-13.728-1.832 0-4.304 0.288-5.688 1.664L371.032 602.528z"/><path d="M461.968 908.36a16 16 0 0 1-11.312-4.688l-67.672-67.672c-44.872-18.416-89.664-49.24-129.72-89.296-40.072-40.072-70.896-84.864-89.304-129.728l-61.112-61.112a16 16 0 0 1 0-22.624l70.736-70.744c17.968-17.968 43.552-27.456 74-27.456 63.584 0 144.128 41.048 210.208 107.128 103.936 103.928 142.624 234.368 86.232 290.768l-70.744 70.744a16.032 16.032 0 0 1-11.312 4.68zM136.784 544.544l52.104 52.104c1.544 1.536 2.752 3.376 3.552 5.4 16.416 41.288 46.048 84.624 83.448 122.024 37.384 37.384 80.72 67.016 122.016 83.44 2.024 0.808 3.864 2.016 5.4 3.552l58.664 58.656 59.432-59.432c42.424-42.432 2.128-157.152-86.232-245.512-60.296-60.296-132.176-97.752-187.584-97.752-22.088 0-39.376 6.088-51.376 18.088l-59.424 59.432z"/><path d="M405.216 925.696c-64.36 0-146.504-42.168-214.36-110.032-48.248-48.24-83.864-103.696-100.296-156.144-17.536-55.992-11.376-102.632 17.336-131.344 17.712-17.712 43-27.08 73.112-27.08 64.36 0 146.504 42.16 214.368 110.024 48.248 48.248 83.864 103.696 100.296 156.144 17.528 55.992 11.376 102.632-17.344 131.352-17.712 17.712-42.992 27.08-73.112 27.08zM181.016 533.104c-21.752 0-38.736 5.96-50.488 17.704-19.88 19.88-23.232 55.096-9.432 99.16 14.912 47.6 47.72 98.416 92.384 143.08 61.144 61.144 136.4 100.656 191.736 100.656 21.752 0 38.744-5.96 50.496-17.704 19.88-19.88 23.224-55.096 9.424-99.16-14.912-47.608-47.72-98.416-92.376-143.08-61.152-61.152-136.408-100.656-191.744-100.656z"/><path d="M348.904 929.536a15.92 15.92 0 0 1-11.312-4.688l-49.2-49.2c-33.264-13.792-66.416-36.664-96.056-66.312-29.648-29.64-52.512-62.784-66.312-96.048l-44.368-44.376a16 16 0 0 1 0-22.632l52.064-52.048c14.024-14.024 33.88-21.44 57.432-21.44 47.872 0 108.288 30.68 157.672 80.064 78.136 78.128 106.6 176.792 63.464 219.936l-52.064 52.056a15.968 15.968 0 0 1-11.32 4.688zM115.6 657.6l35.344 35.352c1.544 1.536 2.752 3.376 3.552 5.4 11.872 29.856 33.344 61.24 60.464 88.36 27.12 27.12 58.504 48.592 88.36 60.464 2.024 0.808 3.864 2.008 5.4 3.552l40.176 40.176 40.752-40.744c26.248-26.248 4.688-106.536-63.464-174.68-42.944-42.944-95.952-70.696-135.04-70.696-15.088 0-26.8 4.056-34.808 12.064L115.6 657.6z"/><path d="M154.206239 852.300097a180.976 94.648 44.999 1 0 133.850149-133.854822 180.976 94.648 44.999 1 0-133.850149 133.854822Z"/><path d="M303.624 945.824c-48.44 0-110.024-31.504-160.728-82.208-35.976-35.976-62.56-77.384-74.84-116.616-13.4-42.776-8.496-78.608 13.808-100.904 13.848-13.848 33.48-21.168 56.792-21.168 48.44 0 110.024 31.504 160.728 82.208 35.984 35.976 62.56 77.392 74.848 116.616 13.4 42.776 8.496 78.608-13.808 100.904-13.856 13.848-33.496 21.168-56.8 21.168zM138.648 656.936c-14.848 0-26.344 3.968-34.168 11.792-13.264 13.264-15.416 38.312-5.888 68.712 10.768 34.384 34.536 71.168 66.928 103.552 44.248 44.24 98.456 72.832 138.104 72.832 14.848 0 26.336-3.968 34.168-11.792 13.272-13.272 15.416-38.312 5.896-68.712-10.776-34.384-34.544-71.168-66.936-103.56-44.248-44.24-98.456-72.824-138.104-72.824z"/><path d="M178.768 772.16l-54.36 54.504 9.672 15.232c2.776 8.792 8.336 17.968 16.36 25.984 8.016 8.024 17.184 13.576 25.984 16.36l10.816 10.816 57.36-57.36c11.944-11.952 8.12-34.88-10.488-53.488-18.616-18.6-43.384-24-55.344-12.048z"/><path d="M187.24 911.072a15.92 15.92 0 0 1-11.312-4.688l-8.248-8.248c-10.232-3.928-20.032-10.408-28.552-18.928-9.024-9.024-15.776-19.488-19.608-30.368l-8.624-13.592a16 16 0 0 1 2.184-19.872l54.36-54.504c7.24-7.24 17.032-11.064 28.336-11.064 16.624 0 35.184 8.64 49.656 23.104 24.68 24.68 29.192 57.4 10.488 76.112l-57.36 57.36a16 16 0 0 1-11.32 4.688z m-42.464-82.168l2.808 4.424c0.744 1.168 1.336 2.44 1.752 3.76 2.104 6.664 6.512 13.584 12.416 19.488 5.896 5.896 12.824 10.312 19.496 12.424 2.224 0.704 4.264 1.88 5.976 3.456l46.056-46.056c4.816-4.816 1.696-18.68-10.488-30.864-10.136-10.136-20.896-13.728-27.024-13.728-1.832 0-4.312 0.288-5.696 1.672l-45.296 45.424z"/><path d="M148.033099 880.152979a46.448 28.584 44.999 1 0 40.423175-40.424586 46.448 28.584 44.999 1 0-40.423175 40.424586Z"/><path d="M185.672 914.512c-16.216 0-34.512-8.616-48.944-23.048-10.832-10.832-18.496-23.88-21.56-36.744-3.664-15.4-0.416-29.592 8.928-38.936 6.816-6.816 16.064-10.416 26.752-10.416 16.208 0 34.504 8.616 48.936 23.048 10.832 10.832 18.496 23.888 21.56 36.752 3.664 15.4 0.416 29.6-8.928 38.936-6.816 6.808-16.064 10.408-26.744 10.408z m-34.824-77.152c-1.928 0-3.472 0.392-4.128 1.048-0.992 0.984-1.544 4.192-0.424 8.888 1.68 7.072 6.448 14.92 13.056 21.528 13.424 13.432 27.8 15.256 30.432 12.64 0.984-0.984 1.544-4.192 0.424-8.888-1.688-7.072-6.448-14.928-13.056-21.536-10.088-10.096-20.472-13.68-26.304-13.68z"/><path d="M722.872 57.072c34.584 0 78.48 18.352 119.616 51.376l20.248-20.248c4.304-4.304 10.256-6.352 17-6.352 11.984 0 26.424 6.496 38.344 18.416 18.608 18.608 22.432 41.536 10.48 53.496l-22.504 22.512c42.168 59.928 56.168 123.968 26.632 153.504l-18.008 18.008c12.192 44.312 8.744 83.12-14.432 106.296l-69.368 69.368-0.04 0.04-0.04 0.04-1.296 1.296-0.064-0.064c-15.104 14.288-36.008 21.072-60.44 21.072-46.776 0-106.464-24.88-162.944-69.592l-121.04 121.048c66.208 85.696 90.424 181.584 47.688 224.328l-65.68 65.688v0.008l-5.048 5.048-0.28-0.28c-14.704 11.912-34.112 17.592-56.464 17.592-14.2 0-29.592-2.288-45.72-6.736l-10.36 10.36-0.032 0.04a0.176 0.176 0 0 0-0.04 0.032l-0.152 0.16-0.016-0.016c-11.144 11.024-26.8 16.24-45.16 16.24-29.48 0-65.936-13.456-101.912-37.968-0.272 0.312-0.424 0.696-0.712 0.992-3.88 3.88-9.272 5.728-15.432 5.728-11.56 0-25.792-6.528-37.624-18.36-13.48-13.472-20.024-30.016-17.952-42.224l-0.416-9.584-1.64-5.448C77.488 759.08 61.28 689.68 92.992 657.624l-0.024-0.024 10.6-10.6c-11.432-41.512-8.616-78.136 10.864-102.176l-0.28-0.28 70.736-70.744c15.44-15.44 37.2-22.768 62.664-22.76 50.072 0 114.496 28.312 173.456 78.872L539.36 411.568c-75.128-88.904-101.056-188.584-57.6-234.504l-0.056-0.056 1.168-1.168 0.152-0.168 0.168-0.152 69.248-69.256c15.432-15.432 37.176-22.744 62.632-22.744 14.128 0 29.4 2.248 45.368 6.616l16.312-16.312c11.36-11.36 27.368-16.752 46.12-16.752m0-32c-27.888 0-51.664 9.04-68.752 26.136l-3.776 3.776c-12.192-2.296-24-3.456-35.272-3.456-34.768 0-64.256 11.104-85.264 32.112l-68.88 68.888-0.336 0.328-0.76 0.776-0.76 0.76a31.36 31.36 0 0 0-2.4 2.688c-49.016 54.648-32.352 155.224 39.88 252.056l-77.864 77.864c-57.696-43.448-118.872-67.944-171.128-67.944-34.776 0-64.264 11.112-85.296 32.136l-70.736 70.744a31.84 31.84 0 0 0-5.624 7.584c-19.552 27.36-25.592 64.84-17.488 107.52-40.432 43.504-28.592 122.504 29.592 199.344l0.008 0.216c-2.216 22.176 7.832 46.632 27.416 66.2 17.616 17.616 39.576 27.728 60.248 27.728 5.016 0 9.888-0.616 14.512-1.808 35.952 21.424 72.176 33.064 103.544 33.064 26.384 0 49.048-8.168 65.744-23.656 12.384 2.368 24.344 3.56 35.744 3.56 27.88 0 52.624-7.312 71.984-21.2 2.656-1.424 5.152-3.248 7.392-5.48l5.048-5.048 0.128-0.128 65.56-65.568c49.52-49.52 37.272-147.248-28.376-243.64l82.208-82.216c54.728 38.024 111.84 59.44 159.832 59.44 32.168 0 59.864-9.624 80.296-27.864 0.968-0.768 1.904-1.592 2.8-2.488l1.272-1.272 0.4-0.4 69.104-69.104c27.264-27.264 36.616-69.016 27.008-118.872l5.432-5.432c36.6-36.608 32.816-102.32-8.344-171.8l4.224-4.224c25.152-25.168 20.64-67.616-10.488-98.744-17.656-17.656-39.88-27.784-60.968-27.784-15.416 0-29.488 5.584-39.632 15.728l-0.832 0.84c-39.592-26.52-80.92-41.36-116.4-41.36z"/></svg>
    },
    {
      id: 'ranks', label: 'Ranks',
      icon: <svg width="22" height="22" viewBox="0 0 512 512" fill="currentColor"><path d="M134.594 73.375c-17.522 5.65-31.232 11.854-48.125 24.25-2.19 2.097-4.337 4.22-6.44 6.406.24.566.61 1.265 1.157 2.25 1.016 1.832 2.767 4.023 4.97 6.19-3.454 5.536-6.596 11.072-9.5 16.624-3.664-3.04-6.952-6.423-9.594-10.22-7.617 9.505-14.475 19.678-20.438 30.44.395 1.636 1.557 3.42 3.78 5.81 2.656 2.853 6.805 5.8 11.626 8.314-2.024 6.117-3.76 12.204-5.186 18.28-7.44-3.38-14.245-7.768-19.594-13.343-5.94 13.804-10.473 28.42-13.406 43.656 1.335 2.434 3.714 4.663 7.312 7.032 5.072 3.34 12.36 6.076 20.282 7.657-.045 6.437.25 12.822.812 19.124-11.407-1.673-22.405-5.248-31.375-11.156-.05-.034-.106-.06-.156-.094-1.31 15.59-.872 30.96 1.093 45.906 2.31 3.48 6.176 5.957 11.937 7.938 7.406 2.546 17.472 3.344 27.72 2.312 2 6.122 4.275 12.13 6.81 18-13.97 2.098-28.237 1.622-40.593-2.625-.337-.116-.665-.252-1-.375 3.978 15.49 9.66 30.37 16.844 44.406 3.553 2.804 8.35 4.216 14.72 4.656 9.3.644 21.144-1.73 32.438-6.343 3.712 5.257 7.63 10.34 11.75 15.25-14.57 6.715-30.36 10.675-45.063 9.75 9.952 14.602 21.638 27.964 34.844 39.75 4.26 1.446 9.3 1.465 15.374.28 9.6-1.873 20.855-7.404 31.03-15 .008.005.026-.005.032 0 5.154 3.978 10.476 7.75 15.906 11.25-11.976 9.91-25.625 17.696-39.53 21.22 11.654 7.88 24.148 14.67 37.343 20.186 4.937.423 10.29-.96 16.344-3.906 7.672-3.735 15.78-10.252 23.03-18.28 17.036 6.783 34.732 11.22 52.563 12.905l1.78-18.625c-14.268-1.35-28.584-4.77-42.562-9.938 6.883-11.108 11.61-23.173 12.94-33.437 1.178-9.114.083-16.157-3.782-21.438-8.08-1.58-15.89-3.94-23.375-7-.172 6.47-1.706 12.987-4.22 19.094-3.745 9.103-9.52 17.798-16.53 25.72-5.353-3.288-10.565-6.832-15.657-10.625 6.62-7.182 11.923-14.97 14.906-22.22 3.806-9.246 4.173-16.578.625-22.81-7.748-4.957-15.003-10.737-21.718-17.22-1.773 4.3-4.187 8.37-7.032 12.094-5.476 7.165-12.572 13.51-20.563 18.905-4.12-4.72-8.052-9.603-11.75-14.688 7.152-4.694 13.296-10.1 17.47-15.562 5.038-6.594 7.22-12.41 6.468-18.094-4.976-6.553-9.494-13.582-13.5-21-2.285 2.686-4.86 5.14-7.657 7.283-6.758 5.175-14.798 9.155-23.406 12.03-2.595-5.69-4.957-11.498-7-17.437 7.427-2.405 14.13-5.683 19.03-9.437 5.696-4.362 8.802-8.545 9.532-13.25-3.03-7.998-5.508-16.32-7.406-24.908-1.878 1.075-3.82 2.024-5.812 2.813-7.45 2.947-15.75 4.434-24.28 4.75-.662-6.16-1.027-12.403-1.033-18.72 6.957-.263 13.464-1.437 18.44-3.405 4.6-1.82 7.595-3.8 9.343-6.25-1.018-9.72-1.33-19.69-.813-29.813-.65.104-1.29.18-1.938.25-6.624.725-13.556.15-20.406-1.343 1.37-5.98 3.07-12.01 5.094-18.063 4.87.933 9.538 1.223 13.28.814 2.614-.286 4.532-.756 6-1.406 1.395-8.93 3.407-17.644 5.97-26.032-4.182-.736-8.284-2.092-12.25-3.875 2.834-5.457 5.926-10.928 9.344-16.405 2.414.963 4.716 1.665 6.687 1.97 1.107.17 2.023.265 2.782.28 1.946-4.64 4.022-9.17 6.282-13.563 5.898-11.802 12.415-24.25 17-37.937zm244.375 0c4.583 13.686 11.1 26.135 17 37.938 2.26 4.393 4.366 8.923 6.31 13.562.752-.016 1.66-.113 2.75-.28 1.98-.306 4.296-1 6.72-1.97 3.418 5.477 6.51 10.948 9.344 16.406-3.976 1.786-8.096 3.14-12.28 3.876 2.563 8.39 4.573 17.1 5.967 26.03 1.474.658 3.404 1.12 6.033 1.408 3.742.41 8.41.12 13.28-.813 2.026 6.063 3.692 12.104 5.063 18.095-6.837 1.487-13.762 2.036-20.375 1.313-.656-.072-1.308-.145-1.967-.25.517 10.124.236 20.092-.782 29.812 1.75 2.45 4.745 4.43 9.345 6.25 4.967 1.965 11.462 3.14 18.406 3.406-.006 6.316-.37 12.56-1.03 18.72-8.52-.32-16.808-1.808-24.25-4.75-1.994-.79-3.933-1.74-5.813-2.814-1.895 8.575-4.383 16.89-7.406 24.875.715 4.72 3.795 8.912 9.5 13.282 4.904 3.753 11.605 7.03 19.033 9.436-2.044 5.94-4.405 11.747-7 17.438-8.598-2.875-16.624-6.862-23.375-12.03-2.804-2.148-5.4-4.592-7.688-7.283-4.01 7.422-8.52 14.444-13.5 21-.76 5.682 1.43 11.502 6.47 18.095 4.168 5.457 10.313 10.87 17.467 15.563-3.697 5.085-7.63 9.966-11.75 14.687-7.99-5.396-15.086-11.74-20.562-18.906-2.838-3.715-5.234-7.778-7-12.064-6.71 6.478-13.976 12.236-21.72 17.188-3.547 6.233-3.18 13.565.626 22.812 2.985 7.25 8.288 15.037 14.908 22.22-5.095 3.795-10.333 7.334-15.688 10.624-7.003-7.922-12.754-16.617-16.5-25.72-2.513-6.106-4.047-12.623-4.22-19.092-7.497 3.064-15.313 5.418-23.405 7-3.873 5.28-4.96 12.324-3.78 21.437 1.327 10.264 6.08 22.33 12.967 33.438-13.974 5.168-28.293 8.587-42.562 9.937l1.75 18.625c17.84-1.687 35.546-6.116 52.594-12.906 7.25 8.028 15.358 14.545 23.03 18.28 6.056 2.947 11.408 4.33 16.345 3.906 13.2-5.517 25.684-12.302 37.342-20.187-13.896-3.52-27.562-11.293-39.53-21.19 5.442-3.504 10.74-7.293 15.906-11.28 10.18 7.604 21.456 13.126 31.062 15 6.056 1.182 11.09 1.185 15.344-.25 13.212-11.788 24.92-25.172 34.875-39.78-14.705.925-30.526-3.035-45.095-9.75 4.12-4.913 8.066-9.99 11.78-15.25 11.295 4.61 23.138 6.986 32.44 6.342 6.368-.44 11.166-1.852 14.717-4.656 7.183-14.036 12.867-28.917 16.844-44.406-.335.123-.663.26-1 .375-12.355 4.247-26.623 4.723-40.594 2.625 2.536-5.87 4.813-11.878 6.813-18 10.236 1.027 20.29.23 27.688-2.313 5.765-1.98 9.65-4.455 11.968-7.937 1.965-14.946 2.372-30.318 1.064-45.906-.043.028-.082.065-.125.094-8.97 5.908-19.97 9.483-31.376 11.156.563-6.302.856-12.687.812-19.125 7.92-1.582 15.21-4.317 20.28-7.657 3.593-2.366 5.946-4.604 7.283-7.032-2.934-15.234-7.47-29.852-13.408-43.655-5.347 5.57-12.133 9.96-19.562 13.344-1.427-6.078-3.162-12.165-5.188-18.282 4.805-2.513 8.942-5.464 11.594-8.313 2.212-2.376 3.402-4.15 3.813-5.78-5.97-10.774-12.814-20.955-20.44-30.47-2.642 3.796-5.93 7.18-9.592 10.22-2.905-5.553-6.047-11.09-9.5-16.626 2.208-2.166 3.953-4.36 4.968-6.19.538-.97.92-1.656 1.156-2.218-2.106-2.193-4.275-4.334-6.468-6.437-16.893-12.396-30.603-18.6-48.125-24.25zM152.81 134.313l24.094 129.718H341l22.906-124.5-57.937 63.5L261 135.845l-45 67.187-63.188-68.718zm27.563 148.406l3.563 19.217H334.03l3.533-19.218H180.375z"/></svg>
    },
    {
      id: 'nutrition', label: 'Nutrition',
      icon: <svg width="22" height="22" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M29.8,166.1c0.6-20-10.3-27.6-23.6-32.6C1.8,150.7,14,165,29.8,166.1"/><path d="M32.8,76.7c8.5-18.2,1.4-29.4-8.8-39.3C13.3,51.4,18.8,69.4,32.8,76.7"/><path d="M37.6,127.2c-0.6-20,10.3-27.6,23.6-32.6C65.6,111.8,53.4,126,37.6,127.2"/><path d="M37.6,158.1c-0.6-20,10.3-27.6,23.6-32.6C65.6,142.7,53.4,156.9,37.6,158.1"/><path d="M37.6,96.3c-0.6-20,10.3-27.6,23.6-32.6C65.6,80.9,53.4,95.2,37.6,96.3"/><path d="M29.8,135.3c0.6-20-10.3-27.6-23.6-32.6C1.8,119.8,14,134.1,29.8,135.3"/><path d="M29.8,104.4c0.6-20-10.3-27.6-23.6-32.6C1.8,89,14,103.2,29.8,104.4"/><path d="M179.9,255.4H72.5l53.7-93L179.9,255.4z"/><polygon points="14.2,192.1 241.7,130.2 238.3,117.7 10.8,179.6"/><path d="M174.7,0.6c0,0,1.7,32.8,30.4,30C205.1,30.7,208.4,3.2,174.7,0.6"/><path d="M204.8,107.4c-3,4.3-8,7-13.6,7c-4.6,0-9.1-2.2-12.1-5.2c-6.2-6.8-14.2-21.9-14.2-21.9c-4.5-9.1-6.9-16.2-6.9-23.4c0-15.2,12.3-28.4,27.6-28.4c7.5,0,14.3,3,19.3,7.9c5-4.9,11.8-7.9,19.3-7.9c15.3,0,27.6,13.2,27.6,28.4c0,7.1-2.4,14.2-6.9,23.4c0,0-8,15.1-14.2,21.9c-3,3-7.5,5.2-12.1,5.2C212.8,114.4,207.8,111.6,204.8,107.4"/></svg>
    },
  ]
  const leftTabs = tabs.slice(0, 2)
  const rightTabs = tabs.slice(2)
  const contentScreenClassName = `content-screen content-screen-${tabTransitionDirection} content-screen-${tabTransitionTick % 2}`
  const workoutBannerVisible = workoutStatus.active && tab !== 'workout'
  const appClassName = [
    'app',
    showIntroSplash ? 'app-intro-handoff-underlay' : '',
    introSplashExiting ? 'app-intro-handoff-active' : '',
    workoutBannerVisible ? 'app-workout-banner-visible' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <UserProvider user={session.user}>
        <div className={appClassName}>
        <header className="topbar">
          <div className="topbar-inner">
            <button className="topbar-brand" onClick={() => handleNavigate('home')} aria-label="Go to Home">
              <BrandLogo golden={isPremium} transformTick={goldTransformTick} />
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
                className={`topbar-profile-btn ${optimisticTab === 'profile' ? 'active' : ''}`}
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
          className={`content${workoutBannerVisible ? ' content-workout-banner' : ''}`}
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
                streakStartDate={homeStreakStartDate}
                streakLastWorkoutAt={homeStreakLastWorkoutAt}
                onRequestLogBodyweight={handleRequestLogBodyweight}
                weightRefreshTick={weightRefreshTick}
                profileRefreshTick={profileRefreshTick}
                workoutHistoryRefreshTick={workoutRefreshTick}
                isPremium={isPremium}
                trainingLoadAdvisory={trainingLoadAdvisory}
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
            {(['home', 'ranks', 'nutrition', 'profile']).map(t => (
              mountedTabs.has(t) ? (
                <div key={t} className={tab === t ? contentScreenClassName : 'content-screen-hidden'}>
                  {otherScreens[t]}
                </div>
              ) : null
            ))}
          </Suspense>
        </main>

        {workoutBannerVisible && (
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
                if (summaryHadAd) {
                  setSummaryHadAd(false)
                  setShowPostWorkoutPaywall(true)
                }
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

        {showPostWorkoutPaywall && (
          <Suspense fallback={null}>
            <Paywall
              onClose={() => setShowPostWorkoutPaywall(false)}
              onPurchaseSuccess={() => {}}
            />
          </Suspense>
        )}

        {showUnlockPopup && (
          <UnlockPopup onClose={() => setShowUnlockPopup(false)} />
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
                  {battleDecisionBusy ? <LoadingSpinner size="xs" color="currentColor" /> : 'Decline'}
                </button>
                <button
                  className="battle-invite-accept"
                  onClick={() => handleBattleInviteResponse('accepted')}
                  disabled={battleDecisionBusy}
                >
                  {battleDecisionBusy ? <LoadingSpinner size="xs" color="currentColor" /> : 'Accept'}
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

        {(adGateCountdown || adGateLoading) && (
          <div className="rest-done-overlay ad-gate-overlay">
            <div className="rest-done-modal ad-gate-modal">
              {adGateLoading && (
                <div className="ad-gate-spinner-overlay">
                  <LoadingSpinner size="md" />
                  {adGateStuck && (
                    <div className="ad-gate-stuck">
                      <p className="ad-gate-stuck-msg">Ad couldn&apos;t load. Check your connection.</p>
                      <button className="ad-gate-stuck-btn" onClick={() => adGateContinueRef.current?.()}>
                        Continue →
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div style={{ visibility: adGateLoading ? 'hidden' : 'visible', display: 'contents' }}>
                <div className="ad-gate-timer">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle className="ad-gate-timer-bg" cx="40" cy="40" r="34" />
                    <circle
                      className="ad-gate-timer-ring"
                      cx="40" cy="40" r="34"
                      strokeDasharray="213.6"
                      strokeDashoffset="0"
                    />
                  </svg>
                  <span className="ad-gate-timer-num">{adGateCountdown?.seconds}</span>
                </div>
                <div className="rest-done-title">Saving Workout</div>
                <div className="rest-done-body ad-gate-body">
                  Please watch this ad while your workout is saved.
                </div>
                <div className="ad-gate-warning">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                  Exiting the app will result in lost progress.
                </div>
                <button className="rest-done-btn ad-gate-btn" onClick={triggerAdNow}>
                  Watch Ad Now
                </button>
              </div>
            </div>
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
                      {quickWeightSaving ? <LoadingSpinner size="xs" color="currentColor" /> : 'Save'}
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
                className={`tab-btn ${optimisticTab === t.id ? 'active' : ''}`}
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
                className={`tab-btn ${optimisticTab === t.id ? 'active' : ''}`}
                onClick={() => handleNavigate(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
        </div>
      </UserProvider>
      {introSplash}
    </>
  )
}
