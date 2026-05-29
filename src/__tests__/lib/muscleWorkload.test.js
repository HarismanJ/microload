vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../data/exercises.js', () => ({
  fetchExercises: vi.fn(),
}))

import { fetchExercises } from '../../data/exercises.js'
import {
  applyMuscleWorkloadGoal,
  buildWeeklyMuscleWorkload,
  computeMuscleOverlapWeight,
  fetchWeeklyMuscleWorkload,
  getHeatBucket,
  getLocalTrainingWeekRange,
} from '../../lib/muscleWorkload.js'
import { SECONDARY_MUSCLE_CREDIT } from '../../lib/muscleStimulus.js'
import { supabase } from '../../lib/supabase.js'

const THURSDAY = new Date('2026-05-14T12:00:00.000Z')
const SUNDAY = new Date('2026-05-17T12:00:00.000Z')

function getGroup(workload, key) {
  return workload.groups.find(group => group.key === key)
}

function makeSession(id, finishedAt, sets = []) {
  return {
    id,
    started_at: finishedAt,
    finished_at: finishedAt,
    workout_sets: sets,
  }
}

function makeSet(id, sessionId, exerciseId, completedAt, overrides = {}) {
  return {
    id,
    session_id: sessionId,
    exercise_id: exerciseId,
    completed_at: completedAt,
    is_warmup: false,
    ...overrides,
  }
}

function makeExercise(id, overrides = {}) {
  return {
    id,
    name: 'Bench Press',
    category: 'Strength',
    primary_muscles: ['Chest'],
    secondary_muscles: ['Front Delts'],
    ...overrides,
  }
}

function makeSessionsQuery(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

function mockWorkloadSupabase({ sessionsResult }) {
  const sessionsQuery = makeSessionsQuery(sessionsResult)

  supabase.from.mockImplementation(table => {
    if (table === 'workout_sessions') return sessionsQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  return { sessionsQuery }
}

beforeEach(() => {
  supabase.from.mockReset()
  fetchExercises.mockReset()
})

describe('getHeatBucket', () => {
  it('maps target ratios to heat buckets', () => {
    expect(getHeatBucket(0)).toBe(0)
    expect(getHeatBucket(0.2)).toBe(1)
    expect(getHeatBucket(0.5)).toBe(2)
    expect(getHeatBucket(0.9)).toBe(3)
    expect(getHeatBucket(2.4)).toBe(4)
    expect(getHeatBucket(3)).toBe(5)
  })

  it('uses the upper bucket at exact boundaries', () => {
    expect(getHeatBucket(0.4)).toBe(2)
    expect(getHeatBucket(0.8)).toBe(3)
    expect(getHeatBucket(2.0)).toBe(4)
    expect(getHeatBucket(2.5)).toBe(5)
  })
})

describe('computeMuscleOverlapWeight', () => {
  it('scores primary and secondary muscle overlap by workload group', () => {
    expect(computeMuscleOverlapWeight(['Chest'], [], ['Chest'], [])).toBe(1)
    expect(computeMuscleOverlapWeight(['Chest'], [], [], ['Chest'])).toBe(SECONDARY_MUSCLE_CREDIT)
    expect(computeMuscleOverlapWeight([], ['Chest'], [], ['Chest'])).toBeCloseTo(SECONDARY_MUSCLE_CREDIT ** 2)
  })

  it('returns zero when muscle groups do not overlap', () => {
    expect(computeMuscleOverlapWeight(['Chest'], [], ['Quads'], [])).toBe(0)
  })

  it('uses the strongest overlap when multiple muscles map to the same group', () => {
    expect(computeMuscleOverlapWeight(
      ['Chest', 'Upper Chest'],
      [],
      [],
      ['Lower Chest']
    )).toBe(SECONDARY_MUSCLE_CREDIT)
  })
})

describe('getLocalTrainingWeekRange', () => {
  it('starts a Thursday training week on Sunday and ends the next Sunday', () => {
    expect(getLocalTrainingWeekRange(THURSDAY)).toMatchObject({
      startDate: '2026-05-10',
      endDate: '2026-05-17',
    })
  })

  it('Sunday starts its own training week', () => {
    expect(getLocalTrainingWeekRange(SUNDAY)).toMatchObject({
      startDate: '2026-05-17',
      endDate: '2026-05-24',
    })
  })
})

describe('fetchWeeklyMuscleWorkload', () => {
  it('returns an empty workload without querying when user id is missing', async () => {
    const workload = await fetchWeeklyMuscleWorkload('', THURSDAY)

    expect(workload).toMatchObject({
      week: {
        startDate: '2026-05-10',
        endDate: '2026-05-17',
      },
      totalEffectiveSets: 0,
      trainedGroupCount: 0,
      trainedDays: [],
      lastTrainedAt: null,
    })
    expect(workload.groups.every(group => group.effectiveSets === 0)).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
    expect(fetchExercises).not.toHaveBeenCalled()
  })

  it('fetches sessions with embedded sets before building weekly workload', async () => {
    const range = getLocalTrainingWeekRange(THURSDAY)
    const sessions = [
      makeSession('s1', '2026-05-14T12:00:00.000Z', [
        makeSet('set-1', 's1', 'bench', '2026-05-14T12:00:00.000Z'),
      ]),
      makeSession('', '2026-05-14T13:00:00.000Z'),
      makeSession('s2', '2026-05-15T12:00:00.000Z', [
        makeSet('set-2', 's2', 'bench', '2026-05-15T12:00:00.000Z'),
      ]),
    ]
    const { sessionsQuery } = mockWorkloadSupabase({
      sessionsResult: { data: sessions, error: null },
    })
    fetchExercises.mockResolvedValue([makeExercise('bench')])

    const workload = await fetchWeeklyMuscleWorkload('user-1', THURSDAY)
    const chest = getGroup(workload, 'chest')
    const shoulders = getGroup(workload, 'front-deltoids')

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('workout_sessions')
    expect(sessionsQuery.select).toHaveBeenCalledWith(
      'id, started_at, finished_at, workout_sets!workout_sets_session_id_fkey(id, session_id, exercise_id, completed_at, is_warmup, set_type)'
    )
    expect(sessionsQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(sessionsQuery.not).toHaveBeenCalledWith('finished_at', 'is', null)
    expect(sessionsQuery.gte).toHaveBeenCalledWith('finished_at', range.startIso)
    expect(sessionsQuery.lt).toHaveBeenCalledWith('finished_at', range.endIso)
    expect(fetchExercises).toHaveBeenCalledWith('user-1')
    expect(chest).toMatchObject({
      effectiveSets: 2,
      contributors: [{ name: 'Bench Press', rawSets: 2, creditPerSet: 1, setsCredit: 2 }],
    })
    expect(shoulders).toMatchObject({
      effectiveSets: 0.7,
      contributors: [{ name: 'Bench Press', rawSets: 2, creditPerSet: SECONDARY_MUSCLE_CREDIT, setsCredit: 0.7 }],
    })
    expect(workload).toMatchObject({
      week: {
        startDate: '2026-05-10',
        endDate: '2026-05-17',
      },
      totalEffectiveSets: 2.7,
      trainedDays: ['2026-05-14', '2026-05-15'],
    })
  })

  it('returns an empty workload when no sessions are found in the week', async () => {
    mockWorkloadSupabase({
      sessionsResult: { data: [], error: null },
    })
    fetchExercises.mockResolvedValue([makeExercise('bench')])

    const workload = await fetchWeeklyMuscleWorkload('user-1', THURSDAY)

    expect(fetchExercises).toHaveBeenCalledWith('user-1')
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('workout_sessions')
    expect(workload).toMatchObject({
      week: {
        startDate: '2026-05-10',
        endDate: '2026-05-17',
      },
      totalEffectiveSets: 0,
      trainedGroupCount: 0,
    })
  })

  it('throws when the sessions query fails', async () => {
    const sessionsError = new Error('sessions failed')
    mockWorkloadSupabase({
      sessionsResult: { data: null, error: sessionsError },
    })
    fetchExercises.mockResolvedValue([makeExercise('bench')])

    await expect(fetchWeeklyMuscleWorkload('user-1', THURSDAY)).rejects.toThrow('sessions failed')

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('workout_sessions')
  })

})

describe('applyMuscleWorkloadGoal', () => {
  const workload = {
    groups: [
      {
        key: 'chest',
        label: 'Chest',
        chartMuscles: ['chest'],
        weeklyTargets: { strength: 5, hypertrophy: 10 },
        effectiveSets: 5,
      },
      {
        key: 'biceps',
        label: 'Biceps',
        chartMuscles: ['biceps'],
        weeklyTargets: { strength: 4, hypertrophy: 12 },
        effectiveSets: 0,
      },
    ],
  }

  it('defaults to hypertrophy and builds chart data for trained groups', () => {
    const result = applyMuscleWorkloadGoal(workload)
    const chest = getGroup(result, 'chest')

    expect(result.goal).toBe('hypertrophy')
    expect(chest).toMatchObject({
      weeklyTarget: 10,
      targetRatio: 0.5,
      heatBucket: 2,
    })
    expect(result.chartData).toEqual([
      { name: 'Chest', muscles: ['chest'], frequency: 2 },
    ])
  })

  it('uses goal-specific targets and falls back to hypertrophy for unknown goals', () => {
    const strength = applyMuscleWorkloadGoal(workload, 'strength')
    expect(getGroup(strength, 'chest')).toMatchObject({
      weeklyTarget: 5,
      targetRatio: 1,
      heatBucket: 3,
    })

    const unknown = applyMuscleWorkloadGoal(workload, 'mobility')
    expect(unknown.goal).toBe('mobility')
    expect(getGroup(unknown, 'chest').weeklyTarget).toBe(10)
  })
})

describe('buildWeeklyMuscleWorkload', () => {
  const range = getLocalTrainingWeekRange(THURSDAY)

  it('returns a zeroed workload when required inputs are empty', () => {
    const workload = buildWeeklyMuscleWorkload({ range })

    expect(workload).toMatchObject({
      week: range,
      chartData: [],
      totalEffectiveSets: 0,
      trainedGroupCount: 0,
      trainedDays: [],
      lastTrainedAt: null,
    })
    expect(workload.groups.every(group => group.effectiveSets === 0)).toBe(true)
  })

  it('credits primary and secondary muscles while excluding warmups, drop sets, and cardio', () => {
    const sessions = [
      makeSession('s1', '2026-05-14T12:00:00.000Z'),
      makeSession('s2', '2026-05-15T12:00:00.000Z'),
    ]
    const exercises = [
      makeExercise('bench'),
      makeExercise('run', { name: 'Running', category: 'Cardio', primary_muscles: [], secondary_muscles: [] }),
    ]
    const sets = [
      makeSet('warmup', 's1', 'bench', '2026-05-14T11:50:00.000Z', { is_warmup: true }),
      makeSet('working-1', 's1', 'bench', '2026-05-14T12:00:00.000Z'),
      makeSet('drop-1', 's1', 'bench', '2026-05-14T12:05:00.000Z', { set_type: 'dropset' }),
      makeSet('working-2', 's2', 'bench', '2026-05-15T12:00:00.000Z'),
      makeSet('cardio', 's2', 'run', '2026-05-15T12:30:00.000Z'),
    ]

    const workload = buildWeeklyMuscleWorkload({ sessions, sets, exercises, range })
    const chest = getGroup(workload, 'chest')
    const shoulders = getGroup(workload, 'front-deltoids')

    expect(chest).toMatchObject({
      effectiveSets: 2,
      trainedDays: ['2026-05-14', '2026-05-15'],
      trainedDayCount: 2,
      lastTrainedAt: '2026-05-15T12:00:00.000Z',
      contributors: [{ name: 'Bench Press', rawSets: 2, creditPerSet: 1, setsCredit: 2 }],
    })
    expect(shoulders).toMatchObject({
      effectiveSets: 0.7,
      contributors: [{ name: 'Bench Press', rawSets: 2, creditPerSet: SECONDARY_MUSCLE_CREDIT, setsCredit: 0.7 }],
    })
    expect(workload).toMatchObject({
      totalEffectiveSets: 2.7,
      trainedGroupCount: 2,
      trainedDays: ['2026-05-14', '2026-05-15'],
      lastTrainedAt: '2026-05-15T12:00:00.000Z',
    })
  })

  it('does not double-count multiple muscles that map to the same group on one set', () => {
    const workload = buildWeeklyMuscleWorkload({
      sessions: [makeSession('s1', '2026-05-14T12:00:00.000Z')],
      exercises: [
        makeExercise('incline', {
          name: 'Incline Press',
          primary_muscles: ['Chest', 'Upper Chest'],
          secondary_muscles: ['Lower Chest'],
        }),
      ],
      sets: [makeSet('set-1', 's1', 'incline', '2026-05-14T12:00:00.000Z')],
      range,
    })

    expect(getGroup(workload, 'chest')).toMatchObject({
      effectiveSets: 1,
      contributors: [{ name: 'Incline Press', rawSets: 1, creditPerSet: 1, setsCredit: 1 }],
    })
  })
})
