// ─── 1. Hoisted mock values (resolved before any module import) ───────────────

/**
 * Chainable Supabase mock. Each `.from(table)` call returns a builder whose
 * terminal methods (`.single()` / direct-await via `.then()`) resolve from
 * the `_responses` registry. Tests configure defaults in `beforeEach`.
 *
 * Pattern handles all query shapes used by Workout.jsx:
 *   .from(t).select().eq().single()
 *   .from(t).select().eq().order()          ← awaited without .single()
 *   .from(t).insert().select().single()
 *   .from(t).select().eq().in()             ← awaited without .single()
 */
const supabaseMock = vi.hoisted(() => {
  const _responses = {}

  function makeChain(tableName) {
    const chain = {
      select:      vi.fn(() => chain),
      eq:          vi.fn(() => chain),
      in:          vi.fn(() => chain),
      is:          vi.fn(() => chain), // used by resumeSavedWorkout: .is('finished_at', null)
      not:         vi.fn(() => chain),
      order:       vi.fn(() => chain),
      limit:       vi.fn(() => chain),
      gte:         vi.fn(() => chain),
      lte:         vi.fn(() => chain),
      insert:      vi.fn(() => chain),
      update:      vi.fn(() => chain),
      delete:      vi.fn(() => chain),
      upsert:      vi.fn(() => chain),
      // terminal: explicit .single() call
      single:      vi.fn(() => Promise.resolve(
        _responses[tableName] ?? { data: null, error: null }
      )),
      maybeSingle: vi.fn(() => Promise.resolve(
        _responses[tableName] ?? { data: null, error: null }
      )),
      // terminal: plain `await chain` (no .single()), e.g. order(), in()
      then: (res, rej) =>
        Promise.resolve(
          _responses[tableName] ?? { data: [], error: null }
        ).then(res, rej),
    }
    return chain
  }

  return {
    _responses,
    from: vi.fn(table => makeChain(table)),
    rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => ({
      on: vi.fn(function on() { return this }),
      subscribe: vi.fn(function subscribe() { return this }),
    })),
    removeChannel: vi.fn(),
  }
})

/** The key test target — replaces finishWorkoutSessionAtomic at module level */
const finishAtomicMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

/**
 * Controls whether handleEmptyWorkoutStart bypasses the ad gate.
 * Must return true so performStartWorkout() is called directly.
 */
const isPremiumSyncMock = vi.hoisted(() => vi.fn(() => true))

/**
 * readStoredWorkoutDraft — hoisted so Test 5 can inject a pre-built exercise
 * draft via mockReturnValueOnce without touching other tests.
 */
const readDraftMock = vi.hoisted(() => vi.fn(() => ({ draft: null, expiredSessionId: null })))
const clearStoredWorkoutDraftMock = vi.hoisted(() => vi.fn())

/**
 * getAnchors — hoisted so Test 5 can supply exercise-specific anchors that
 * activate the rank-state pipeline for the test exercise.
 */
const getAnchorsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ male: {}, female: {} }))

/**
 * mapExerciseRankStates — hoisted so Test 5 can inject a previous rank-state
 * Map for the test exercise, letting the component compute peakScore correctly.
 */
const mapRankStatesMock = vi.hoisted(() => vi.fn(() => new Map()))

const fetchProfileWithWorkoutCountMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  data: { gender: 'male', bodyweight: 70, unit_preference: 'kg', lifetime_volume_kg: 0 },
  error: null,
}))

// ─── 2. Module mocks (hoisted by Vitest before imports) ───────────────────────

vi.mock('../../lib/supabase.js',             () => ({ supabase: supabaseMock }))

vi.mock('../../lib/workoutCompletion.js',    () => ({
  finishWorkoutSessionAtomic: finishAtomicMock,
}))

vi.mock('../../lib/purchases.js',           () => ({
  isPremiumSync:        isPremiumSyncMock,
  refreshPremiumStatus: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../data/exercises.js',          () => ({
  fetchExercises:       vi.fn().mockResolvedValue([]),
  createCustomExercise: vi.fn(),
}))

vi.mock('../../data/rankStates.js',         () => ({
  // returns { rows, missingTable } — Workout.jsx reads rankStatesResult.rows (line 2219)
  fetchExerciseRankStates: vi.fn().mockResolvedValue({ rows: [], missingTable: false }),
  // hoisted so Test 5 can inject a per-exercise Map via mockReturnValueOnce
  mapExerciseRankStates:   mapRankStatesMock,
}))

vi.mock('../../lib/strengthStandards.js',   () => ({
  // hoisted so Test 5 can supply exercise-specific anchors via mockResolvedValueOnce
  getAnchors:    getAnchorsMock,
  TIERS:         ['Beginner', 'Intermediate', 'Advanced', 'Elite'],
  TIER_GROUPS:   [],
  TIER_COLORS:   {},
  expandAnchors: vi.fn(() => []),
  getTierIdx:    vi.fn(() => 0),
  getProgress:   vi.fn(() => 0),
  tierColor:     vi.fn(() => '#000'),
}))

vi.mock('../../lib/workoutCount.js',        () => ({
  fetchProfileWithWorkoutCount: fetchProfileWithWorkoutCountMock,
}))

vi.mock('../../lib/cache.js',               () => ({
  invalidateCache: vi.fn(),
  getCached:       vi.fn(() => null),
  setCached:       vi.fn(),
}))

vi.mock('../../lib/admob.js',               () => ({
  showWorkoutCompleteAd: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/restNotification.js',    () => ({
  scheduleRestEndNotification: vi.fn(),
  cancelRestNotification:      vi.fn(),
}))

vi.mock('../../lib/workoutDraft.js',        () => ({
  WORKOUT_DRAFT_VERSION:   1,
  // hoisted so Test 5 can inject a draft via mockReturnValueOnce;
  // default → null draft → no "Resume Workout" prompt → "Empty Workout" button visible
  readStoredWorkoutDraft:  readDraftMock,
  writeStoredWorkoutDraft: vi.fn(),
  clearStoredWorkoutDraft: clearStoredWorkoutDraftMock,
}))

vi.mock('../../lib/battles.js',             () => ({
  getBattleModeLabel:       vi.fn(() => 'Hybrid'),
  loadBattleRecap:          vi.fn().mockResolvedValue(null),
  loadOpponentEvents:       vi.fn().mockResolvedValue([]),
  publishWorkoutRoomEvent:  vi.fn().mockResolvedValue(undefined),
  recordBattleResultAtomic: vi.fn().mockResolvedValue({ finalized: false }),
}))

vi.mock('../../lib/battleProjection.js',    () => ({
  // Called synchronously on every render (line 3858) — must return an array
  buildRemoteWorkouts: vi.fn(() => []),
}))

vi.mock('../../lib/progressiveOverload.js', () => ({
  fetchRecentSessionsWithStatus:       vi.fn().mockResolvedValue({ sessions: [], status: {} }),
  buildCurrentSetSuggestion:           vi.fn(() => null),
  resolveCompletedSetProgressionEvent: vi.fn(() => null),
  buildExerciseSnapWeight:             vi.fn(() => null),
}))

vi.mock('../../lib/incrementSettings.js',   () => ({
  getCustomIncrements:       vi.fn(() => ({})),
  setCustomIncrementKg:      vi.fn(),
  getCustomStartingWeights:  vi.fn(() => ({})),
  setCustomStartingWeightKg: vi.fn(),
}))

vi.mock('../../lib/backStack.js',           () => ({
  push:   vi.fn(() => 1),
  remove: vi.fn(),
}))

vi.mock('../../lib/localDraftSanitizers.js', () => ({
  // Used in useState initialiser (line 682) — return [] to avoid localStorage parse
  sanitizeHiddenTemplateIds: vi.fn(() => []),
  sanitizeWorkoutDraft:      vi.fn(d => d),
}))

vi.mock('../../lib/rollingRanks.js',        () => ({
  clampContinuousTierScore: vi.fn(s => s ?? 0),
  updateRollingScore:       vi.fn(() => 0),
  resolveTierFromScore:     vi.fn(score => ({ tierIdx: Math.floor(score ?? 0) })),
}))

vi.mock('../../lib/calorieMath.js',         () => ({
  estimateCaloriesBurned: vi.fn(() => 0),
}))

// Spread real module and replace only the async/side-effecting functions.
// The constants (DEFAULT_TRAINING_PLAN_FORM, TRAINING_PLAN_WEEKDAYS, etc.)
// are used in useState initialisers and must keep their real values.
vi.mock('../../lib/trainingPlanGenerator.js', async importOriginal => {
  const real = await importOriginal()
  return {
    ...real,
    generateTrainingPlan: vi.fn().mockResolvedValue({ days: [] }),
  }
})

vi.mock('../../lib/trainingPlanAdaptation.js', async importOriginal => {
  const real = await importOriginal()
  return {
    ...real,
    buildPlanAdaptation: vi.fn(() => null),
    applyPlanAdaptation: vi.fn(p => p),
  }
})

vi.mock('../../lib/planDeload.js', async importOriginal => {
  const real = await importOriginal()
  return {
    ...real,
    getActivePlanWeek:     vi.fn(() => 1),
    isScheduledDeloadWeek: vi.fn(() => false),
  }
})

// Sub-component stubs — avoid pulling in their dependency trees
vi.mock('../../components/Paywall.jsx',                 () => ({ default: () => null }))
vi.mock('../../components/RestWheelPicker.jsx',         () => ({ default: () => null }))
vi.mock('../../components/ProgressionSuggestion.jsx',   () => ({ default: () => null }))
vi.mock('../../components/PlateCalculator.jsx',         () => ({ default: () => null }))
// ExerciseDetail is lazy-loaded — prevent Suspense from hanging
vi.mock('../../components/exercise/ExerciseDetail.jsx', () => ({ default: () => null }))

// ─── 3. Imports ───────────────────────────────────────────────────────────────
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import Workout from '../../components/Workout.jsx'
import { UserProvider } from '../../context/UserContext.jsx'
import { getTierIdx } from '../../lib/strengthStandards'
import { fetchRecentSessionsWithStatus } from '../../lib/progressiveOverload'

// ─── 4. Helpers ───────────────────────────────────────────────────────────────

const TEST_USER = { id: 'user-1' }

/**
 * Wraps Workout in the required providers.
 * The `.app` div provides the portal target for createPortal confirm dialogs
 * (Workout.jsx line 2531: document.querySelector('.app') || document.body).
 */
function renderWorkout(props = {}) {
  const onFinish = props.onFinish ?? vi.fn()
  const result = render(
    <UserProvider user={TEST_USER}>
      <div className="app">
        <Workout isVisible={true} onFinish={onFinish} {...props} />
      </div>
    </UserProvider>
  )
  return { ...result, onFinish }
}

/**
 * Navigates from the workout home screen to an active workout.
 * Clicks "Empty Workout" → waits for the active workout view (optimistic) →
 * flushes the async session insert so sessionId is set in the finishWorkout closure.
 */
async function startEmptyWorkout() {
  // wait for init useEffect to complete (loading → false reveals home screen)
  await screen.findByText('Empty Workout')
  fireEvent.click(screen.getByText('Empty Workout'))
  // setActiveWorkout(true) is optimistic — "Finish Workout" appears immediately
  await screen.findByText('Finish Workout')
  // flush the async workout_sessions insert so sessionId = 'test-session-id'
  await act(async () => {})
}

/**
 * Opens the finish confirmation dialog.
 * Clicks "Finish Workout" and waits for the dialog title to appear.
 */
async function openFinishDialog() {
  fireEvent.click(screen.getByText('Finish Workout'))
  await screen.findByText('Finish Workout?') // dialog title (via createPortal)
}

/**
 * Resumes a workout from a pre-loaded draft (Test 5 path).
 * readDraftMock must have been primed with mockReturnValueOnce(draft) BEFORE
 * renderWorkout() is called, so the init useEffect picks up the draft and the
 * home screen shows the "Resume" button.
 *
 * resumeSavedWorkout() verifies the session still exists via
 *   supabase.from('workout_sessions').select('id, finished_at').eq().eq().maybeSingle()
 * The _responses['workout_sessions'] entry supplies the maybeSingle result.
 */
async function startFromDraft() {
  await screen.findByText('Resume')              // draft banner appears after init
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
  await screen.findByText('Finish Workout')      // setActiveWorkout(true) completed
  await act(async () => {})                      // flush remaining async state
}

// ─── 5. Tests ─────────────────────────────────────────────────────────────────

describe('Workout finish flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-populate the Supabase response registry with safe defaults.
    // clearAllMocks() clears call history but not plain object state.
    Object.assign(supabaseMock._responses, {
      profiles: {
        data: { default_rest_seconds: 90, unit_preference: 'kg', bodyweight: 70, gender: 'male' },
        error: null,
      },
      // user_training_plans must carry { error } because line 809 reads plansResponse.error
      user_training_plans:        { data: [], error: null },
      user_routines:              { data: [], error: null },
      user_exercise_preferences:  { data: [], error: null },
      user_training_plan_adaptations: { data: [], error: null },
      // insert response — performStartWorkout reads sess.id from here
      workout_sessions:           { data: { id: 'test-session-id' }, error: null },
      // finishWorkout reads prevBests from here via .in()
      exercise_prs:               { data: [], error: null },
    })

    // Re-set mock implementations (clearAllMocks clears call history only,
    // but a prior mockRejectedValue / mockImplementation can linger).
    finishAtomicMock.mockResolvedValue(undefined)
    isPremiumSyncMock.mockReturnValue(true)

    // Restore defaults for hoisted mocks used by Test 5.
    // mockReturnValueOnce is consumed after one render; these lines are a
    // safety net in case a test aborts before consuming its once-override.
    readDraftMock.mockReturnValue({ draft: null, expiredSessionId: null })
    getAnchorsMock.mockResolvedValue({ male: {}, female: {} })
    mapRankStatesMock.mockReturnValue(new Map())
    fetchProfileWithWorkoutCountMock.mockResolvedValue({
      data: { gender: 'male', bodyweight: 70, unit_preference: 'kg', lifetime_volume_kg: 0 },
      error: null,
    })
  })

  // ── Test 1 ─────────────────────────────────────────────────────────────────

  it('calls finishWorkoutSessionAtomic with the session ID and invokes onFinish on success', async () => {
    const { onFinish } = renderWorkout()

    await startEmptyWorkout()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    // RPC must be called exactly once with the correct session and empty sets
    await waitFor(() => {
      expect(finishAtomicMock).toHaveBeenCalledTimes(1)
    })
    expect(finishAtomicMock).toHaveBeenCalledWith(
      supabaseMock,
      expect.objectContaining({
        sessionId: 'test-session-id',
        sets: [],
      })
    )

    // Workout state cleared: home screen restored, active-workout elements gone
    await waitFor(() => {
      expect(screen.queryByText('Finish Workout')).toBeNull()
      expect(screen.queryByText('Workout in progress')).toBeNull()
    })

    // onFinish called with a valid summary object
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    const [summary] = onFinish.mock.calls[0]
    expect(summary).toHaveProperty('durationSeconds')
    expect(summary).toHaveProperty('totalSets', 0)
    expect(summary).toHaveProperty('exercises')

    // No error message anywhere
    expect(screen.queryByText(/Could not save workout/i)).toBeNull()
  })

  it('refreshes active progression history when workoutHistoryRefreshTick changes', async () => {
    const BENCH_ID = 88
    const exerciseDraft = {
      sessionId: 'test-session-id',
      startedAt: Date.now() - 120_000,
      savedAt: Date.now() - 10_000,
      defaultUnit: 'kg',
      defaultRest: 90,
      exerciseNotes: {},
      notesOpen: {},
      workoutExercises: [{
        id: BENCH_ID,
        name: 'Bench Press',
        category: 'Strength',
        unit: 'kg',
        equipment: 'Barbell',
        primary_muscles: ['Chest'],
        secondary_muscles: [],
        sets: [{ reps: '', weight: '', done: false, setType: 'normal' }],
      }],
    }

    readDraftMock.mockReturnValue({ draft: exerciseDraft, expiredSessionId: null })
    fetchRecentSessionsWithStatus.mockResolvedValue({
      sessionsByExercise: { [BENCH_ID]: [] },
      statusByExercise: { [BENCH_ID]: 'empty' },
    })

    const { rerender, onFinish } = renderWorkout({ workoutHistoryRefreshTick: 0 })
    await startFromDraft()

    await waitFor(() => {
      expect(fetchRecentSessionsWithStatus).toHaveBeenCalledTimes(1)
    })
    const adaptationCallsBefore = supabaseMock.from.mock.calls.filter(([table]) => table === 'user_training_plan_adaptations').length

    rerender(
      <UserProvider user={TEST_USER}>
        <div className="app">
          <Workout isVisible={true} onFinish={onFinish} workoutHistoryRefreshTick={1} />
        </div>
      </UserProvider>
    )

    await waitFor(() => {
      expect(fetchRecentSessionsWithStatus).toHaveBeenCalledTimes(2)
    })
    expect(supabaseMock.from.mock.calls.filter(([table]) => table === 'user_training_plan_adaptations').length)
      .toBeGreaterThan(adaptationCallsBefore)
  })

  it('anchors an auto-started battle workout timer to the battle room start after app restart', async () => {
    const roomStartedAt = new Date(Date.now() - 125_000).toISOString()

    renderWorkout({
      battleRoom: {
        id: 'battle-room-1',
        created_at: roomStartedAt,
        battle_mode: 'hybrid',
        opponentId: 'user-2',
        opponentProfile: { username: 'Rival' },
      },
    })

    await screen.findByText('Workout in progress')
    await waitFor(() => {
      expect(screen.getByText(/^02:/)).toBeTruthy()
    })
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────

  /**
   * CORE S6 PROPERTY: when the persistence RPC throws, the app must NOT
   * silently present the workout as completed. The error must be surfaced
   * and the active workout state must be preserved for retry.
   */
  it('shows an error and keeps the workout active when finishWorkoutSessionAtomic throws', async () => {
    finishAtomicMock.mockRejectedValue(new Error('DB unavailable'))

    const { onFinish } = renderWorkout()

    await startEmptyWorkout()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    // error message appears inside the open dialog (line 2502: {finishSaveError && ...})
    await screen.findByText('Could not save workout. Check your connection and try again.')

    // dialog is still open — confirmAction remains 'finish' because
    // setConfirmAction(null) at line 1992 is unreachable when finishWorkout throws
    expect(screen.getByText('Finish Workout?')).toBeTruthy()

    // workout is still active — activeWorkout was NOT set to false
    expect(screen.getByText('Workout in progress')).toBeTruthy()

    // onFinish was NOT called — the workout is NOT silently marked complete
    expect(onFinish).not.toHaveBeenCalled()

    // isFinishingRef was released in the finally block (line 2000)
    // and confirmBusy was reset (line 1999), so the confirm button is re-enabled.
    // Use .disabled directly — @testing-library/jest-dom is not loaded here.
    expect(screen.getByRole('button', { name: 'Finish' }).disabled).toBe(false)
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────

  it('releases isFinishingRef after failure so the user can retry successfully', async () => {
    // first call throws; second succeeds
    finishAtomicMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(undefined)

    const { onFinish } = renderWorkout()

    await startEmptyWorkout()
    await openFinishDialog()

    // first attempt → fails
    fireEvent.click(screen.getByText('Finish'))
    await screen.findByText('Could not save workout. Check your connection and try again.')

    // isFinishingRef must be false now (finally block ran — line 2000)
    // second attempt → must be allowed and must succeed
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => {
      expect(finishAtomicMock).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))

    // dialog closed after the successful second attempt
    expect(screen.queryByText('Finish Workout?')).toBeNull()
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────

  it('prevents a duplicate RPC call when the confirm button is clicked twice rapidly', async () => {
    // finishAtomicMock resolves immediately (default); the guard operates on
    // isFinishingRef.current, which is set synchronously at line 1977 BEFORE
    // any async work begins. Both fireEvent.click calls execute synchronously
    // before any microtask runs, so the second call hits the guard.

    const { onFinish } = renderWorkout()

    await startEmptyWorkout()
    await openFinishDialog()

    // Capture the button BEFORE the first click: after it, setConfirmBusy(true)
    // re-renders the button with a <LoadingSpinner> so getByText/getByRole('button',{name:'Finish'})
    // would fail. We keep the direct DOM node reference.
    const finishBtn = screen.getByRole('button', { name: 'Finish' })

    // First click: isFinishingRef.current = true (synchronous, line 1977).
    fireEvent.click(finishBtn)

    // Second click immediately: isFinishingRef.current is already true →
    // runConfirmedAction (line 1976) returns before touching finishAtomicMock.
    // fireEvent.click in happy-dom bypasses the `disabled` attribute, so the
    // handler IS entered — and exits at the ref guard.
    fireEvent.click(finishBtn)

    // Flush all pending async work (Promise.all inside finishWorkout, RPC, cleanup).
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))

    // Guard worked: despite two button clicks, only one RPC was issued.
    expect(finishAtomicMock).toHaveBeenCalledTimes(1)
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────

  /**
   * CORE PR/RANK PIPELINE ASSERTION (the gap ChatGPT identified):
   *
   * Proves that Workout.jsx correctly assembles the `sets`, `prs`, and
   * `rankStates` payloads from real workout-exercise state before passing them
   * to finishWorkoutSessionAtomic. workoutCompletion.test.js only tests the RPC
   * wrapper's serialization; this test proves the component-level wiring:
   *
   *   workout state (exercises + sets)
   *     → getFinishableSetMeta   → setsToInsert   (real liftMath/orm, not mocked)
   *     → calculateSetEstimatedOrm → estimated_1rm  (real, not mocked)
   *     → prevBests vs newOrmKg  → prUpserts       (PR gating logic)
   *     → getContinuousExerciseScore + updateRollingScore → rankStates
   *
   * Strategy: restore a pre-built workout draft so the component starts with
   * one exercise (Barbell Squat, id=42, one completed 5×100 kg set) without
   * having to drive the full exercise-picker / set-entry UI.
   */
  it('correctly assembles set, PR, and rank-state payloads from workout exercise data', async () => {
    const SQUAT_ID   = 42
    const SQUAT_NAME = 'Barbell Squat'

    // ── Draft: one completed strength set (5 reps @ 100 kg, Barbell Squat) ──
    const exerciseDraft = {
      sessionId:  'test-session-id',
      startedAt:  Date.now() - 120_000,
      savedAt:    Date.now() - 10_000,
      defaultUnit: 'kg',
      defaultRest: 90,
      exerciseNotes: {},
      notesOpen: {},
      workoutExercises: [{
        id:               SQUAT_ID,
        name:             SQUAT_NAME,
        category:         'Strength',
        unit:             'kg',
        equipment:        'Barbell',
        primary_muscles:  ['Quadriceps'],
        secondary_muscles: [],
        sets: [{
          reps:              5,
          weight:            100,
          done:              true,  // shouldInclude=true, incomplete=false → no "Incomplete" dialog
          completedAt:       new Date().toISOString(),
          setType:           'normal',
          restBeforeSeconds: 90,
        }],
      }],
    }

    // Inject draft BEFORE render. IMPORTANT: readStoredWorkoutDraft is called TWICE
    // per mount — once in useLayoutEffect (line 762) and again in useEffect (line 819).
    // mockReturnValueOnce only serves the first call; the second would return null and
    // overwrite the state. Use mockReturnValue (permanent override) so both calls see
    // the draft. beforeEach restores the null default for subsequent tests.
    readDraftMock.mockReturnValue({ draft: exerciseDraft, expiredSessionId: null })

    // Previous PR: 100 kg. The Epley 1RM for 5 reps × 100 kg ≈ 116.7 kg > 100 kg
    // → component must produce a PR upsert (newOrmKg > prevOrmKg).
    supabaseMock._responses.exercise_prs = {
      data:  [{ exercise_id: SQUAT_ID, best_1rm_kg: 100 }],
      error: null,
    }

    // Anchors for SQUAT_NAME → activates rank-state pipeline for this exercise.
    // getContinuousExerciseScore is a local closure using mocked getTierIdx(→0)
    // and getProgress(→0), so sessionScore = clampContinuousTierScore(0+0) = 0.
    // Use mockResolvedValue (not Once) so beforeEach's restore handles cleanup.
    getAnchorsMock.mockResolvedValue({
      male:   { [SQUAT_NAME]: [80, 100, 120, 140] },
      female: {},
    })

    // Existing rank state → component uses it to compute peakScore.
    // Use mockReturnValue (not Once) for the same reason.
    mapRankStatesMock.mockReturnValue(new Map([
      [SQUAT_ID, { current_score: 40, peak_score: 42, last_ranked_at: '2026-01-01T00:00:00Z' }],
    ]))

    const { onFinish } = renderWorkout()

    await startFromDraft()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => expect(finishAtomicMock).toHaveBeenCalledTimes(1))

    const [, payload] = finishAtomicMock.mock.calls[0]

    // ── Sets: component correctly reads exercise/set state ──────────────────
    expect(payload.sets).toHaveLength(1)
    const set = payload.sets[0]
    expect(set.exercise_id).toBe(SQUAT_ID)
    expect(set.reps).toBe(5)
    expect(set.weight).toBe(100)
    // estimated_1rm is computed by the REAL calculateSetEstimatedOrm (from lib/orm.js,
    // not mocked) — must be finite and strictly > the 100 kg prev PR.
    expect(Number.isFinite(set.estimated_1rm)).toBe(true)
    expect(set.estimated_1rm).toBeGreaterThan(100)

    // ── PRs: gating logic fires when newOrmKg > prevOrmKg ──────────────────
    // prUpserts only includes exercises where the new 1RM beats the stored PR.
    expect(payload.prs).toHaveLength(1)
    expect(payload.prs[0].exercise_id).toBe(SQUAT_ID)
    expect(payload.prs[0].best_1rm_kg).toBeGreaterThan(100)

    // ── Rank states: rank-state pipeline fires when anchors exist ───────────
    // activeRankStateUpserts skips exercises with no sessionBestOrmKg or no anchors;
    // for SQUAT_ID both are satisfied → exactly one rank-state entry.
    expect(payload.rankStates).toHaveLength(1)
    const rs = payload.rankStates[0]
    expect(rs.exerciseId).toBe(SQUAT_ID)
    expect(Number.isFinite(rs.currentScore)).toBe(true)
    // peakScore = Math.max(previousState.peak_score=42, nextScore=0) = 42
    expect(rs.peakScore).toBeGreaterThanOrEqual(rs.currentScore)
    expect(rs.lastRankedAt).toEqual(expect.any(String))
    expect(rs.updatedAt).toEqual(expect.any(String))

    // Workout completes normally after correct payload delivery
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  })

  it('finishes a resumed cardio draft with zero reps and duration seconds', async () => {
    const CARDIO_ID = 88
    const exerciseDraft = {
      sessionId: 'test-session-id',
      startedAt: Date.now() - 120_000,
      savedAt: Date.now() - 10_000,
      defaultUnit: 'kg',
      defaultRest: 90,
      exerciseNotes: {},
      notesOpen: {},
      workoutExercises: [{
        id: CARDIO_ID,
        name: 'Running',
        category: 'Cardio',
        unit: 'kg',
        equipment: 'Bodyweight',
        primary_muscles: ['Cardio'],
        secondary_muscles: [],
        sets: [{
          duration: 900,
          done: true,
          completedAt: new Date().toISOString(),
        }],
      }],
    }

    readDraftMock.mockReturnValue({ draft: exerciseDraft, expiredSessionId: null })

    const { onFinish } = renderWorkout()

    await startFromDraft()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => expect(finishAtomicMock).toHaveBeenCalledTimes(1))
    const [, payload] = finishAtomicMock.mock.calls[0]

    expect(payload.sets).toHaveLength(1)
    expect(payload.sets[0]).toEqual(expect.objectContaining({
      exercise_id: CARDIO_ID,
      reps: 0,
      weight: 0,
      duration_seconds: 900,
    }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/Could not save workout/i)).toBeNull()
  })

  it('clears a resumed solo draft when its server session was already finished', async () => {
    const exerciseDraft = {
      sessionId: 'test-session-id',
      startedAt: Date.now() - 120_000,
      savedAt: Date.now() - 10_000,
      defaultUnit: 'kg',
      defaultRest: 90,
      exerciseNotes: {},
      notesOpen: {},
      workoutExercises: [{
        id: 42,
        name: 'Barbell Squat',
        category: 'Strength',
        unit: 'kg',
        equipment: 'Barbell',
        primary_muscles: ['Quadriceps'],
        secondary_muscles: [],
        sets: [{ reps: 5, weight: 100, done: true, setType: 'normal' }],
      }],
    }

    readDraftMock.mockReturnValue({ draft: exerciseDraft, expiredSessionId: null })
    supabaseMock._responses.workout_sessions = {
      data: { id: 'test-session-id', finished_at: '2026-06-01T12:00:00.000Z' },
      error: null,
    }

    const { onFinish } = renderWorkout()

    await screen.findByText('Resume')
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))

    await screen.findByText('That workout was already saved. Your local resume copy was cleared.')
    expect(clearStoredWorkoutDraftMock).toHaveBeenCalledWith(TEST_USER.id)
    expect(screen.queryByText('Finish Workout')).toBeNull()
    expect(finishAtomicMock).not.toHaveBeenCalled()
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('unlocks exact-name OHP achievements when finishing a qualifying press workout', async () => {
    const PRESS_ID = 77

    readDraftMock.mockReturnValue({
      draft: {
        sessionId: 'test-session-id',
        startedAt: Date.now() - 120_000,
        savedAt: Date.now() - 10_000,
        defaultUnit: 'kg',
        defaultRest: 90,
        exerciseNotes: {},
        notesOpen: {},
        workoutExercises: [{
          id: PRESS_ID,
          name: 'Military Press',
          category: 'Strength',
          unit: 'kg',
          equipment: 'Barbell',
          primary_muscles: ['Shoulders'],
          secondary_muscles: [],
          sets: [{
            reps: 1,
            weight: 60,
            done: true,
            completedAt: new Date().toISOString(),
            setType: 'normal',
            restBeforeSeconds: 90,
          }],
        }],
      },
      expiredSessionId: null,
    })

    const { onFinish } = renderWorkout()

    await startFromDraft()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    const [summary] = onFinish.mock.calls[0]
    expect(summary.newAchievements.map(a => a.id)).toContain('ohp_1p')
  })

  it('skips rank-ups and rank-state updates when profile bodyweight is missing', async () => {
    const SQUAT_ID = 42
    const SQUAT_NAME = 'Barbell Squat'

    supabaseMock._responses.profiles = {
      data: { default_rest_seconds: 90, unit_preference: 'kg', bodyweight: null, gender: 'male' },
      error: null,
    }
    fetchProfileWithWorkoutCountMock.mockResolvedValue({
      data: { gender: 'male', bodyweight: null, unit_preference: 'kg', lifetime_volume_kg: 0 },
      error: null,
    })

    readDraftMock.mockReturnValue({
      draft: {
        sessionId: 'test-session-id',
        startedAt: Date.now() - 120_000,
        savedAt: Date.now() - 10_000,
        defaultUnit: 'kg',
        defaultRest: 90,
        exerciseNotes: {},
        notesOpen: {},
        workoutExercises: [{
          id: SQUAT_ID,
          name: SQUAT_NAME,
          category: 'Strength',
          unit: 'kg',
          equipment: 'Barbell',
          primary_muscles: ['Quadriceps'],
          secondary_muscles: [],
          sets: [{
            reps: 5,
            weight: 100,
            done: true,
            completedAt: new Date().toISOString(),
            setType: 'normal',
            restBeforeSeconds: 90,
          }],
        }],
      },
      expiredSessionId: null,
    })
    supabaseMock._responses.exercise_prs = {
      data: [{ exercise_id: SQUAT_ID, best_1rm_kg: 100 }],
      error: null,
    }
    getAnchorsMock.mockResolvedValue({
      male: { [SQUAT_NAME]: [80, 100, 120, 140] },
      female: {},
    })
    mapRankStatesMock.mockReturnValue(new Map([
      [SQUAT_ID, { current_score: 40, peak_score: 42, last_ranked_at: '2026-01-01T00:00:00Z' }],
    ]))

    const { onFinish } = renderWorkout()

    await startFromDraft()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => expect(finishAtomicMock).toHaveBeenCalledTimes(1))

    const [, payload] = finishAtomicMock.mock.calls[0]
    expect(payload.sets).toHaveLength(1)
    expect(payload.prs).toHaveLength(1)
    expect(payload.rankStates).toEqual([])

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    const [summary] = onFinish.mock.calls[0]
    expect(summary.rankUps).toEqual([])
  })

  it('celebrates a rank-up when bodyweight loss pushes tier higher even without a new 1RM PR', async () => {
    const SQUAT_ID = 42
    const SQUAT_NAME = 'Barbell Squat'

    fetchProfileWithWorkoutCountMock.mockResolvedValue({
      data: { gender: 'male', bodyweight: 70, unit_preference: 'kg', lifetime_volume_kg: 0 },
      error: null,
    })

    readDraftMock.mockReturnValue({
      draft: {
        sessionId: 'test-session-id',
        startedAt: Date.now() - 120_000,
        savedAt: Date.now() - 10_000,
        defaultUnit: 'kg',
        defaultRest: 90,
        exerciseNotes: {},
        notesOpen: {},
        workoutExercises: [{
          id: SQUAT_ID,
          name: SQUAT_NAME,
          category: 'Strength',
          unit: 'kg',
          equipment: 'Barbell',
          primary_muscles: ['Quadriceps'],
          secondary_muscles: [],
          sets: [{
            reps: 1,
            weight: 100,
            done: true,
            completedAt: new Date().toISOString(),
            setType: 'normal',
            restBeforeSeconds: 90,
          }],
        }],
      },
      expiredSessionId: null,
    })

    supabaseMock._responses.exercise_prs = {
      data: [{ exercise_id: SQUAT_ID, best_1rm_kg: 100 }],
      error: null,
    }
    getAnchorsMock.mockResolvedValue({
      male: { [SQUAT_NAME]: [80, 100, 120, 140] },
      female: {},
    })
    // peak_score=0 → oldPeakIdx = 0 ('Beginner'); the BW-loss-driven new tier
    // (mocked below) crosses above 0, so a celebration must fire.
    mapRankStatesMock.mockReturnValue(new Map([
      [SQUAT_ID, { current_score: 0, peak_score: 0, last_ranked_at: '2026-01-01T00:00:00Z' }],
    ]))
    // Force the new ratio to map to tier 2 ('Advanced')
    vi.mocked(getTierIdx).mockReturnValue(2)

    const { onFinish } = renderWorkout()

    await startFromDraft()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => expect(finishAtomicMock).toHaveBeenCalledTimes(1))
    const [, payload] = finishAtomicMock.mock.calls[0]

    expect(payload.rankStates).toHaveLength(1)
    // peakScore must capture the BW-driven achievement (>= 2) so the same
    // celebration cannot re-fire on subsequent workouts.
    expect(payload.rankStates[0].peakScore).toBeGreaterThanOrEqual(2)

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    const [summary] = onFinish.mock.calls[0]
    expect(summary.rankUps).toHaveLength(1)
    expect(summary.rankUps[0]).toMatchObject({
      exercise: SQUAT_NAME,
      from: 'Beginner',
      to: 'Advanced',
    })
  })

  it('does not re-celebrate when the new tier equals the peak tier already reached', async () => {
    const SQUAT_ID = 42
    const SQUAT_NAME = 'Barbell Squat'

    fetchProfileWithWorkoutCountMock.mockResolvedValue({
      data: { gender: 'male', bodyweight: 70, unit_preference: 'kg', lifetime_volume_kg: 0 },
      error: null,
    })

    readDraftMock.mockReturnValue({
      draft: {
        sessionId: 'test-session-id',
        startedAt: Date.now() - 120_000,
        savedAt: Date.now() - 10_000,
        defaultUnit: 'kg',
        defaultRest: 90,
        exerciseNotes: {},
        notesOpen: {},
        workoutExercises: [{
          id: SQUAT_ID,
          name: SQUAT_NAME,
          category: 'Strength',
          unit: 'kg',
          equipment: 'Barbell',
          primary_muscles: ['Quadriceps'],
          secondary_muscles: [],
          sets: [{
            reps: 1,
            weight: 100,
            done: true,
            completedAt: new Date().toISOString(),
            setType: 'normal',
            restBeforeSeconds: 90,
          }],
        }],
      },
      expiredSessionId: null,
    })

    supabaseMock._responses.exercise_prs = {
      data: [{ exercise_id: SQUAT_ID, best_1rm_kg: 100 }],
      error: null,
    }
    getAnchorsMock.mockResolvedValue({
      male: { [SQUAT_NAME]: [80, 100, 120, 140] },
      female: {},
    })
    // peak_score=2 → oldPeakIdx=2. With newIdx=2 (mocked), no rank-up should fire.
    mapRankStatesMock.mockReturnValue(new Map([
      [SQUAT_ID, { current_score: 2, peak_score: 2, last_ranked_at: '2026-01-01T00:00:00Z' }],
    ]))
    vi.mocked(getTierIdx).mockReturnValue(2)

    const { onFinish } = renderWorkout()

    await startFromDraft()
    await openFinishDialog()
    fireEvent.click(screen.getByText('Finish'))

    await waitFor(() => expect(finishAtomicMock).toHaveBeenCalledTimes(1))

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    const [summary] = onFinish.mock.calls[0]
    expect(summary.rankUps).toEqual([])
  })
})
