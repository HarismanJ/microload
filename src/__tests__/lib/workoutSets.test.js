import {
  clearExerciseSetCompletion,
  markExerciseSetCompleted,
  normalizeCardioSet,
  normalizeStrengthSet,
  normalizeWorkoutExercise,
  normalizeWorkoutExercises,
} from '../../lib/workoutSets.js'

describe('set normalization', () => {
  it('normalizes strength set aliases and defaults', () => {
    expect(normalizeStrengthSet({
      reps: 5,
      weight: 100,
      done: 1,
      completed_at: '2026-05-14T12:00:00.000Z',
      rest_before_seconds: 95,
      is_warmup: true,
    })).toMatchObject({
      reps: 5,
      weight: 100,
      done: true,
      completedAt: '2026-05-14T12:00:00.000Z',
      restBeforeSeconds: 95,
      setType: 'warmup',
    })
  })

  it('clamps invalid and excessive cardio durations', () => {
    expect(normalizeCardioSet({ duration: -1 }).duration).toBe(0)
    expect(normalizeCardioSet({ duration: 90000 }).duration).toBe(86400)
  })

  it('normalizes missing exercise sets by exercise category', () => {
    expect(normalizeWorkoutExercise({ name: 'Bench', category: 'Strength' }).sets).toEqual([
      { reps: '', weight: '', done: false, completedAt: null, restBeforeSeconds: null, setType: 'normal' },
    ])
    expect(normalizeWorkoutExercise({ name: 'Run', category: 'Cardio' }).sets).toEqual([
      { duration: 0, done: false, completedAt: null },
    ])
  })

  it('normalizes arrays of exercises and preserves null exercises', () => {
    const exercises = normalizeWorkoutExercises([
      { category: 'Strength', sets: [{ reps: 5, weight: 100 }] },
      null,
    ])
    expect(exercises[0].sets[0]).toMatchObject({ reps: 5, weight: 100, done: false })
    expect(exercises[1]).toBeNull()
  })
})

describe('set completion transforms', () => {
  it('marks only the target set completed and derives prior rest', () => {
    const exercise = {
      category: 'Strength',
      sets: [
        { reps: 5, done: true, completedAt: '2026-05-14T12:00:00.000Z' },
        { reps: 5, done: false, completedAt: null, restBeforeSeconds: null },
      ],
    }

    const next = markExerciseSetCompleted(exercise, 1, {
      completedAtMs: Date.parse('2026-05-14T12:02:05.000Z'),
    })

    expect(next).not.toBe(exercise)
    expect(next.sets[0]).toBe(exercise.sets[0])
    expect(next.sets[1]).toMatchObject({
      done: true,
      completedAt: '2026-05-14T12:02:05.000Z',
      restBeforeSeconds: 125,
    })
  })

  it('clears only the target set completion state', () => {
    const exercise = {
      category: 'Strength',
      sets: [
        { done: true, completedAt: '2026-05-14T12:00:00.000Z', restBeforeSeconds: null },
        { done: true, completedAt: '2026-05-14T12:02:05.000Z', restBeforeSeconds: 125 },
      ],
    }

    expect(clearExerciseSetCompletion(exercise, 1).sets).toEqual([
      exercise.sets[0],
      { done: false, completedAt: null, restBeforeSeconds: null },
    ])
  })

  it('marks cardio sets without deriving rest', () => {
    const next = markExerciseSetCompleted({
      category: 'Cardio',
      sets: [{ duration: 60, done: false }],
    }, 0, {
      completedAtMs: Date.parse('2026-05-14T12:00:00.000Z'),
    })

    expect(next.sets[0]).toEqual({
      duration: 60,
      done: true,
      completedAt: '2026-05-14T12:00:00.000Z',
    })
  })

  it('can skip rest derivation for strength sets', () => {
    const next = markExerciseSetCompleted({
      category: 'Strength',
      sets: [
        { done: true, completedAt: '2026-05-14T12:00:00.000Z' },
        { done: false },
      ],
    }, 1, {
      completedAtMs: Date.parse('2026-05-14T12:02:00.000Z'),
      deriveRest: false,
    })

    expect(next.sets[1].restBeforeSeconds).toBeNull()
  })
})
