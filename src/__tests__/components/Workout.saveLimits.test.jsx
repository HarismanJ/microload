const supabaseMock = vi.hoisted(() => {
  const _responses = {}
  const _inserts = []
  const _updates = []
  const _deletes = []

  function makeChain(tableName) {
    const chain = {
      _operation: 'select',
      _payload: null,
      _select: '',
      select: vi.fn(columns => {
        chain._operation = 'select'
        chain._select = columns || ''
        return chain
      }),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      is: vi.fn(() => chain),
      not: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      insert: vi.fn(payload => {
        chain._operation = 'insert'
        chain._payload = payload
        _inserts.push({ table: tableName, payload })
        return chain
      }),
      update: vi.fn(payload => {
        chain._operation = 'update'
        chain._payload = payload
        _updates.push({ table: tableName, payload })
        return chain
      }),
      delete: vi.fn(() => {
        chain._operation = 'delete'
        _deletes.push({ table: tableName })
        return chain
      }),
      upsert: vi.fn(() => { chain._operation = 'upsert'; return chain }),
      single: vi.fn(() => {
        if (tableName === 'user_training_plans' && chain._select === 'preferences') {
          const firstPlan = (_responses.user_training_plans?.data || [])[0]
          return Promise.resolve({ data: { preferences: firstPlan?.preferences || {} }, error: null })
        }
        return Promise.resolve(_responses[tableName] ?? { data: null, error: null })
      }),
      maybeSingle: vi.fn(() => Promise.resolve(_responses[tableName] ?? { data: null, error: null })),
      then: (res, rej) => {
        const operationResponse = _responses[`${tableName}:${chain._operation}`]
        return Promise.resolve(operationResponse ?? _responses[tableName] ?? { data: [], error: null }).then(res, rej)
      },
    }
    return chain
  }

  return {
    _responses,
    _inserts,
    _updates,
    _deletes,
    from: vi.fn(table => makeChain(table)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
})

const fetchExercisesMock = vi.hoisted(() => vi.fn())
const generateTrainingPlanMock = vi.hoisted(() => vi.fn())
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
vi.mock('../../lib/trainingPlanGenerator.js', async importOriginal => {
  const real = await importOriginal()
  return {
    ...real,
    generateTrainingPlan: generateTrainingPlanMock,
  }
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Workout from '../../components/Workout.jsx'
import { UserProvider } from '../../context/UserContext.jsx'

const TEST_USER = { id: 'user-1' }

const EXERCISES = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'Strength',
    equipment: 'Barbell',
    primary_muscles: ['Chest'],
    secondary_muscles: ['Triceps'],
  },
]

function makePlan(index = 1) {
  return {
    id: `plan-${index}`,
    name: `Plan ${index}`,
    goal: 'hypertrophy',
    experience: 'intermediate',
    days_per_week: 2,
    session_minutes: 60,
    duration_weeks: 8,
    equipment: ['Bodyweight', 'Barbell'],
    preferences: {
      schedule: { mode: 'flexible', selectedSplit: ['upper', 'lower'] },
      periodization: { style: 'double_progression', deloadPolicy: 'adaptive', blockGoal: 'accumulation' },
      adaptiveCoach: { enabled: true },
    },
    days: [{
      id: 'day-1',
      name: 'Day 1',
      focus: 'Upper',
      focusKey: 'upper',
      exercises: [{
        exerciseId: 'bench-press',
        name: 'Bench Press',
        category: 'Strength',
        equipment: 'Barbell',
        sets: 3,
        reps: 10,
        repRange: '8-12',
      }],
    }],
    created_at: `2026-06-01T00:00:0${index}.000Z`,
  }
}

function makeRoutine(index = 1) {
  return {
    id: `routine-${index}`,
    name: `Routine ${index}`,
    description: '',
    exercises: [{ name: 'Bench Press', sets: 3 }],
    created_at: `2026-06-01T00:00:0${index}.000Z`,
  }
}

function generatedPlan() {
  return {
    ...makePlan(99),
    id: undefined,
    name: 'Generated Plan',
  }
}

function setup({ plans = [], routines = [] } = {}) {
  fetchExercisesMock.mockResolvedValue(EXERCISES)
  generateTrainingPlanMock.mockReturnValue(generatedPlan())
  supabaseMock._responses.profiles = {
    data: { default_rest_seconds: 90, unit_preference: 'kg', bodyweight: 70, gender: 'male' },
    error: null,
  }
  supabaseMock._responses.user_training_plans = { data: plans, error: null }
  supabaseMock._responses.user_routines = { data: routines, error: null }
  supabaseMock._responses.user_exercise_preferences = { data: [], error: null }
  supabaseMock._responses.user_training_plan_adaptations = { data: [], error: null }

  return render(
    <UserProvider user={TEST_USER}>
      <div className="app">
        <Workout isVisible={true} />
      </div>
    </UserProvider>,
  )
}

async function advancePlanBuilderToPreview() {
  await screen.findByRole('button', { name: 'Custom Plan' })
  fireEvent.click(screen.getByRole('button', { name: 'Custom Plan' }))
  await screen.findByRole('heading', { name: 'Custom Plan' })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByRole('heading', { name: 'Access & Focus' })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByRole('heading', { name: 'Schedule & Progression' })
  fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
  await screen.findByRole('heading', { name: 'Generated Plan' })
}

async function addBenchToRoutine() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Exercise' }))
  await screen.findByText('Bench Press')
  fireEvent.click(screen.getByText('Bench Press'))
  fireEvent.click(screen.getByRole('button', { name: 'Add (1)' }))
  await screen.findByText('3 sets')
}

describe('Workout saved plan and routine limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock._inserts.length = 0
    supabaseMock._updates.length = 0
    supabaseMock._deletes.length = 0
    Object.keys(supabaseMock._responses).forEach(key => delete supabaseMock._responses[key])
    localStorage.removeItem('hiddenTemplates')
    isPremiumSyncMock.mockReturnValue(true)
  })

  it('blocks creating a sixth saved training plan before insert', async () => {
    setup({ plans: Array.from({ length: 5 }, (_, index) => makePlan(index + 1)) })

    await advancePlanBuilderToPreview()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('You can save up to 5 training plans. Delete an old plan to save this one.')).toBeTruthy()
    expect(supabaseMock._inserts.filter(item => item.table === 'user_training_plans')).toHaveLength(0)
  })

  it('allows editing a saved training plan while already at the cap', async () => {
    setup({ plans: Array.from({ length: 5 }, (_, index) => makePlan(index + 1)) })

    const detailButtons = await screen.findAllByRole('button', { name: 'View Details' })
    fireEvent.click(detailButtons[0])
    await screen.findByText('Plan Details')
    fireEvent.click(screen.getByText('Edit'))
    await screen.findByRole('heading', { name: 'Plan 1' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(supabaseMock._updates.filter(item => item.table === 'user_training_plans')).toHaveLength(1)
    })
    expect(supabaseMock._inserts.filter(item => item.table === 'user_training_plans')).toHaveLength(0)
  })

  it('shows friendly copy for backend training plan limit errors', async () => {
    setup({ plans: Array.from({ length: 4 }, (_, index) => makePlan(index + 1)) })
    supabaseMock._responses['user_training_plans:insert'] = {
      data: null,
      error: { message: 'Saved training plan limit reached' },
    }

    await advancePlanBuilderToPreview()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('You can save up to 5 training plans. Delete an old plan to save this one.')).toBeTruthy()
    expect(supabaseMock._inserts.filter(item => item.table === 'user_training_plans')).toHaveLength(1)
  })

  it('blocks creating a sixteenth routine before insert', async () => {
    setup({ routines: Array.from({ length: 15 }, (_, index) => makeRoutine(index + 1)) })

    await screen.findByRole('button', { name: 'Create Routine' })
    fireEvent.click(screen.getByRole('button', { name: 'Create Routine' }))
    await screen.findByRole('heading', { name: 'Create Routine' })
    fireEvent.change(screen.getByPlaceholderText('Routine name...'), { target: { value: 'New Routine' } })
    await addBenchToRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('You can save up to 15 routines. Delete an old routine to save this one.')).toBeTruthy()
    expect(supabaseMock._inserts.filter(item => item.table === 'user_routines')).toHaveLength(0)
  })

  it('allows editing a routine while already at the cap', async () => {
    setup({ routines: Array.from({ length: 15 }, (_, index) => makeRoutine(index + 1)) })

    await screen.findByText('Routine 1')
    const routineCard = screen.getByText('Routine 1').closest('.template-card')
    const editButton = routineCard.querySelector('.template-icon-btn:not(.template-icon-btn-danger)')
    fireEvent.click(editButton)
    await screen.findByRole('heading', { name: 'Edit Routine' })
    fireEvent.change(screen.getByPlaceholderText('Routine name...'), { target: { value: 'Updated Routine' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(supabaseMock._updates.filter(item => item.table === 'user_routines')).toHaveLength(1)
    })
    expect(supabaseMock._inserts.filter(item => item.table === 'user_routines')).toHaveLength(0)
  })

  it('shows friendly copy for backend routine limit errors', async () => {
    setup({ routines: Array.from({ length: 14 }, (_, index) => makeRoutine(index + 1)) })
    supabaseMock._responses['user_routines:insert'] = {
      data: null,
      error: { message: 'Saved routine limit reached' },
    }

    await screen.findByRole('button', { name: 'Create Routine' })
    fireEvent.click(screen.getByRole('button', { name: 'Create Routine' }))
    await screen.findByRole('heading', { name: 'Create Routine' })
    fireEvent.change(screen.getByPlaceholderText('Routine name...'), { target: { value: 'New Routine' } })
    await addBenchToRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('You can save up to 15 routines. Delete an old routine to save this one.')).toBeTruthy()
    expect(supabaseMock._inserts.filter(item => item.table === 'user_routines')).toHaveLength(1)
  })

  it('confirms before deleting a saved training plan', async () => {
    setup({ plans: [makePlan(1)] })

    const deleteButton = await screen.findByRole('button', { name: 'Delete Plan 1' })
    fireEvent.click(deleteButton)

    expect(await screen.findByRole('dialog', { name: 'Delete Plan?' })).toBeTruthy()
    expect(screen.getByText(/This will permanently delete "Plan 1"/)).toBeTruthy()
    expect(supabaseMock._deletes.filter(item => item.table === 'user_training_plans')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Plan?' })).toBeNull()
    })
    expect(supabaseMock._deletes.filter(item => item.table === 'user_training_plans')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Plan 1' }))
    await screen.findByRole('dialog', { name: 'Delete Plan?' })
    fireEvent.click(screen.getByRole('button', { name: 'Delete Plan' }))

    await waitFor(() => {
      expect(supabaseMock._deletes.filter(item => item.table === 'user_training_plans')).toHaveLength(1)
    })
  })

  it('confirms before deleting a saved routine', async () => {
    setup({ routines: [makeRoutine(1)] })

    const deleteButton = await screen.findByRole('button', { name: 'Delete Routine 1' })
    fireEvent.click(deleteButton)

    expect(await screen.findByRole('dialog', { name: 'Delete Routine?' })).toBeTruthy()
    expect(screen.getByText(/This will permanently delete "Routine 1"/)).toBeTruthy()
    expect(supabaseMock._deletes.filter(item => item.table === 'user_routines')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Routine' }))

    await waitFor(() => {
      expect(supabaseMock._deletes.filter(item => item.table === 'user_routines')).toHaveLength(1)
    })
  })

  it('confirms before hiding a provided routine', async () => {
    setup()

    const hideButton = await screen.findByRole('button', { name: 'Hide Push' })
    fireEvent.click(hideButton)

    expect(await screen.findByRole('dialog', { name: 'Hide Routine?' })).toBeTruthy()
    expect(screen.getByText(/This will hide "Push" from Suggested Routines/)).toBeTruthy()
    expect(localStorage.getItem('hiddenTemplates')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Hide Routine?' })).toBeNull()
    })
    expect(localStorage.getItem('hiddenTemplates')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Hide Push' }))
    await screen.findByRole('dialog', { name: 'Hide Routine?' })
    fireEvent.click(screen.getByRole('button', { name: 'Hide Routine' }))

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('hiddenTemplates') || '[]')).toContain('push')
    })
  })
})
