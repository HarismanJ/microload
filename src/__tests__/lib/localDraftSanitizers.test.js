import {
  sanitizeHiddenTemplateIds,
  sanitizeExerciseNotes,
  sanitizeNotesOpen,
  sanitizeRestTimer,
  sanitizeWorkoutDraft,
} from '../../lib/localDraftSanitizers.js'
import { WORKOUT_DRAFT_VERSION as VERSION } from '../../lib/workoutDraft.js'

function makeDraft(overrides = {}) {
  return {
    version: VERSION,
    savedAt: Date.now(),
    startedAt: Date.now(),
    sessionId: 'session-1',
    workoutExercises: [],
    exerciseNotes: {},
    notesOpen: {},
    defaultUnit: 'kg',
    defaultRest: 90,
    ...overrides,
  }
}

describe('sanitizeWorkoutDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects null, malformed, and version-mismatched drafts', () => {
    expect(sanitizeWorkoutDraft(null, VERSION)).toBeNull()
    expect(sanitizeWorkoutDraft({ version: VERSION - 1 }, VERSION)).toBeNull()
    expect(sanitizeWorkoutDraft({ workoutExercises: [] }, VERSION)).toBeNull()
  })

  it('preserves valid drop groups and repairs malformed strength set grouping', () => {
    const sanitized = sanitizeWorkoutDraft(makeDraft({
      workoutExercises: [{
        id: 'ex-1',
        name: 'Bench',
        category: 'Strength',
        sets: [
          { reps: '8', weight: '100', setType: 'normal', setGroupIndex: 3 },
          { reps: '8', weight: '80', set_type: 'dropset', set_group_index: 3 },
          { reps: '6', weight: '70', setType: 'dropset', setGroupIndex: 9 },
          { reps: '6', weight: '60', setType: 'xyz', setGroupIndex: -1 },
        ],
      }],
    }), VERSION)

    const [first, second, third, fourth] = sanitized.workoutExercises[0].sets
    expect(first.setType).toBe('normal')
    expect(first.setGroupIndex).toBe(3)
    expect(second.setType).toBe('dropset')
    expect(second.setGroupIndex).toBe(3)
    expect(third).toMatchObject({
      reps: '6',
      weight: '70',
      setType: 'normal',
      setGroupIndex: null,
    })
    expect(fourth.setType).toBe('normal')
    expect(fourth.setGroupIndex).toBeNull()
  })

  it('preserves valid superset groups and repairs orphan or malformed links', () => {
    const sanitized = sanitizeWorkoutDraft(makeDraft({
      workoutExercises: [
        {
          id: 'bench',
          name: 'Bench',
          category: 'Strength',
          supersetGroupId: 'superset-a',
          sets: [{ reps: '8', weight: '100', setType: 'superset' }],
        },
        {
          id: 'row',
          name: 'Row',
          category: 'Strength',
          supersetGroupId: 'superset-a',
          sets: [{ reps: '10', weight: '80', setType: 'superset' }],
        },
        {
          id: 'curl',
          name: 'Curl',
          category: 'Strength',
          supersetGroupId: 'orphaned',
          sets: [{ reps: '12', weight: '30', setType: 'superset' }],
        },
        {
          id: 'run',
          name: 'Run',
          category: 'Cardio',
          supersetGroupId: 'cardio-group',
          sets: [{ duration: 600 }],
        },
      ],
    }), VERSION)

    expect(sanitized.workoutExercises[0].supersetGroupId).toBe('superset-a')
    expect(sanitized.workoutExercises[1].supersetGroupId).toBe('superset-a')
    expect(sanitized.workoutExercises[2].supersetGroupId).toBeNull()
    expect(sanitized.workoutExercises[2].sets[0].setType).toBe('normal')
    expect(sanitized.workoutExercises[3].supersetGroupId).toBeNull()
  })

  it('preserves plan progression metadata and set progression events for resumed workouts', () => {
    const sanitized = sanitizeWorkoutDraft(makeDraft({
      sourcePlanId: 'plan-1',
      sourcePlanDayId: 'day-2',
      sourcePlanWeek: 4.6,
      sourcePlanDeloadWeek: 1,
      workoutExercises: [{
        id: 'ex-1',
        name: 'Bench',
        category: 'Strength',
        planSource: 'training_plan',
        planId: 'plan-1',
        planDayId: 'day-2',
        planWeek: 4.6,
        planTargetReps: 8,
        planRepRange: '6-10',
        planPeriodizationStyle: 'linear',
        planIntensityTag: 'heavy',
        planProgressionBias: 'load_first',
        planDeloadWeek: 1,
        planDeloadReason: 'scheduled',
        sets: [
          { reps: '8', weight: '100', progressionEvent: 'deload' },
          { reps: '8', weight: '95', progression_event: 'reacclimate' },
          { reps: '8', weight: '90', progressionEvent: 'fatigue_adjusted' },
          { reps: '8', weight: '85', progressionEvent: 'unexpected' },
        ],
      }],
    }), VERSION)

    expect(sanitized).toMatchObject({
      sourcePlanId: 'plan-1',
      sourcePlanDayId: 'day-2',
      sourcePlanWeek: 5,
      sourcePlanDeloadWeek: true,
    })
    expect(sanitized.workoutExercises[0]).toMatchObject({
      planSource: 'training_plan',
      planId: 'plan-1',
      planDayId: 'day-2',
      planWeek: 5,
      planTargetReps: 8,
      planRepRange: '6-10',
      planPeriodizationStyle: 'linear',
      planIntensityTag: 'heavy',
      planProgressionBias: 'load_first',
      planDeloadWeek: true,
      planDeloadReason: 'scheduled',
    })
    expect(sanitized.workoutExercises[0].sets.map(set => set.progressionEvent))
      .toEqual(['deload', 'reacclimate', 'fatigue_adjusted', null])
  })

  it('strips excess exercises and clamps unsafe set fields', () => {
    const workoutExercises = Array.from({ length: 101 }, (_, index) => ({
      id: `exercise-${index}`,
      name: `Exercise ${index}`,
      category: 'Strength',
      sets: [{ reps: '10000', weight: '100', restBeforeSeconds: 4000 }],
    }))

    const sanitized = sanitizeWorkoutDraft(makeDraft({ workoutExercises }), VERSION)

    expect(sanitized.workoutExercises).toHaveLength(100)
    expect(sanitized.workoutExercises[0].sets[0]).toMatchObject({
      reps: '9999',
      weight: '100',
      restBeforeSeconds: 3600,
    })
  })

  it('drops expired rest timers', () => {
    const sanitized = sanitizeWorkoutDraft(makeDraft({
      restTimer: {
        endTime: Date.now() - 1000,
        total: 120,
        exerciseName: 'Bench Press',
      },
    }), VERSION)

    expect(sanitized.restTimer).toBeNull()
  })

  it('sanitizes cardio exercises and draft defaults', () => {
    const sanitized = sanitizeWorkoutDraft(makeDraft({
      defaultUnit: 'lbs',
      defaultRest: 5000,
      workoutExercises: [{
        id: 123,
        name: 'A'.repeat(100),
        category: 'Cardio',
        unit: 'lbs',
        restSeconds: -10,
        sets: [{ durationSeconds: 90000, done: 1, completed_at: 'done-at' }],
      }],
    }), VERSION)

    expect(sanitized.defaultUnit).toBe('lbs')
    expect(sanitized.defaultRest).toBe(3600)
    expect(sanitized.workoutExercises[0]).toMatchObject({
      id: '123',
      name: 'A'.repeat(80),
      category: 'Cardio',
      restSeconds: 0,
      sets: [{ duration: 86400, done: true, completedAt: 'done-at' }],
    })
  })

  it('clamps draft timestamps into a sane window', () => {
    const sanitized = sanitizeWorkoutDraft(makeDraft({
      savedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      startedAt: Date.now() + 2 * 60 * 60 * 1000,
    }), VERSION)

    expect(sanitized.savedAt).toBe(Date.now() - 7 * 24 * 60 * 60 * 1000)
    expect(sanitized.startedAt).toBe(Date.now() + 60 * 60 * 1000)
  })
})

describe('local draft helper sanitizers', () => {
  it('sanitizes exercise notes and open-note state', () => {
    expect(sanitizeExerciseNotes({
      'exercise-1': 'A'.repeat(1200),
      '': 'ignored',
    })).toEqual({
      'exercise-1': 'A'.repeat(1000),
    })

    expect(sanitizeNotesOpen({
      'exercise-1': 1,
      'exercise-2': 0,
      '': true,
    })).toEqual({
      'exercise-1': true,
      'exercise-2': false,
    })
  })

  it('returns empty helper objects for malformed note values', () => {
    expect(sanitizeExerciseNotes(null)).toEqual({})
    expect(sanitizeNotesOpen([])).toEqual({})
  })

  it('clamps valid rest timers and removes invalid ones', () => {
    expect(sanitizeRestTimer({
      endTime: Date.now() + 1000,
      total: 4000,
      exerciseName: 'Bench Press',
      completed: 1,
    })).toMatchObject({
      total: 3600,
      exerciseName: 'Bench Press',
      completed: true,
    })

    expect(sanitizeRestTimer({ endTime: Date.now() - 1 })).toBeNull()
  })

  it('normalizes hidden template ids', () => {
    expect(sanitizeHiddenTemplateIds('bad', ['a'])).toEqual([])
    expect(sanitizeHiddenTemplateIds(['a', 'b', 'a', 'c'], ['a', 'c'])).toEqual(['a', 'c'])
  })
})
