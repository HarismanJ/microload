import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useFocusTrap } from '../lib/useFocusTrap'
import { fmtCompact } from '../lib/liftMath'
import { TIERS, tierColor, tierGroup } from '../lib/strengthStandards'
import RankBadge from './RankBadge'
import TierProgressBar from './TierProgressBar'
import LoadingSpinner from './LoadingSpinner'
import '../styles/WorkoutSummary.css'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

function getSummarySetType(set) {
  if (set?.is_warmup || set?.setType === 'warmup' || set?.set_type === 'warmup') return 'warmup'
  return set?.setType ?? set?.set_type ?? 'normal'
}


function fmtMetricValue(metric, value) {
  if (value === null || value === undefined) return '—'
  const suffix = metric.display?.includes('min') && !metric.display?.includes('/')
    ? ''
    : metric.display?.includes('MET')
      ? ''
      : 'x'
  return `${value.toFixed(2)}${suffix}`
}

function fmtMetricWeight(metric) {
  const weight = Number(metric.effectiveWeight ?? metric.weight)
  return Number.isFinite(weight) && weight > 0 ? `${Math.round(weight)} pts` : ''
}

function getHighlightLabel(type) {
  if (type === 'pr') return 'PR'
  if (type === 'rank_up') return 'Rank Up'
  if (type === 'achievement') return 'Achievement'
  return 'Effort'
}

function getBattleOutcome(battle) {
  if (!battle) return null
  if (battle.status === 'waiting') {
    return {
      pill: 'Live Battle',
      title: 'Waiting for final result',
      body: battle.verdict,
      tone: 'waiting',
    }
  }

  if (battle.winner === 'you') {
    return {
      pill: 'Victory',
      title: 'You won the battle',
      body: battle.verdict,
      tone: 'win',
    }
  }

  if (battle.winner === 'opponent') {
    return {
      pill: 'Defeat',
      title: `${battle.opponentName} won the battle`,
      body: battle.verdict,
      tone: 'loss',
    }
  }

  return {
    pill: battle.status === 'cancelled' ? 'Cancelled' : 'Tie',
    title: battle.status === 'cancelled' ? 'Battle cancelled' : 'Battle ended in a draw',
    body: battle.verdict,
    tone: battle.status === 'cancelled' ? 'waiting' : 'tie',
  }
}

const STEP_MS = 450
const RANKUP_WALK_START_MS = 2320
const RANKUP_INITIAL_STEP_MS = 1800

function computeWalkPath(from, to) {
  const toIdx = TIERS.indexOf(to)
  if (toIdx < 0) return [to]
  if (from === 'Unranked') return TIERS.slice(0, toIdx + 1)
  const fromIdx = TIERS.indexOf(from)
  if (fromIdx < 0 || toIdx <= fromIdx) return [to]
  return TIERS.slice(fromIdx + 1, toIdx + 1)
}

const RankUpCard = forwardRef(function RankUpCard({ r, revealed, onSlam }, ref) {
  const fromGroup = r.from === 'Unranked' ? 'Unranked' : tierGroup(r.from)

  const walkPath = useMemo(() => computeWalkPath(r.from, r.to), [r.from, r.to])

  const [stepIdx, setStepIdx] = useState(0)
  const [popKey, setPopKey] = useState(0)
  const [postWalk, setPostWalk] = useState(false)
  const [landingApplied, setLandingApplied] = useState(false)

  // Card slam: pop animation peaks at 55% of 1.2s + 0.15s css delay = ~810ms after revealed
  useEffect(() => {
    if (!revealed) return undefined
    if (prefersReducedMotion()) return undefined
    const t = setTimeout(() => {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
      onSlam?.('strong')
    }, 810)
    return () => clearTimeout(t)
  }, [revealed, onSlam])

  useEffect(() => {
    if (!revealed || walkPath.length === 0) return undefined
    if (prefersReducedMotion()) return undefined
    const t = setTimeout(() => {
      const initialGroup = tierGroup(walkPath[0])
      const isMajor = fromGroup !== initialGroup
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
      onSlam?.(isMajor ? 'strong' : 'light')
    }, RANKUP_INITIAL_STEP_MS)
    return () => clearTimeout(t)
  }, [revealed, walkPath, fromGroup, onSlam])

  useEffect(() => {
    if (!revealed || walkPath.length <= 1) return
    const reduced = prefersReducedMotion()
    let timeoutId = null
    let cancelled = false

    const scheduleNext = (nextIdx) => {
      if (cancelled || nextIdx >= walkPath.length) return
      timeoutId = setTimeout(() => {
        if (cancelled) return
        const prevGroup = tierGroup(walkPath[nextIdx - 1])
        const nextGroup = tierGroup(walkPath[nextIdx])
        const isMajor = prevGroup !== nextGroup
        setStepIdx(nextIdx)
        if (isMajor) setPopKey(k => k + 1)
        if (!reduced) {
          Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
          onSlam?.(isMajor ? 'strong' : 'light')
        }
        scheduleNext(nextIdx + 1)
      }, STEP_MS)
    }

    const starter = setTimeout(() => scheduleNext(1), RANKUP_WALK_START_MS)
    return () => {
      cancelled = true
      clearTimeout(starter)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [revealed, walkPath, onSlam])

  // Post-walk landing: empty + refill bar to actual % into next tier, swap right badge
  useEffect(() => {
    if (!revealed) return undefined
    const walkLen = walkPath.length
    const postWalkDelay = walkLen <= 1
      ? 1700
      : RANKUP_WALK_START_MS + (walkLen - 1) * STEP_MS + 500
    const t1 = setTimeout(() => setPostWalk(true), postWalkDelay)
    const t2 = setTimeout(() => setLandingApplied(true), postWalkDelay + 220)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [revealed, walkPath])

  const currentTier = walkPath[stepIdx]
  const currentGroup = tierGroup(currentTier)
  const currentColor = tierColor(currentTier)

  const landingTier = r.toNextTier ?? null
  const landingGroup = landingTier ? tierGroup(landingTier) : null
  const landingColor = landingTier ? tierColor(landingTier) : currentColor
  const landingProgressRaw = typeof r.toProgress === 'number' ? r.toProgress : 0
  const landingProgress = Math.max(0, Math.min(100, Math.round(landingProgressRaw)))
  const landingPct = r.toIsMax ? 1 : landingProgress / 100
  const cardColor = postWalk && !r.toIsMax && landingColor ? landingColor : currentColor

  return (
    <div
      ref={ref}
      className={`ws-rankup-card${revealed ? ' ws-rankup-revealed' : ''}${postWalk ? ' ws-rankup-postwalk' : ''}`}
      style={{ '--delay': '0.15s', '--tier-color': cardColor }}
    >
      {popKey > 0 && (
        <div key={`flash-${popKey}`} className="ws-rankup-major-flash" aria-hidden="true" />
      )}
      <div className="ws-rankup-header">
        <div className="ws-rankup-arrow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </div>
        <span className="ws-rankup-exercise">{r.exercise}</span>
      </div>
      <div className="ws-rankup-journey">
        <div className="ws-rankup-from-side">
          <RankBadge tier={postWalk ? tierGroup(r.to) : fromGroup} size={20} />
          <span className="ws-rankup-from-name">{postWalk ? r.to : r.from}</span>
        </div>
        <div className="ws-rankup-bar-wrap">
          <div
            key={postWalk ? 'landing' : stepIdx}
            className={
              postWalk
                ? 'ws-rankup-bar-fill ws-rankup-bar-fill-landing'
                : `ws-rankup-bar-fill${stepIdx > 0 ? ' ws-rankup-bar-fill-step' : ''}`
            }
            style={postWalk ? { transform: landingApplied ? `scaleX(${landingPct})` : 'scaleX(0)' } : undefined}
          />
        </div>
        <div
          key={postWalk ? 'landing-to' : popKey}
          className="ws-rankup-to-side"
          data-initial={!postWalk && popKey === 0 ? 'true' : undefined}
          data-postwalk={postWalk ? 'true' : undefined}
        >
          {postWalk && r.toIsMax ? (
            <span className="ws-rankup-max-pill">MAX</span>
          ) : (
            <>
              <RankBadge tier={postWalk && landingGroup ? landingGroup : currentGroup} size={26} />
              <span className="ws-rankup-to-name">{postWalk && landingTier ? landingTier : currentTier}</span>
            </>
          )}
        </div>
      </div>
      {postWalk && (
        <div className="ws-rankup-landing-pct">
          {r.toIsMax ? 'Max rank reached' : `${landingProgress}% to ${landingTier}`}
        </div>
      )}
    </div>
  )
})

const PROGRESS_SLAM_MS = 810
const PROGRESS_BAR_FILL_MS = 600
const PROGRESS_TIER_SWAP_MS = 350
const PROGRESS_DOWN_DRAIN_MS = 850
const PROGRESS_DOWN_SETTLE_MS = STEP_MS
const PROGRESS_DOWN_LANDING_MS = 700

const ProgressCard = forwardRef(function ProgressCard({ p, revealed, onSlam }, ref) {
  const isMaintained = p.direction === 'same'
  const isDown = p.direction === 'down'
  const tierChanged = Boolean(p.tierChanged)

  // Stages:
  //  'initial'        — before slam settles; bar at previousProgress, previous tier badges
  //  'transitioning'  — bar moving; for tier-change cases, this is the "empty" half
  //  'tierSwap'       — badges swap (only for tier-change cases)
  //  'final'          — bar at new progress, current tier badges
  const [stage, setStage] = useState('initial')
  const [barTarget, setBarTarget] = useState(p.previousProgress)
  const [pulsing, setPulsing] = useState(false)
  const cardRef = useRef(null)
  const setCardRef = useCallback((node) => {
    cardRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  // Snap maintained cards to final state when they reveal — done in render phase
  // (per React docs on adjusting state to prop changes) to avoid effect-cascading renders.
  const [prevRevealed, setPrevRevealed] = useState(revealed)
  if (revealed !== prevRevealed) {
    setPrevRevealed(revealed)
    if (revealed && isMaintained) {
      setStage('final')
      setBarTarget(p.progress)
    }
  }

  useEffect(() => {
    if (!revealed) return undefined
    if (prefersReducedMotion()) return undefined
    const t = setTimeout(() => {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
      onSlam?.('strong')
    }, PROGRESS_SLAM_MS)
    return () => clearTimeout(t)
  }, [revealed, onSlam])

  useEffect(() => {
    if (!revealed) return undefined
    if (isMaintained) return undefined
    const reduced = prefersReducedMotion()

    const timeouts = []
    const tierBarMs = isDown ? PROGRESS_DOWN_DRAIN_MS : PROGRESS_BAR_FILL_MS
    const tierSwapMs = isDown ? PROGRESS_DOWN_SETTLE_MS : PROGRESS_TIER_SWAP_MS
    const triggerDownFeedback = ({ haptic = true } = {}) => {
      if (reduced || !isDown) return
      if (haptic) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
      cardRef.current?.animate?.([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(2px)' },
        { transform: 'translateX(0)' },
      ], {
        duration: 380,
        easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
      })
      setPulsing(true)
      timeouts.push(setTimeout(() => setPulsing(false), 900))
    }

    if (tierChanged) {
      timeouts.push(setTimeout(() => {
        setStage('transitioning')
        setBarTarget(0)
      }, PROGRESS_SLAM_MS))
      timeouts.push(setTimeout(() => {
        setStage('tierSwap')
        if (isDown) {
          setBarTarget(100)
          triggerDownFeedback()
        }
      }, PROGRESS_SLAM_MS + tierBarMs))
      timeouts.push(setTimeout(() => {
        setStage('final')
        setBarTarget(p.progress)
      }, PROGRESS_SLAM_MS + tierBarMs + tierSwapMs))
    } else {
      timeouts.push(setTimeout(() => {
        setStage('final')
        setBarTarget(p.progress)
      }, PROGRESS_SLAM_MS))
    }

    if (!reduced) {
      timeouts.push(setTimeout(() => {
        if (isDown && tierChanged) return
        if (isDown) triggerDownFeedback({ haptic: false })
      }, PROGRESS_SLAM_MS))
    }

    return () => timeouts.forEach(clearTimeout)
  }, [revealed, isMaintained, isDown, tierChanged, p.progress, p.previousProgress])

  const showFinalBadges = stage === 'final' || stage === 'tierSwap' || (stage === 'transitioning' && !tierChanged)
  const displayTier = showFinalBadges ? p.tier : p.previousTier
  const displayNextTier = showFinalBadges ? p.nextTier : null
  const displayIsMax = showFinalBadges ? p.isMax : false
  const displayColor = showFinalBadges ? p.color : (p.previousColor || p.color)
  const barPctClamped = Math.max(0, Math.min(100, Math.round(barTarget)))
  const barTransitionMs = isDown && tierChanged
    ? (stage === 'final' ? PROGRESS_DOWN_LANDING_MS : PROGRESS_DOWN_DRAIN_MS)
    : PROGRESS_BAR_FILL_MS
  const progressPct = Math.max(0, Math.min(100, Math.round(p.progress)))
  const landingText = displayIsMax ? 'Max rank reached' : `${progressPct}% to ${displayNextTier}`

  return (
    <div
      ref={setCardRef}
      className={[
        'ws-progress-card',
        revealed ? 'ws-progress-card-revealed' : '',
        isDown ? 'ws-progress-card-down' : '',
        isMaintained ? 'ws-progress-card-maintained' : '',
        pulsing ? 'ws-progress-card-pulsing' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--delay': '0.15s', '--tier-color': displayColor }}
    >
      <div className="ws-progress-card-shell">
        <div className="ws-progress-card-header">
          <span className="ws-progress-card-exercise">{p.exercise}</span>
        </div>
        <div className="ws-progress-card-journey">
          <div className="ws-progress-card-from-side">
            <RankBadge tier={tierGroup(displayTier)} size={20} />
            <span className="ws-progress-card-tier-name">{displayTier}</span>
          </div>
          <div className="ws-progress-card-bar-wrap">
            <div
              className={[
                'ws-progress-card-bar-fill',
                isDown && tierChanged && stage === 'tierSwap' ? 'ws-progress-card-bar-fill-snap' : '',
              ].filter(Boolean).join(' ')}
              style={{ width: `${barPctClamped}%`, '--progress-bar-ms': `${barTransitionMs}ms` }}
            />
          </div>
          {displayIsMax ? (
            <span className="ws-progress-card-max-pill">MAX</span>
          ) : (
            <div className="ws-progress-card-to-side">
              {displayNextTier && <RankBadge tier={tierGroup(displayNextTier)} size={20} />}
            </div>
          )}
        </div>
        {stage === 'final' && (
          <div className="ws-progress-card-landing-pct">
            {landingText}
          </div>
        )}
      </div>
    </div>
  )
})

export default function WorkoutSummary({ summary, onDismiss }) {
  const [show, setShow] = useState(false)
  const [revealIndex, setRevealIndex] = useState(-1)
  const [autoScrollPaused, setAutoScrollPaused] = useState(false)
  const [expandedExercises, setExpandedExercises] = useState(new Set())
  const wsScreenRef = useRef(null)
  const bodyRef = useRef(null)
  const itemRefs = useRef([])
  const shakeAnimRef = useRef(null)

  const triggerScreenShake = useCallback((kind = 'strong') => {
    const el = wsScreenRef.current
    if (!el || typeof el.animate !== 'function') return
    if (prefersReducedMotion()) return
    const strong = kind === 'strong'
    const keyframes = strong
      ? [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(-13px, 4px)' },
          { transform: 'translate(12px, -5px)' },
          { transform: 'translate(-9px, 5px)' },
          { transform: 'translate(7px, -2px)' },
          { transform: 'translate(0, 0)' },
        ]
      : [
          { transform: 'translate(0, 0)' },
          { transform: 'translate(-5px, 2px)' },
          { transform: 'translate(5px, -2px)' },
          { transform: 'translate(0, 0)' },
        ]
    shakeAnimRef.current?.cancel()
    shakeAnimRef.current = el.animate(keyframes, {
      duration: strong ? 380 : 240,
      easing: 'ease-out',
    })
  }, [])

  const toggleExercise = name => setExpandedExercises(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  useEffect(() => {
    // Slight delay so CSS transition fires
    const t = setTimeout(() => setShow(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    setTimeout(onDismiss, 280)
  }

  useFocusTrap(wsScreenRef, { active: show, onEscape: handleDismiss })

  const {
    durationSeconds,
    caloriesBurned = 0,
    totalSets,
    totalWorkingSets,
    totalDropSets = 0,
    totalVolume,
    totalLoadVolume = null,
    unit,
    exercises,
    rankUps = [],
    exerciseProgress = [],
    bodyweightMissing = false,
    newAchievements = [],
    battle = null,
    battleOnly = false,
    planCoaching = null,
    applyCoaching = null,
    coachAutoApplied = false,
  } = summary
  const [coachApplyState, setCoachApplyState] = useState(coachAutoApplied ? 'applied' : 'idle')
  const displayedWorkingSets = totalWorkingSets ?? totalSets ?? 0
  const hasDropSets = Number(totalDropSets) > 0
  const hasStrengthExercises = exercises.some(ex => !ex.isCardio)
  const setStatValue = hasDropSets ? `${displayedWorkingSets} + ${totalDropSets}` : displayedWorkingSets
  const setStatLabel = hasDropSets ? 'Working + Drops' : (hasStrengthExercises ? 'Working Sets' : 'Entries')
  const roundedLoadVolume = totalLoadVolume === null || totalLoadVolume === undefined ? null : Math.round(totalLoadVolume)
  const roundedTrainingVolume = Math.round(totalVolume || 0)
  const showLoadMoved = roundedLoadVolume !== null && roundedLoadVolume !== roundedTrainingVolume
  const battleOutcome = getBattleOutcome(battle)
  const battleHighlights = [
    ...(battle?.yourHighlights || []).map(item => ({ ...item, owner: 'You' })),
    ...(battle?.opponentHighlights || []).map(item => ({ ...item, owner: battle?.opponentName || 'Opponent' })),
  ]

  const rankUpSignature = rankUps.map(r => `${r.from}>${r.to}`).join('|')
  const progressSignature = exerciseProgress
    .map(p => `${p.exerciseId}:${p.direction}:${p.tierChanged ? 1 : 0}`)
    .join('|')

  // Unified per-exercise recap in workout order. Rank-up takes precedence over progress
  // for the same exercise. Cardio + non-rankable strength exercises are filtered out
  // (they don't appear in either rankUps or exerciseProgress).
  const recap = useMemo(() => {
    const rankUpByName = new Map(rankUps.map(r => [r.exercise, r]))
    const progressByName = new Map(exerciseProgress.map(p => [p.exercise, p]))
    return exercises
      .filter(ex => !ex.isCardio)
      .map(ex => {
        const rankUp = rankUpByName.get(ex.name)
        if (rankUp) return { kind: 'rankup', key: ex.name, exercise: ex.name, data: rankUp }
        const progress = progressByName.get(ex.name)
        if (progress) return { kind: 'progress', key: ex.name, exercise: ex.name, data: progress }
        return null
      })
      .filter(Boolean)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, rankUpSignature, progressSignature])

  const revealItemCount = newAchievements.length + recap.length

  const revealSchedule = useMemo(() => {
    const offsets = []
    let cumulative = 150
    for (let i = 0; i < newAchievements.length; i++) {
      offsets.push(cumulative)
      cumulative += 1100
    }
    for (const item of recap) {
      offsets.push(cumulative)
      if (item.kind === 'rankup') {
        const walkLen = computeWalkPath(item.data.from, item.data.to).length
        cumulative += walkLen <= 1
          ? 2700 + 900
          : 2320 + (walkLen - 1) * STEP_MS + 550 + 300 + 900
      } else {
        // progress card
        const { direction, tierChanged } = item.data
        if (direction === 'same') cumulative += 800
        else if (tierChanged) {
          const tierBarMs = direction === 'down' ? PROGRESS_DOWN_DRAIN_MS : PROGRESS_BAR_FILL_MS
          const tierSwapMs = direction === 'down' ? PROGRESS_DOWN_SETTLE_MS : PROGRESS_TIER_SWAP_MS
          const landingMs = direction === 'down' ? PROGRESS_DOWN_LANDING_MS : PROGRESS_BAR_FILL_MS
          cumulative += PROGRESS_SLAM_MS + tierBarMs + tierSwapMs + landingMs + 200
        }
        else cumulative += PROGRESS_SLAM_MS + PROGRESS_BAR_FILL_MS + 200
      }
    }
    return offsets
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAchievements.length, recap])

  useEffect(() => {
    if (!show || revealSchedule.length === 0) return
    const timeouts = revealSchedule.map((offset, idx) =>
      setTimeout(() => setRevealIndex(curr => Math.max(curr, idx)), offset)
    )
    return () => timeouts.forEach(clearTimeout)
  }, [show, revealSchedule])

  const handleTapToSkip = useCallback((e) => {
    if (e.target.closest('button, a, input, textarea, [role="button"]')) return
    if (revealItemCount === 0) return
    setRevealIndex(curr => Math.min(curr + 1, revealItemCount - 1))
  }, [revealItemCount])

  // Achievement slam: ws-achievement-in peaks at 55% of 0.9s = ~495ms after revealed
  useEffect(() => {
    if (revealIndex < 0 || revealIndex >= newAchievements.length) return undefined
    if (prefersReducedMotion()) return undefined
    const t = setTimeout(() => {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
      triggerScreenShake('strong')
    }, 495)
    return () => clearTimeout(t)
  }, [revealIndex, newAchievements.length, triggerScreenShake])

  useEffect(() => {
    if (autoScrollPaused || revealIndex < 0) return
    const body = bodyRef.current
    const node = itemRefs.current[revealIndex]
    if (!body || !node) return
    const bodyRect = body.getBoundingClientRect()
    const nodeRect = node.getBoundingClientRect()
    const target = body.scrollTop + (nodeRect.top - bodyRect.top) - (bodyRect.height - nodeRect.height) / 2
    body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [revealIndex, autoScrollPaused])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const onUserInput = () => setAutoScrollPaused(true)
    body.addEventListener('wheel', onUserInput, { passive: true })
    body.addEventListener('touchmove', onUserInput, { passive: true })
    return () => {
      body.removeEventListener('wheel', onUserInput)
      body.removeEventListener('touchmove', onUserInput)
    }
  }, [])

  itemRefs.current.length = revealItemCount

  return (
    <div className={`ws-overlay ${show ? 'ws-overlay-in' : ''}`}>
      <div className={`ws-screen ${show ? 'ws-screen-in' : ''}`} ref={wsScreenRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Workout Summary">

        {/* Header */}
        <div className="ws-header">
          <div className={`ws-check ${show ? 'ws-check-in' : ''}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="ws-title">{battleOnly ? 'Battle Result Ready' : 'Workout Complete'}</div>
          {!battleOnly && <div className="ws-duration">{fmtTime(durationSeconds)}</div>}
        </div>

        {/* Stats row */}
        {!battleOnly && (
          <div className="ws-stats">
            <div className="ws-stat">
              <div className="ws-stat-value">{setStatValue}</div>
              <div className="ws-stat-label">{setStatLabel}</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-value">{exercises.length}</div>
              <div className="ws-stat-label">Exercises</div>
            </div>
            <div className="ws-stat-divider" />
            <div className="ws-stat">
              <div className="ws-stat-value">{fmtVolume(totalVolume)}</div>
              <div className="ws-stat-label">Effective Vol ({unit})</div>
            </div>
            {showLoadMoved && (
              <>
                <div className="ws-stat-divider" />
                <div className="ws-stat">
                  <div className="ws-stat-value">{fmtVolume(roundedLoadVolume)}</div>
                  <div className="ws-stat-label">Load Moved ({unit})</div>
                </div>
              </>
            )}
            {caloriesBurned > 0 && (
              <>
                <div className="ws-stat-divider" />
                <div className="ws-stat">
                  <div className="ws-stat-value">~{fmtCompact(caloriesBurned)}</div>
                  <div className="ws-stat-label">kcal</div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="ws-body" ref={bodyRef} onClick={handleTapToSkip}>
          {battle && battleOutcome && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
                {`${battle.battleModeLabel || 'Hybrid'} Head To Head`}
              </div>
              <div className={`ws-battle-card ws-battle-card-${battleOutcome.tone}`}>
                <div className="ws-battle-head">
                  <div className="ws-battle-pill">{battleOutcome.pill}</div>
                  <div>
                    <div className="ws-battle-title">{battleOutcome.title}</div>
                    <div className="ws-battle-subtitle">{battleOutcome.body}</div>
                  </div>
                </div>
                <div className="ws-battle-score">
                  <div className="ws-battle-score-item">
                    <strong>{battle.points?.you ?? 0}</strong>
                    <span>You</span>
                  </div>
                  <div className="ws-battle-score-sep">:</div>
                  <div className="ws-battle-score-item">
                    <strong>{battle.points?.opponent ?? 0}</strong>
                    <span>{battle.opponentName}</span>
                  </div>
                </div>
                {battle.scoreTotal && (
                  <div className="ws-battle-score-total">
                    Weighted score out of {battle.scoreTotal}
                  </div>
                )}
                <div className="ws-battle-metrics">
                  {battle.metrics?.map(metric => (
                    <div key={metric.id} className="ws-battle-metric-row">
                      <div className={`ws-battle-metric-value ${metric.winner === 'you' ? 'is-winner' : ''}`}>
                        {metric.available ? fmtMetricValue(metric, metric.yourValue) : '—'}
                      </div>
                      <div className="ws-battle-metric-center">
                        <div className="ws-battle-metric-label">{metric.label}</div>
                        <div className="ws-battle-metric-unit">
                          {metric.available
                            ? [metric.display, fmtMetricWeight(metric)].filter(Boolean).join(' · ')
                            : metric.unavailableText || 'Needs both lifters to log this metric'}
                        </div>
                      </div>
                      <div className={`ws-battle-metric-value ${metric.winner === 'opponent' ? 'is-winner' : ''}`}>
                        {metric.available ? fmtMetricValue(metric, metric.opponentValue) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
                {battleHighlights.length > 0 && (
                  <div className="ws-battle-highlights">
                    <div className="ws-battle-highlights-head">
                      <span>Not scored</span>
                      <small>PR and effort context</small>
                    </div>
                    {battleHighlights.map((highlight, index) => (
                      <div key={`${highlight.owner}-${highlight.type}-${highlight.title}-${index}`} className="ws-battle-highlight">
                        <div>
                          <strong>{highlight.title}</strong>
                          {highlight.body && <span>{highlight.body}</span>}
                        </div>
                        <em>{highlight.owner} · {getHighlightLabel(highlight.type)}</em>
                      </div>
                    ))}
                  </div>
                )}
                {battle.bodyweightFallbackUsed && (
                  <div className="ws-battle-note">
                    Bodyweight was missing for at least one lifter, so this recap filled the gap from the available bodyweights in the room or a 170 lb default.
                  </div>
                )}
              </div>
            </div>
          )}

          {!battleOnly && planCoaching && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"/></svg>
                Plan Coach
              </div>
              <div className={`ws-coach-card${coachApplyState === 'applied' ? ' ws-coach-card--applied' : ''}`}>
                <div className="ws-coach-pill">
                  {coachApplyState === 'applied' ? 'Applied to Plan' : 'Pending Review'}
                </div>
                <div className="ws-coach-title">{planCoaching.summary}</div>
                <div className="ws-coach-body">{planCoaching.body}</div>
                {planCoaching.metrics && (
                  <div className="ws-coach-metrics">
                    <span>{planCoaching.metrics.completedSets}/{planCoaching.metrics.plannedSets} sets</span>
                    <span>{planCoaching.metrics.actualMinutes}m actual</span>
                    <span>{Math.round((planCoaching.metrics.completionRate || 0) * 100)}% complete</span>
                  </div>
                )}
                {applyCoaching && coachApplyState !== 'applied' && (
                  <button
                    type="button"
                    className="ws-coach-apply"
                    disabled={coachApplyState === 'applying'}
                    onClick={async () => {
                      if (coachApplyState === 'applying') return
                      setCoachApplyState('applying')
                      try {
                        const ok = await applyCoaching()
                        setCoachApplyState(ok ? 'applied' : 'idle')
                      } catch {
                        setCoachApplyState('idle')
                      }
                    }}
                  >
                    {coachApplyState === 'applying'
                      ? <LoadingSpinner size="xs" color="currentColor" />
                      : 'Apply to Plan'}
                  </button>
                )}
                {coachApplyState === 'applied' && (
                  <div className="ws-coach-applied-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    Your plan has been updated
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New achievements */}
          {!battleOnly && newAchievements.length > 0 && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                Achievements Unlocked
              </div>
              <div className="ws-achievements">
                {newAchievements.map((a, i) => (
                  <div
                    key={a.id}
                    ref={el => { itemRefs.current[i] = el }}
                    className={`ws-achievement-card${revealIndex >= i ? ' ws-achievement-revealed' : ''}`}
                  >
                    <div className="ws-achievement-badge">
                      {a.emoji
                        ? <span style={{ fontSize: '20px' }}>{a.emoji}</span>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                      }
                    </div>
                    <div className="ws-achievement-info">
                      <div className="ws-achievement-title">{a.title}</div>
                      <div className="ws-achievement-desc">{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bodyweight-missing banner (shown in place of Rank Ups) */}
          {!battleOnly && bodyweightMissing && hasStrengthExercises && (
            <div className="ws-section">
              <div className="ws-rank-bw-warning">
                Bodyweight must be entered to see ranks.
              </div>
            </div>
          )}

          {/* Unified recap: one card per trained rankable exercise, in workout order */}
          {!battleOnly && recap.length > 0 && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
                Recap
              </div>
              <div className="ws-rankups">
                {recap.map((item, i) => {
                  const absoluteIdx = newAchievements.length + i
                  const isRevealed = revealIndex >= absoluteIdx
                  if (item.kind === 'rankup') {
                    return (
                      <RankUpCard
                        key={item.key}
                        ref={el => { itemRefs.current[absoluteIdx] = el }}
                        r={item.data}
                        revealed={isRevealed}
                        onSlam={triggerScreenShake}
                      />
                    )
                  }
                  return (
                    <ProgressCard
                      key={item.key}
                      ref={el => { itemRefs.current[absoluteIdx] = el }}
                      p={item.data}
                      revealed={isRevealed}
                      onSlam={triggerScreenShake}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Exercise list */}
          {!battleOnly && (
            <div className="ws-section">
              <div className="ws-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/></svg>
                Exercises
              </div>
              <div className="ws-exercises">
                {exercises.map(ex => {
                  const isOpen = expandedExercises.has(ex.name)
                  return (
                    <div key={ex.name} className="ws-exercise-item">
                      <button
                        className={`ws-exercise-header${isOpen ? ' open' : ''}`}
                        onClick={() => toggleExercise(ex.name)}
                        aria-expanded={isOpen}
                      >
                        <span className="ws-exercise-name">{ex.name}</span>
                        <svg className="ws-exercise-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="ws-exercise-sets">
                          {ex.isCardio
                            ? ex.sets.map((s, i) => {
                                const sec = s.durationSeconds || 0
                                const label = sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`
                                return (
                                  <div key={i} className="ws-exercise-set-row">
                                    <span className="ws-set-index">{i + 1}</span>
                                    <span className="ws-set-detail">{label}</span>
                                  </div>
                                )
                              })
                            : (() => {
                                let normalCount = 0
                                return ex.sets.map((s, i) => {
                                  const type = getSummarySetType(s)
                                  if (type === 'normal') normalCount++
                                  const indexLabel = type === 'warmup' ? 'W' : type === 'dropset' ? 'Drop' : String(normalCount)
                                  return (
                                    <div key={i} className={`ws-exercise-set-row ws-set-${type}`}>
                                      <span className="ws-set-index">{indexLabel}</span>
                                      <span className="ws-set-detail">{s.weight} {s.unit} × {s.reps}</span>
                                    </div>
                                  )
                                })
                              })()
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <button className="ws-done-btn" onClick={handleDismiss}>{battleOnly ? 'Close' : 'Done'}</button>
      </div>
    </div>
  )
}
