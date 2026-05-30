// Focused tests for Workout.jsx's gateOnBodyweight callback + bodyweightGateBusyRef
// race fix. Clones the mock prologue from Workout.finish.test.jsx (the established
// convention for focused Workout slices) and customizes _responses.profiles per test.

// ─── 1. Hoisted mocks ────────────────────────────────────────────────────────

const supabaseMock = vi.hoisted(() => {
  const _responses = {}

  function makeChain(tableName) {
    const chain = {
      select:      vi.fn(() => chain),
      eq:          vi.fn(() => chain),
      in:          vi.fn(() => chain),
      is:          vi.fn(() => chain),
      not:         vi.fn(() => chain),
      order:       vi.fn(() => chain),
      limit:       vi.fn(() => chain),
      gte:         vi.fn(() => chain),
      lte:         vi.fn(() => chain),
      insert:      vi.fn(() => chain),
      update:      vi.fn(() => chain),
      delete:      vi.fn(() => chain),
      upsert:      vi.fn(() => chain),
      single:      vi.fn(() => Promise.resolve(
        _responses[tableName] ?? { data: null, error: null }
      )),
      maybeSingle: vi.fn(() => Promise.resolve(
        _responses[tableName] ?? { data: null, error: null }
      )),
      then: (res, rej) =>
        Promise.resolve(_responses[tableName] ?? { data: [], error: null }).then(res, rej),
    }
    return chain
  }

  return {
    _responses,
    from: vi.fn(table => makeChain(table)),
    rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
  }
})

const isPremiumSyncMock = vi.hoisted(() => vi.fn(() => true))
const readDraftMock = vi.hoisted(() => vi.fn(() => ({ draft: null, expiredSessionId: null })))
const getAnchorsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ male: {}, female: {} }))
const mapRankStatesMock = vi.hoisted(() => vi.fn(() => new Map()))
const fetchProfileWithWorkoutCountMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  data: { gender: 'male', bodyweight: null, unit_preference: 'kg', lifetime_volume_kg: 0 },
  error: null,
}))

// ─── 2. Module mocks ─────────────────────────────────────────────────────────

vi.mock('../../lib/supabase.js',                  () => ({ supabase: supabaseMock }))
vi.mock('../../lib/workoutCompletion.js',         () => ({ finishWorkoutSessionAtomic: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../lib/purchases.js',                 () => ({ isPremiumSync: isPremiumSyncMock, refreshPremiumStatus: vi.fn().mockResolvedValue(true) }))
vi.mock('../../data/exercises.js',                () => ({ fetchExercises: vi.fn().mockResolvedValue([]), createCustomExercise: vi.fn() }))
vi.mock('../../data/rankStates.js',               () => ({ fetchExerciseRankStates: vi.fn().mockResolvedValue({ rows: [], missingTable: false }), mapExerciseRankStates: mapRankStatesMock }))
vi.mock('../../lib/strengthStandards.js',         () => ({
  getAnchors:    getAnchorsMock,
  TIERS:         ['Beginner', 'Intermediate', 'Advanced', 'Elite'],
  TIER_GROUPS:   [],
  TIER_COLORS:   {},
  expandAnchors: vi.fn(() => []),
  getTierIdx:    vi.fn(() => 0),
  getProgress:   vi.fn(() => 0),
  tierColor:     vi.fn(() => '#000'),
}))
vi.mock('../../lib/workoutCount.js',              () => ({ fetchProfileWithWorkoutCount: fetchProfileWithWorkoutCountMock }))
vi.mock('../../lib/cache.js',                     () => ({ invalidateCache: vi.fn(), getCached: vi.fn(() => null), setCached: vi.fn() }))
vi.mock('../../lib/admob.js',                     () => ({ showWorkoutCompleteAd: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../lib/restNotification.js',          () => ({ scheduleRestEndNotification: vi.fn(), cancelRestNotification: vi.fn() }))
vi.mock('../../lib/workoutDraft.js',              () => ({ WORKOUT_DRAFT_VERSION: 1, readStoredWorkoutDraft: readDraftMock, writeStoredWorkoutDraft: vi.fn(), clearStoredWorkoutDraft: vi.fn() }))
vi.mock('../../lib/battles.js',                   () => ({ getBattleModeLabel: vi.fn(() => 'Hybrid'), loadBattleRecap: vi.fn().mockResolvedValue(null), loadOpponentEvents: vi.fn().mockResolvedValue([]), publishWorkoutRoomEvent: vi.fn().mockResolvedValue(undefined), recordBattleResultAtomic: vi.fn().mockResolvedValue({ finalized: false }) }))
vi.mock('../../lib/battleProjection.js',          () => ({ buildRemoteWorkouts: vi.fn(() => []) }))
vi.mock('../../lib/progressiveOverload.js',       () => ({ fetchRecentSessionsWithStatus: vi.fn().mockResolvedValue({ sessions: [], status: {} }), buildCurrentSetSuggestion: vi.fn(() => null), resolveCompletedSetProgressionEvent: vi.fn(() => null), buildExerciseSnapWeight: vi.fn(() => null) }))
vi.mock('../../lib/incrementSettings.js',         () => ({ getCustomIncrements: vi.fn(() => ({})), setCustomIncrementKg: vi.fn(), getCustomStartingWeights: vi.fn(() => ({})), setCustomStartingWeightKg: vi.fn() }))
vi.mock('../../lib/backStack.js',                 () => ({ push: vi.fn(() => 1), remove: vi.fn() }))
vi.mock('../../lib/localDraftSanitizers.js',      () => ({ sanitizeHiddenTemplateIds: vi.fn(() => []), sanitizeWorkoutDraft: vi.fn(d => d) }))
vi.mock('../../lib/rollingRanks.js',              () => ({ clampContinuousTierScore: vi.fn(s => s ?? 0), updateRollingScore: vi.fn(() => 0), resolveTierFromScore: vi.fn(score => ({ tierIdx: Math.floor(score ?? 0) })) }))
vi.mock('../../lib/calorieMath.js',               () => ({ estimateCaloriesBurned: vi.fn(() => 0) }))
vi.mock('../../lib/trainingPlanGenerator.js',     async importOriginal => ({ ...(await importOriginal()), generateTrainingPlan: vi.fn().mockResolvedValue({ days: [] }) }))
vi.mock('../../lib/trainingPlanAdaptation.js',    async importOriginal => ({ ...(await importOriginal()), buildPlanAdaptation: vi.fn(() => null), applyPlanAdaptation: vi.fn(p => p) }))
vi.mock('../../lib/planDeload.js',                async importOriginal => ({ ...(await importOriginal()), getActivePlanWeek: vi.fn(() => 1), isScheduledDeloadWeek: vi.fn(() => false) }))

vi.mock('../../components/Paywall.jsx',                 () => ({ default: () => null }))
vi.mock('../../components/RestWheelPicker.jsx',         () => ({ default: () => null }))
vi.mock('../../components/ProgressionSuggestion.jsx',   () => ({ default: () => null }))
vi.mock('../../components/PlateCalculator.jsx',         () => ({ default: () => null }))
vi.mock('../../components/exercise/ExerciseDetail.jsx', () => ({ default: () => null }))

// ─── 3. Imports ──────────────────────────────────────────────────────────────

import { render, screen, fireEvent, act } from '@testing-library/react'
import Workout from '../../components/Workout.jsx'
import { UserProvider } from '../../context/UserContext.jsx'

const TEST_USER = { id: 'user-1' }

function renderWorkout(props = {}) {
  return render(
    <UserProvider user={TEST_USER}>
      <div className="app">
        <Workout isVisible={true} onFinish={vi.fn()} {...props} />
      </div>
    </UserProvider>
  )
}

// ─── 4. Tests ────────────────────────────────────────────────────────────────

describe('Workout gateOnBodyweight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPremiumSyncMock.mockReturnValue(true)
    readDraftMock.mockReturnValue({ draft: null, expiredSessionId: null })
    getAnchorsMock.mockResolvedValue({ male: {}, female: {} })
    mapRankStatesMock.mockReturnValue(new Map())

    Object.assign(supabaseMock._responses, {
      // Default: bodyweight null → triggers the gate's async branch on click
      profiles: { data: { default_rest_seconds: 90, unit_preference: 'kg', bodyweight: null, gender: 'male' }, error: null },
      user_training_plans:           { data: [], error: null },
      user_routines:                 { data: [], error: null },
      user_exercise_preferences:     { data: [], error: null },
      user_training_plan_adaptations: { data: [], error: null },
      workout_sessions:              { data: { id: 'test-session-id' }, error: null },
      exercise_prs:                  { data: [], error: null },
    })
  })

  it('runs the action synchronously when userBodyweightKg is already cached from initial mount', async () => {
    // Initial mount populates userBodyweightKg from the profile fetch
    supabaseMock._responses.profiles = { data: { default_rest_seconds: 90, unit_preference: 'kg', bodyweight: 70, gender: 'male' }, error: null }

    renderWorkout()
    await screen.findByText('Empty Workout')

    // Count profiles fetches done during mount, so we can verify the gate skips them.
    const profilesFetchesBefore = supabaseMock.from.mock.calls.filter(c => c[0] === 'profiles').length

    fireEvent.click(screen.getByText('Empty Workout'))
    // Active-workout screen appears (action ran). No bodyweight warning modal.
    await screen.findByText('Finish Workout')

    expect(screen.queryByText('Log your bodyweight?')).toBeNull()
    // Gate path with cached bodyweight does NOT issue another profiles fetch
    const profilesFetchesAfter = supabaseMock.from.mock.calls.filter(c => c[0] === 'profiles').length
    expect(profilesFetchesAfter).toBe(profilesFetchesBefore)
  })

  it('completes the async fetch and runs the action when the gate resolves with a bodyweight', async () => {
    // Initial mount returns null bodyweight
    renderWorkout()
    await screen.findByText('Empty Workout')

    // Swap the profiles response so the gate's async fetch sees a real bodyweight
    supabaseMock._responses.profiles = { data: { bodyweight: 72, unit_preference: 'kg' }, error: null }

    await act(async () => {
      fireEvent.click(screen.getByText('Empty Workout'))
    })

    await screen.findByText('Finish Workout')
    expect(screen.queryByText('Log your bodyweight?')).toBeNull()
  })

  it('opens the bodyweight warning modal when the async fetch resolves with no bodyweight', async () => {
    renderWorkout()
    await screen.findByText('Empty Workout')

    // _responses.profiles still has bodyweight: null from beforeEach
    await act(async () => {
      fireEvent.click(screen.getByText('Empty Workout'))
    })

    // Warning modal appears via the createPortal'd dialog
    await screen.findByText('Log your bodyweight?')
    // Workout did NOT start
    expect(screen.queryByText('Finish Workout')).toBeNull()
  })

  it('opens the bodyweight warning modal when the async fetch rejects (network/RLS failure)', async () => {
    renderWorkout()
    await screen.findByText('Empty Workout')

    // Override the next `from('profiles')` chain so its single() rejects
    supabaseMock.from.mockImplementationOnce(table => {
      if (table === 'profiles') {
        const chain = {
          select: vi.fn(() => chain),
          eq:     vi.fn(() => chain),
          single: vi.fn(() => Promise.reject(new Error('RLS denied'))),
        }
        return chain
      }
      return { select: vi.fn(() => ({})), then: (r) => Promise.resolve({ data: [], error: null }).then(r) }
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Empty Workout'))
    })

    await screen.findByText('Log your bodyweight?')
    expect(screen.queryByText('Finish Workout')).toBeNull()
  })

  it('does not double-fetch when the gate is busy (busy guard early-return)', async () => {
    renderWorkout()
    await screen.findByText('Empty Workout')

    const profilesFetchesBefore = supabaseMock.from.mock.calls.filter(c => c[0] === 'profiles').length

    // Two rapid clicks before the async fetch resolves
    fireEvent.click(screen.getByText('Empty Workout'))
    fireEvent.click(screen.getByText('Empty Workout'))

    // Flush the pending async fetch
    await act(async () => { await Promise.resolve() })

    const profilesFetchesAfter = supabaseMock.from.mock.calls.filter(c => c[0] === 'profiles').length
    // Exactly one additional profiles fetch fired between the two clicks —
    // the busy guard early-returned the second click before it could re-enter
    // the async branch.
    expect(profilesFetchesAfter - profilesFetchesBefore).toBe(1)
  })
})
