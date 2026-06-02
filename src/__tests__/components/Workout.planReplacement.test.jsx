const supabaseMock = vi.hoisted(() => {
  const _responses = {}
  const _updates = []
  const _updateResponses = {}

  function makeChain(tableName) {
    const chain = {
      _operation: 'select',
      select: vi.fn(() => { chain._operation = 'select'; return chain }),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      is: vi.fn(() => chain),
      not: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      insert: vi.fn(payload => { chain._operation = 'insert'; chain._payload = payload; return chain }),
      update: vi.fn(payload => {
        chain._operation = 'update'
        chain._payload = payload
        _updates.push({ table: tableName, payload })
        return chain
      }),
      delete: vi.fn(() => { chain._operation = 'delete'; return chain }),
      upsert: vi.fn(() => { chain._operation = 'upsert'; return chain }),
      single: vi.fn(() => Promise.resolve(_responses[tableName] ?? { data: null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve(_responses[tableName] ?? { data: null, error: null })),
      then: (res, rej) => {
        const response = chain._operation === 'update'
          ? (_updateResponses[tableName] ?? { data: null, error: null })
          : (_responses[tableName] ?? { data: [], error: null })
        return Promise.resolve(response).then(res, rej)
      },
    }
    return chain
  }

  return {
    _responses,
    _updates,
    _updateResponses,
    from: vi.fn(table => makeChain(table)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
})

const fetchExercisesMock = vi.hoisted(() => vi.fn())
const isPremiumSyncMock = vi.hoisted(() => vi.fn(() => true))

vi.mock('../../lib/supabase.js', () => ({ supabase: supabaseMock }))
vi.mock('../../data/exercises.js', () => ({ fetchExercises: fetchExercisesMock, createCustomExercise: vi.fn() }))
vi.mock('../../data/rankStates.js', () => ({
  fetchExerciseRankStates: vi.fn().mockResolvedValue({ rows: [], missingTable: false }),
  mapExerciseRankStates: vi.fn(() => new Map()),
}))
vi.mock('../../lib/purchases.js', () => ({
  isPremiumSync: isPremiumSyncMock,
  refreshPremiumStatus: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../lib/cache.js', () => ({
  invalidateCache: vi.fn(),
  getCached: vi.fn(() => null),
  setCached: vi.fn(),
}))
vi.mock('../../lib/admob.js', () => ({ showWorkoutCompleteAd: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../lib/restNotification.js', () => ({ scheduleRestEndNotification: vi.fn(), cancelRestNotification: vi.fn() }))
vi.mock('../../lib/workoutDraft.js', () => ({
  WORKOUT_DRAFT_VERSION: 1,
  readStoredWorkoutDraft: vi.fn(() => ({ draft: null, expiredSessionId: null })),
  writeStoredWorkoutDraft: vi.fn(),
  clearStoredWorkoutDraft: vi.fn(),
}))
vi.mock('../../lib/battles.js', () => ({
  getBattleModeLabel: vi.fn(() => 'Hybrid'),
  loadBattleRecap: vi.fn().mockResolvedValue(null),
  loadOpponentEvents: vi.fn().mockResolvedValue([]),
  publishWorkoutRoomEvent: vi.fn().mockResolvedValue(undefined),
  recordBattleResultAtomic: vi.fn().mockResolvedValue({ finalized: false }),
}))
vi.mock('../../lib/battleProjection.js', () => ({ buildRemoteWorkouts: vi.fn(() => []) }))
vi.mock('../../lib/progressiveOverload.js', () => ({
  fetchRecentSessionsWithStatus: vi.fn().mockResolvedValue({ sessionsByExercise: {}, statusByExercise: {} }),
  buildCurrentSetSuggestion: vi.fn(() => null),
  resolveCompletedSetProgressionEvent: vi.fn(() => null),
  buildExerciseSnapWeight: vi.fn(() => null),
}))
vi.mock('../../lib/incrementSettings.js', () => ({
  getCustomIncrements: vi.fn(() => ({})),
  setCustomIncrementKg: vi.fn(),
  getCustomStartingWeights: vi.fn(() => ({})),
  setCustomStartingWeightKg: vi.fn(),
}))
vi.mock('../../lib/backStack.js', () => ({ push: vi.fn(() => 1), remove: vi.fn() }))
vi.mock('../../components/exercise/ExerciseDetail.jsx', () => ({ default: () => null }))

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import Workout from '../../components/Workout.jsx'
import { UserProvider } from '../../context/UserContext.jsx'
import { normalizeTrainingPlan } from '../../lib/trainingPlanGenerator.js'

const TEST_USER = { id: 'user-1' }

function makeExercise(name, category, equipment, primary_muscles = [], secondary_muscles = []) {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    category,
    equipment,
    primary_muscles,
    secondary_muscles,
  }
}

const EXERCISES = [
  makeExercise('Bench Press', 'Strength', 'Barbell', ['Chest'], ['Triceps']),
  makeExercise('Dumbbell Bench Press', 'Strength', 'Dumbbell', ['Chest'], ['Triceps']),
  makeExercise('Incline Bench Press', 'Strength', 'Barbell', ['Upper Chest'], ['Triceps']),
  makeExercise('Bent Over Row', 'Strength', 'Barbell', ['Upper Back', 'Lats'], ['Biceps']),
  makeExercise('Running', 'Cardio', 'Bodyweight'),
]

function makePlan() {
  return normalizeTrainingPlan({
    id: 'plan-1',
    name: 'Upper Plan',
    goal: 'hypertrophy',
    experience: 'intermediate',
    days_per_week: 2,
    session_minutes: 60,
    duration_weeks: 8,
    equipment: ['Bodyweight', 'Dumbbell', 'Barbell'],
    preferences: {
      focusAreas: [],
      avoid: [],
      schedule: { mode: 'flexible', selectedSplit: ['upper', 'lower'] },
      periodization: { style: 'double_progression', deloadPolicy: 'adaptive', blockGoal: 'accumulation' },
      adaptiveCoach: { enabled: true },
    },
    days: [{
      id: 'day-1',
      name: 'Day 1: Upper',
      focus: 'Upper',
      focusKey: 'upper',
      week: 1,
      estimatedMinutes: 45,
      exercises: [{
        exerciseId: 'bench-press',
        name: 'Bench Press',
        category: 'Strength',
        equipment: 'Barbell',
        role: 'main',
        movementPattern: 'horizontal_push',
        sets: 4,
        reps: 10,
        repRange: '8-12',
        restSeconds: 90,
        progression: { style: 'double_progression', target: 'Reach the top of the rep range.' },
      }, {
        exerciseId: 'bent-over-row',
        name: 'Bent Over Row',
        category: 'Strength',
        equipment: 'Barbell',
        role: 'secondary',
        movementPattern: 'horizontal_pull',
        sets: 4,
        reps: 10,
        repRange: '8-12',
        restSeconds: 90,
      }],
    }],
  })
}

function renderWorkout(plan = makePlan(), exerciseLibrary = EXERCISES) {
  fetchExercisesMock.mockResolvedValue(exerciseLibrary)
  supabaseMock._responses.profiles = {
    data: { default_rest_seconds: 90, unit_preference: 'kg', bodyweight: 70, gender: 'male' },
    error: null,
  }
  supabaseMock._responses.user_training_plans = { data: [plan], error: null }
  supabaseMock._responses.user_routines = { data: [], error: null }
  supabaseMock._responses.user_exercise_preferences = { data: [], error: null }
  supabaseMock._responses.user_training_plan_adaptations = { data: [], error: null }
  return render(
    <UserProvider user={TEST_USER}>
      <div className="app">
        <Workout isVisible={true} />
      </div>
    </UserProvider>
  )
}

async function openReplacement() {
  await screen.findByText('View Details')
  fireEvent.click(screen.getByText('View Details'))
  await screen.findByText('Day 1: Upper')
  fireEvent.click(screen.getByLabelText('Replace exercise Bench Press'))
  await screen.findByText('Replace Bench Press')
}

describe('Workout plan exercise replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock._updates.length = 0
    Object.keys(supabaseMock._responses).forEach(key => delete supabaseMock._responses[key])
    Object.keys(supabaseMock._updateResponses).forEach(key => delete supabaseMock._updateResponses[key])
    supabaseMock._updateResponses.user_training_plans = { data: null, error: null }
    isPremiumSyncMock.mockReturnValue(true)
  })

  it('opens suggested replacements first and saves a selected suggestion', async () => {
    renderWorkout()
    await openReplacement()

    const suggestedSection = screen.getByText('Suggested Replacements').closest('section')
    expect(within(suggestedSection).getByText('Dumbbell Bench Press')).toBeTruthy()

    fireEvent.click(screen.getAllByText('Dumbbell Bench Press')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    await screen.findByText('Substituted for Bench Press')
    expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy()
    expect(supabaseMock._updates.at(-1)).toMatchObject({ table: 'user_training_plans' })
    expect(JSON.stringify(supabaseMock._updates.at(-1).payload.days)).toContain('Dumbbell Bench Press')
  })

  it('warns for a random manual replacement, supports choose another, then saves replace anyway', async () => {
    renderWorkout()
    await openReplacement()

    fireEvent.change(screen.getByPlaceholderText('Search all exercises...'), { target: { value: 'Running' } })
    await screen.findByText('Running')
    fireEvent.click(screen.getAllByText('Running').at(-1))
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    await screen.findByText('This changes the plan target')
    fireEvent.click(screen.getByText('Choose Another'))
    expect(screen.queryByText('Replace Anyway')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))
    await screen.findByText('This changes the plan target')
    fireEvent.click(screen.getByText('Replace Anyway'))

    await screen.findByText('Substituted for Bench Press')
    expect(screen.getByText('Running')).toBeTruthy()
    expect(JSON.stringify(supabaseMock._updates.at(-1).payload.days)).toContain('"replacementMode":"override"')
  })

  it('keeps the original exercise visible when replacement save fails', async () => {
    supabaseMock._updateResponses.user_training_plans = { data: null, error: { message: 'network down' } }
    renderWorkout()
    await openReplacement()

    fireEvent.click(screen.getAllByText('Dumbbell Bench Press')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    await screen.findByText('network down')
    expect(screen.getByText('Replace Bench Press')).toBeTruthy()
  })

  it('renders long replacement names without hiding actions', async () => {
    const longExercise = makeExercise('Single Arm Incline Dumbbell Bench Press With Long Controlled Pause', 'Strength', 'Dumbbell', ['Chest'], ['Triceps'])
    renderWorkout(makePlan(), [...EXERCISES, longExercise])
    await openReplacement()

    fireEvent.change(screen.getByPlaceholderText('Search all exercises...'), { target: { value: 'single arm incline' } })
    await waitFor(() => {
      expect(screen.getAllByText(longExercise.name).length).toBeGreaterThan(0)
    })
    expect(screen.getByRole('button', { name: 'Replace' })).toBeTruthy()
  })

  it('replaces an exercise from the generated plan preview before saving', async () => {
    renderWorkout()
    await screen.findByText('View Details')
    fireEvent.click(screen.getByText('View Details'))
    await screen.findByText('Day 1: Upper')
    fireEvent.click(screen.getByText('Edit'))

    await screen.findByText('Regenerate Inputs')
    fireEvent.click(screen.getByLabelText('Replace exercise Bench Press'))
    await screen.findByText('Replace Bench Press')
    fireEvent.click(screen.getAllByText('Dumbbell Bench Press')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    await screen.findByText('Substituted for Bench Press')
    expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy()
    expect(supabaseMock._updates).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(supabaseMock._updates).toHaveLength(1)
    })
    expect(JSON.stringify(supabaseMock._updates[0].payload.days)).toContain('Dumbbell Bench Press')
  })
})
