import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { UserProvider } from '../../../context/UserContext.jsx'
import WorkoutDayDetail from '../../../components/profile/WorkoutDayDetail.jsx'
import { recalculateStreakAfterDeletion } from '../../../lib/streakUtils'
import { supabase } from '../../../lib/supabase'

const supabaseMock = vi.hoisted(() => {
  const state = {
    queues: new Map(),
    operations: [],
  }

  function nextResponse(table) {
    const queue = state.queues.get(table)
    if (queue?.length) return Promise.resolve(queue.shift())
    return Promise.resolve({ data: null, error: null })
  }

  function createQuery(table) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      not: vi.fn(() => query),
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(() => nextResponse(table)),
      single: vi.fn(() => nextResponse(table)),
      update: vi.fn(payload => {
        state.operations.push({ table, type: 'update', payload })
        return query
      }),
      delete: vi.fn(() => {
        state.operations.push({ table, type: 'delete' })
        return query
      }),
      upsert: vi.fn(payload => {
        state.operations.push({ table, type: 'upsert', payload })
        return Promise.resolve({ data: null, error: null })
      }),
      then: (onFulfilled, onRejected) => nextResponse(table).then(onFulfilled, onRejected),
      catch: onRejected => nextResponse(table).catch(onRejected),
    }
    return query
  }

  return {
    state,
    from: vi.fn(table => createQuery(table)),
  }
})

const recalculateExerciseRankStatesFromHistoryMock = vi.hoisted(() => vi.fn(() => Promise.resolve({ updated: [], deleted: [], missingTable: false })))

vi.mock('../../../lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('../../../lib/workoutHistory', async () => {
  const actual = await vi.importActual('../../../lib/workoutHistory')
  return {
    ...actual,
    recalculateExerciseRankStatesFromHistory: recalculateExerciseRankStatesFromHistoryMock,
  }
})

vi.mock('../../../lib/cache', () => ({
  invalidateCache: vi.fn(),
}))

vi.mock('../../../lib/streakUtils', () => ({
  recalculateStreakAfterDeletion: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../lib/muscleWorkload', () => ({
  getLocalTrainingWeekRange: () => ({ startIso: '2026-05-25T00:00:00.000Z' }),
}))

vi.mock('../../../lib/liftMath', async () => {
  const actual = await vi.importActual('../../../lib/liftMath')
  return {
    ...actual,
    DEFAULT_BODYWEIGHT_KG: 75,
    MAX_REPS: 9999,
    convertWeight: vi.fn(value => value),
    fmtCompact: vi.fn(value => String(value)),
    getProfileBodyweightKg: vi.fn(profile => profile?.bodyweight ?? 75),
    getSetTrainingVolumeKg: vi.fn(({ weight = 0, reps = 0 }) => Number(weight) * Number(reps)),
    getSetTrainingVolumeInUnit: vi.fn(({ weight = 0, reps = 0 }) => Number(weight) * Number(reps)),
    getWeightInputMax: vi.fn(() => 1000),
    getWeightInputMin: vi.fn(() => 0),
    isRepsWithinInputRange: vi.fn(reps => Number.isInteger(reps) && reps >= 1 && reps <= 9999),
    isWeightWithinInputRange: vi.fn(weight => Number.isFinite(weight) && weight >= 0 && weight <= 1000),
  }
})

const session = {
  id: 'session-1',
  started_at: '2026-05-30T14:00:00.000Z',
  finished_at: '2026-05-30T14:45:00.000Z',
  notes: 'Felt strong',
  exercise_notes: { 'ex-1': 'Paused reps' },
  calories_burned: 250,
}

const set = {
  id: 'set-1',
  session_id: 'session-1',
  exercise_id: 'ex-1',
  set_number: 1,
  reps: 5,
  weight: 100,
  unit: 'kg',
  estimated_1rm: 116.7,
  duration_seconds: null,
  is_warmup: false,
  set_type: 'normal',
  set_group_index: null,
  exercises: { name: 'Bench Press', category: 'Strength', equipment: 'Barbell' },
}

const nutritionLog = {
  id: 'nut-1',
  food_name: 'Chicken Bowl',
  servings: 1,
  calories: 500,
  protein: 40,
  carbs: 45,
  fat: 12,
  fiber: 5,
  sugar: 3,
  saturated_fat: 2,
  sodium: 400,
  potassium: 500,
  cholesterol: 70,
  vitamin_d: 0,
  magnesium: 30,
  zinc: 2,
  folate: 40,
  vitamin_b12: 1,
  vitamin_b6: 0.5,
}

const weightLog = {
  id: 'weight-1',
  weight: 180,
  unit: 'lbs',
  logged_at: '2026-05-30T10:00:00.000Z',
}

function queue(table, responses) {
  supabaseMock.state.queues.set(table, Array.isArray(responses) ? [...responses] : [responses])
}

function queueDay({ sessions = [], sets = [], nutrition = [], weights = [], profile = { bodyweight: 75, unit_preference: 'kg' } } = {}) {
  queue('nutrition_logs', { data: nutrition, error: null })
  queue('body_weight_logs', { data: weights, error: null })
  queue('profiles', { data: profile, error: null })
  if (sessions.length) {
    queue('workout_sessions', { data: sessions, error: null })
    queue('workout_sets', { data: sets, error: null })
  }
}

function renderDay(props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <WorkoutDayDetail
        dateStr="2026-05-30"
        sessionIds={[]}
        onBack={vi.fn()}
        onDeleteWorkout={vi.fn()}
        onRefresh={vi.fn()}
        onBodyweightChanged={vi.fn()}
        {...props}
      />
    </UserProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  supabaseMock.state.queues.clear()
  supabaseMock.state.operations = []
})

describe('WorkoutDayDetail', () => {
  it('shows loading, error, and empty states', async () => {
    queueDay()
    const loadingView = renderDay()
    expect(loadingView.container.querySelector('.day-detail-loading')).toBeTruthy()
    await screen.findByText('No activity recorded for this day')
    loadingView.unmount()

    queue('nutrition_logs', { data: null, error: new Error('load failed') })
    queue('body_weight_logs', { data: [], error: null })
    queue('profiles', { data: { bodyweight: 75, unit_preference: 'kg' }, error: null })
    renderDay()

    await screen.findByText('load failed')
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('loads workout, nutrition, and body-weight sections for a day', async () => {
    queueDay({
      sessions: [session],
      sets: [set],
      nutrition: [nutritionLog],
      weights: [weightLog],
    })

    const { container } = renderDay({ sessionIds: ['session-1'] })

    await screen.findByText('Bench Press')
    expect(screen.getAllByText('Workout').length).toBeGreaterThan(0)
    expect(screen.getByText('Weight')).toBeTruthy()
    expect(screen.getByText('Reps')).toBeTruthy()
    expect(screen.queryByText('Est. 1RM')).toBeNull()
    expect(screen.getByText('Chicken Bowl')).toBeTruthy()
    expect(screen.getByText('180 lbs')).toBeTruthy()
    expect(container.textContent).toContain('Paused reps')
    expect(container.textContent).toContain('~250')
  })

  it('renders historical workout sets as read-only rows', async () => {
    queueDay({ sessions: [session], sets: [set] })
    const { container } = renderDay({ sessionIds: ['session-1'] })
    await screen.findByText('Bench Press')

    expect(container.querySelector('.day-set-row').textContent).toContain('100 kg')
    expect(container.querySelector('.day-set-row').textContent).toContain('5')
    expect(container.querySelector('.day-set-row button')).toBeNull()
    expect(container.querySelector('.day-set-actions')).toBeNull()
    expect(screen.queryByText('Delete this set?')).toBeNull()
  })

  it('edits and deletes nutrition logs with rescaled totals', async () => {
    queueDay({ nutrition: [nutritionLog] })
    const onRefresh = vi.fn()
    const { container } = renderDay({ onRefresh })
    await screen.findByText('Chicken Bowl')

    fireEvent.click(container.querySelector('.day-edit-btn'))
    const [nameInput, servingsInput] = container.querySelectorAll('.day-edit-input')
    fireEvent.change(nameInput, { target: { value: 'Chicken Bowl Large' } })
    fireEvent.change(servingsInput, { target: { value: '2' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirm update'))
    })

    expect(supabaseMock.state.operations).toContainEqual({
      table: 'nutrition_logs',
      type: 'update',
      payload: expect.objectContaining({
        food_name: 'Chicken Bowl Large',
        servings: 2,
        calories: 1000,
      }),
    })
    expect(screen.getByText('Chicken Bowl Large')).toBeTruthy()

    fireEvent.click(container.querySelector('.day-meal-delete-btn'))
    await act(async () => {
      fireEvent.click(screen.getByText('Delete forever'))
    })

    expect(supabaseMock.state.operations).toContainEqual({ table: 'nutrition_logs', type: 'delete' })
    await waitFor(() => {
      expect(screen.queryByText('Chicken Bowl Large')).toBeNull()
    })
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('deletes a weight log and notifies bodyweight listeners', async () => {
    queueDay({ weights: [weightLog] })
    queue('body_weight_logs', [
      { data: [weightLog], error: null },
      { data: null, error: null },
    ])
    queue('profiles', [
      { data: { bodyweight: 75, unit_preference: 'kg' }, error: null },
      { data: null, error: null },
    ])
    const onBodyweightChanged = vi.fn()
    const { container } = renderDay({ onBodyweightChanged })
    await screen.findByText('180 lbs')

    fireEvent.click(container.querySelector('.day-weight-delete-btn'))
    await act(async () => {
      fireEvent.click(screen.getByText('Delete forever'))
    })

    expect(supabaseMock.state.operations).toContainEqual({ table: 'body_weight_logs', type: 'delete' })
    expect(supabaseMock.state.operations).toContainEqual({
      table: 'profiles',
      type: 'update',
      payload: { bodyweight: null },
    })
    expect(onBodyweightChanged).toHaveBeenCalledTimes(1)
  })

  it('deletes a workout, recalculates streaks, and reports remaining sessions', async () => {
    queueDay({ sessions: [session], sets: [set] })
    queue('profiles', [
      { data: { bodyweight: 75, unit_preference: 'kg' }, error: null },
      { data: { lifetime_volume_kg: 1000 }, error: null },
    ])
    queue('workout_sets', [
      { data: [set], error: null },
      { data: [], error: null },
    ])
    const onDeleteWorkout = vi.fn()
    const { container } = renderDay({ sessionIds: ['session-1'], onDeleteWorkout })
    await screen.findByText('Bench Press')

    fireEvent.click(screen.getByText('Delete workout'))
    await act(async () => {
      fireEvent.click(screen.getByText('Delete forever'))
    })

    expect(supabaseMock.state.operations).toContainEqual({ table: 'workout_sessions', type: 'delete' })
    expect(supabaseMock.state.operations).toContainEqual({ table: 'exercise_prs', type: 'delete' })
    expect(recalculateExerciseRankStatesFromHistoryMock).toHaveBeenCalledWith(supabase, 'user-1', ['ex-1'])
    expect(recalculateStreakAfterDeletion).toHaveBeenCalledWith(supabase, 'user-1')
    expect(onDeleteWorkout).toHaveBeenCalledWith({
      sessionId: 'session-1',
      remainingSessionIds: [],
      dateStr: '2026-05-30',
    })
    expect(container.textContent).not.toContain('Bench Press')
  })
})
