import { render, act, fireEvent } from '@testing-library/react'
import { Haptics } from '@capacitor/haptics'

import WorkoutSummary from '../../components/WorkoutSummary.jsx'

// Timing constants mirrored from WorkoutSummary.jsx
const SHOW_DELAY_MS = 30
const STEP_MS = 450
const RANKUP_WALK_START_MS = 2320
const PROGRESS_SLAM_MS = 810
const PROGRESS_BAR_FILL_MS = 600
const PROGRESS_TIER_SWAP_MS = 350

const baseSummary = {
  durationSeconds: 1200,
  caloriesBurned: 0,
  totalSets: 1,
  totalWorkingSets: 1,
  totalDropSets: 0,
  totalVolume: 100,
  totalLoadVolume: 100,
  unit: 'kg',
}

function makeExercise(overrides = {}) {
  return {
    name: 'Bench Press',
    isCardio: false,
    sets: [{ weight: 100, reps: 5, unit: 'kg', setType: 'normal' }],
    ...overrides,
  }
}

function makeRankUp(overrides = {}) {
  return {
    exercise: 'Bench Press',
    from: 'Bronze I',
    to: 'Bronze II',
    color: '#cd7f32',
    toProgress: 50,
    toNextTier: 'Bronze III',
    toIsMax: false,
    ...overrides,
  }
}

function makeProgressItem(overrides = {}) {
  return {
    exerciseId: 'bench',
    exercise: 'Bench Press',
    tier: 'Bronze I',
    tierIdx: 0,
    nextTier: 'Bronze II',
    progress: 50,
    color: '#cd7f32',
    isMax: false,
    previousTier: 'Bronze I',
    previousTierIdx: 0,
    previousProgress: 25,
    previousColor: '#cd7f32',
    direction: 'up',
    tierChanged: false,
    ...overrides,
  }
}

// Drives reveal-tick state changes inside an act() boundary so React flushes them.
function advance(ms) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// React only schedules the reveal timeouts AFTER the show=true commit, so we
// must flush the show effect before counting time toward the first reveal.
// Splits the advance into: 35ms (show flip + commit) + remaining.
function advancePastShow(ms = 0) {
  advance(35)
  if (ms > 0) advance(ms)
}

describe('WorkoutSummary recap pipeline', () => {
  let animateSpy
  let originalMatchMedia

  beforeEach(() => {
    vi.useFakeTimers()
    // Spy on the animate stub installed by setup.js so we can assert it was called.
    animateSpy = vi.spyOn(Element.prototype, 'animate').mockReturnValue({
      cancel: vi.fn(),
    })
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    animateSpy.mockRestore()
    window.matchMedia = originalMatchMedia
    vi.useRealTimers()
  })

  // ─── revealSchedule + tap-to-skip ─────────────────────────────────────────

  it('does not reveal any recap items before the schedule starts', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem()],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)
    // No revealed cards yet — show hasn't flipped true
    expect(container.querySelector('.ws-progress-card-revealed')).toBeNull()
  })

  it('advances revealIndex through the cumulative schedule (achievements)', () => {
    const achievement = { id: 'ach-1', name: 'First Workout', tier: 'Bronze I', emoji: '🥉' }
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      newAchievements: [achievement, { ...achievement, id: 'ach-2' }, { ...achievement, id: 'ach-3' }],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    // show flips after 30ms; first reveal at +150ms = 180ms total
    advancePastShow(150 + 5)
    expect(container.querySelectorAll('.ws-achievement-revealed')).toHaveLength(1)

    // next reveal at +1100 cumulative
    advance(1100)
    expect(container.querySelectorAll('.ws-achievement-revealed')).toHaveLength(2)

    advance(1100)
    expect(container.querySelectorAll('.ws-achievement-revealed')).toHaveLength(3)
  })

  it('tap-to-skip advances revealIndex when clicking outside an interactive element', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem()],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)
    advancePastShow() // show=true, no reveal yet

    const body = container.querySelector('.ws-body')
    expect(body).toBeTruthy()
    expect(container.querySelector('.ws-progress-card-revealed')).toBeNull()

    fireEvent.click(body)
    expect(container.querySelector('.ws-progress-card-revealed')).toBeTruthy()
  })

  it('tap-to-skip ignores clicks on buttons inside ws-body', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem()],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)
    advancePastShow()

    // Inject a button into ws-body so we can verify the closest-button guard
    const body = container.querySelector('.ws-body')
    const fakeBtn = document.createElement('button')
    body.appendChild(fakeBtn)

    fireEvent.click(fakeBtn)
    expect(container.querySelector('.ws-progress-card-revealed')).toBeNull()
  })

  // ─── RankUpCard postWalk ──────────────────────────────────────────────────

  it('flips the RankUpCard into postWalk state after the walk completes', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      rankUps: [makeRankUp({ from: 'Bronze I', to: 'Bronze II' })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    // Walk from Bronze I → Bronze II has walkPath.length = 1 (single tier)
    // postWalkDelay = 1700 (since walkPath.length <= 1)
    advancePastShow(150 + 5)
    // Card is revealed but not yet postWalk
    const card = container.querySelector('.ws-rankup-card')
    expect(card).toBeTruthy()
    expect(card.classList.contains('ws-rankup-revealed')).toBe(true)
    expect(card.classList.contains('ws-rankup-postwalk')).toBe(false)

    // Advance past postWalk delay (1700ms after reveal)
    advance(1750)
    expect(card.classList.contains('ws-rankup-postwalk')).toBe(true)
  })

  it('applies the landing transform after landingApplied flips on RankUpCard', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      rankUps: [makeRankUp({ toProgress: 70 })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    advance(1750) // postWalk fires
    advance(250)  // landingApplied fires (220ms after postWalk)

    const fill = container.querySelector('.ws-rankup-bar-fill-landing')
    expect(fill).toBeTruthy()
    expect(fill.style.transform).toBe('scaleX(0.7)')
  })

  // ─── ProgressCard 4-stage machine ─────────────────────────────────────────

  it('immediately stages a maintained ProgressCard at final with no haptic', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem({ direction: 'same', tierChanged: false, progress: 30, previousProgress: 30 })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    const card = container.querySelector('.ws-progress-card')
    expect(card.classList.contains('ws-progress-card-maintained')).toBe(true)
    expect(card.classList.contains('ws-progress-card-shaking')).toBe(false)

    // Bar should be at progress (30%) since stage went straight to 'final'
    const fill = container.querySelector('.ws-progress-card-bar-fill')
    expect(fill.style.width).toBe('30%')

    // No haptic on maintained tier (the slam haptic is gated on isMaintained === false)
    expect(Haptics.impact).not.toHaveBeenCalled()
  })

  it('progresses a tier-changed ProgressCard through initial → transitioning → tierSwap → final', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem({
        direction: 'up',
        tierChanged: true,
        tier: 'Silver I',
        previousTier: 'Bronze III',
        nextTier: 'Silver II',
        progress: 30,
        previousProgress: 90,
      })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    // Initial stage: bar still at previousProgress (90%)
    expect(container.querySelector('.ws-progress-card-bar-fill').style.width).toBe('90%')

    // After PROGRESS_SLAM_MS → transitioning: bar drains to 0
    advance(PROGRESS_SLAM_MS + 5)
    expect(container.querySelector('.ws-progress-card-bar-fill').style.width).toBe('0%')

    // After PROGRESS_BAR_FILL_MS more → tierSwap: bar still 0, badges flip
    advance(PROGRESS_BAR_FILL_MS + 5)
    expect(container.querySelector('.ws-progress-card-bar-fill').style.width).toBe('0%')

    // After PROGRESS_TIER_SWAP_MS more → final: bar at new progress
    advance(PROGRESS_TIER_SWAP_MS + 5)
    expect(container.querySelector('.ws-progress-card-bar-fill').style.width).toBe('30%')
  })

  it('skips transitioning/tierSwap stages for an up-direction with no tier change', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem({ direction: 'up', tierChanged: false, progress: 80, previousProgress: 50 })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    // initial: bar at previousProgress (50%)
    expect(container.querySelector('.ws-progress-card-bar-fill').style.width).toBe('50%')

    advance(PROGRESS_SLAM_MS + 5)
    // final: bar at progress (80%) — skipped transitioning + tierSwap
    expect(container.querySelector('.ws-progress-card-bar-fill').style.width).toBe('80%')
  })

  it('applies the shaking class for a downward tier-changed progress card', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem({
        direction: 'down',
        tierChanged: true,
        tier: 'Bronze III',
        previousTier: 'Silver I',
        nextTier: 'Silver I',
        progress: 80,
        previousProgress: 10,
      })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    advance(PROGRESS_SLAM_MS + 5)
    // Right after the slam, isDown card should be shaking
    expect(container.querySelector('.ws-progress-card-shaking')).toBeTruthy()

    // After the 380ms shake window, the shaking class is removed
    advance(385)
    expect(container.querySelector('.ws-progress-card-shaking')).toBeNull()
  })

  // ─── Haptics + screen shake ────────────────────────────────────────────────

  it('fires a Heavy haptic when an achievement reveals', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      newAchievements: [{ id: 'ach-1', name: 'First Workout', tier: 'Bronze I' }],
    }
    render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    // Phase 1: show flips + reveal-tick fires (revealIndex → 0).
    // Phase 2: the achievement-slam useEffect schedules a +495ms timer after revealIndex
    // commits, so we need a separate advance() for the slam itself.
    advancePastShow(150 + 5)
    advance(495 + 5)
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' })
  })

  it('triggerScreenShake calls Element.prototype.animate on the screen ref after achievement reveal', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      newAchievements: [{ id: 'ach-1', name: 'First Workout', tier: 'Bronze I' }],
    }
    render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    advance(495 + 5)
    expect(animateSpy).toHaveBeenCalled()
    // Strong shake → duration 380ms
    const [, opts] = animateSpy.mock.calls[0]
    expect(opts.duration).toBe(380)
  })

  it('fires a Light haptic on a non-maintained ProgressCard slam', () => {
    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem({ direction: 'up', tierChanged: false })],
    }
    render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    advance(PROGRESS_SLAM_MS + 5)
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' })
  })

  // ─── Reduced-motion bailout ────────────────────────────────────────────────

  it('skips haptics and screen shake when prefers-reduced-motion is set', () => {
    window.matchMedia = (query) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })

    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      newAchievements: [{ id: 'ach-1', name: 'First Workout', tier: 'Bronze I' }],
      exerciseProgress: [makeProgressItem({ direction: 'up', tierChanged: false })],
    }
    render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    // Advance well past every reveal + slam window
    advancePastShow(150 + 1100 + PROGRESS_SLAM_MS + 1000)

    expect(Haptics.impact).not.toHaveBeenCalled()
    expect(animateSpy).not.toHaveBeenCalled()
  })

  it('still reveals cards under reduced motion (silent reveal, not blocked)', () => {
    window.matchMedia = (query) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })

    const summary = {
      ...baseSummary,
      exercises: [makeExercise()],
      exerciseProgress: [makeProgressItem({ direction: 'up', tierChanged: false })],
    }
    const { container } = render(<WorkoutSummary summary={summary} onDismiss={vi.fn()} />)

    advancePastShow(150 + 5)
    expect(container.querySelector('.ws-progress-card-revealed')).toBeTruthy()
  })
})
