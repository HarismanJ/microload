import {
  buildSupersetDisplayGroups,
  buildPreviousSetValuesByWorkingIndex,
  clearExerciseSetCompletion,
  clearSupersetGroupForExercise,
  defaultSet,
  getDropSetGroupIndexForParent,
  getWorkingSetIndexAt,
  pairExercisesAsSuperset,
  pairExerciseWithNextSuperset,
  markExerciseSetCompleted,
  normalizeCardioSet,
  normalizeStrengthSet,
  normalizeWorkoutExercise,
  normalizeWorkoutExercises,
  removeExerciseAndRepairSupersets,
  repairDropSetGroups,
  repairSupersetExerciseGroups,
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
      setGroupIndex: null,
    })
  })

  it('reads set_type and set_group_index from DB aliases', () => {
    expect(normalizeStrengthSet({ set_type: 'dropset', set_group_index: 2 })).toMatchObject({
      setType: 'dropset',
      setGroupIndex: 2,
    })
  })

  it('falls back to is_warmup when set_type is absent', () => {
    const s = normalizeStrengthSet({ is_warmup: true })
    expect(s.setType).toBe('warmup')
    expect(s.setGroupIndex).toBeNull()
  })

  it('defaultSet includes setGroupIndex: null', () => {
    expect(defaultSet().setGroupIndex).toBeNull()
  })

  it('clamps invalid and excessive cardio durations', () => {
    expect(normalizeCardioSet({ duration: -1 }).duration).toBe(0)
    expect(normalizeCardioSet({ duration: 90000 }).duration).toBe(86400)
  })

  it('normalizes missing exercise sets by exercise category', () => {
    expect(normalizeWorkoutExercise({ name: 'Bench', category: 'Strength' }).sets).toEqual([
      { reps: '', weight: '', done: false, completedAt: null, restBeforeSeconds: null, setType: 'normal', setGroupIndex: null },
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

  it('repairs orphan drop sets when normalizing strength exercises', () => {
    const exercise = normalizeWorkoutExercise({
      name: 'Bench',
      category: 'Strength',
      sets: [
        { reps: 8, weight: 70, done: true, set_type: 'dropset', set_group_index: 5 },
        { reps: 8, weight: 100, setType: 'normal', setGroupIndex: 2 },
        { reps: 8, weight: 75, setType: 'dropset', setGroupIndex: 2 },
      ],
    })

    expect(exercise.sets[0]).toMatchObject({
      reps: 8,
      weight: 70,
      done: true,
      setType: 'normal',
      setGroupIndex: null,
    })
    expect(exercise.sets[1]).toMatchObject({ setType: 'normal', setGroupIndex: 2 })
    expect(exercise.sets[2]).toMatchObject({ setType: 'dropset', setGroupIndex: 2 })
  })
})

describe('previous set values', () => {
  it('resolves working-set position from a flat set index', () => {
    const sets = [
      { setType: 'normal' },
      { setType: 'dropset' },
      { setType: 'normal' },
      { set_type: 'dropset' },
      { setType: 'warmup' },
    ]

    expect(getWorkingSetIndexAt(sets, 0)).toBe(0)
    expect(getWorkingSetIndexAt(sets, 1)).toBeNull()
    expect(getWorkingSetIndexAt(sets, 2)).toBe(1)
    expect(getWorkingSetIndexAt(sets, 3)).toBeNull()
    expect(getWorkingSetIndexAt(sets, 4)).toBe(2)
    expect(getWorkingSetIndexAt(sets, 99)).toBeNull()
  })

  it('maps previous values by working-set position and skips drop sets', () => {
    const previousSets = buildPreviousSetValuesByWorkingIndex([
      {
        sets: [
          { weight: 90, reps: 8, unit: 'kg', set_number: 1, setType: 'normal' },
          { weight: 67.5, reps: 8, unit: 'kg', set_number: 2, setType: 'dropset' },
          { weight: 90, reps: 7, unit: 'kg', set_number: 3, setType: 'normal' },
        ],
      },
    ])

    expect(previousSets).toEqual([
      { weight: 90, reps: 8, unit: 'kg', duration_seconds: undefined, set_number: 1, setType: 'normal' },
      { weight: 90, reps: 7, unit: 'kg', duration_seconds: undefined, set_number: 3, setType: 'normal' },
    ])
  })

  it('preserves previous warmup metadata by set position', () => {
    const previousSets = buildPreviousSetValuesByWorkingIndex([
      {
        sets: [
          { weight: 40, reps: 10, unit: 'kg', set_number: 1, is_warmup: true },
          { weight: 100, reps: 8, unit: 'kg', set_number: 2, set_type: 'normal' },
        ],
      },
    ])

    expect(previousSets[0]).toMatchObject({ weight: 40, reps: 10, setType: 'warmup' })
    expect(previousSets[1]).toMatchObject({ weight: 100, reps: 8, setType: 'normal' })
  })

  it('prefers the most recent session for each working-set position', () => {
    const previousSets = buildPreviousSetValuesByWorkingIndex([
      {
        sets: [
          { weight: 80, reps: 10, unit: 'kg', set_number: 1, setType: 'normal' },
          { weight: 80, reps: 9, unit: 'kg', set_number: 2, setType: 'normal' },
          { weight: 80, reps: 8, unit: 'kg', set_number: 3, setType: 'normal' },
        ],
      },
      {
        sets: [
          { weight: 100, reps: 8, unit: 'kg', set_number: 1, set_type: 'normal' },
          { weight: 75, reps: 8, unit: 'kg', set_number: 2, set_type: 'dropset' },
          { weight: 100, reps: 7, unit: 'kg', set_number: 3, set_type: 'normal' },
        ],
      },
    ])

    expect(previousSets).toEqual([
      { weight: 100, reps: 8, unit: 'kg', duration_seconds: undefined, set_number: 1, setType: 'normal' },
      { weight: 100, reps: 7, unit: 'kg', duration_seconds: undefined, set_number: 3, setType: 'normal' },
      { weight: 80, reps: 8, unit: 'kg', duration_seconds: undefined, set_number: 3, setType: 'normal' },
    ])
  })
})

describe('drop set group helpers', () => {
  it('converts orphan drop sets to visible normal sets without losing logged values', () => {
    const repaired = repairDropSetGroups([
      { setType: 'dropset', setGroupIndex: 9, reps: 8, weight: 60, done: true },
      { setType: 'normal', setGroupIndex: 1, reps: 8, weight: 100 },
      { setType: 'dropset', setGroupIndex: 1, reps: 8, weight: 75 },
      { set_type: 'dropset', set_group_index: 10, reps: 6, weight: 50 },
    ])

    expect(repaired[0]).toMatchObject({
      setType: 'normal',
      setGroupIndex: null,
      reps: 8,
      weight: 60,
      done: true,
    })
    expect(repaired[1]).toMatchObject({ setType: 'normal', setGroupIndex: 1 })
    expect(repaired[2]).toMatchObject({ setType: 'dropset', setGroupIndex: 1 })
    expect(repaired[3]).toMatchObject({
      set_type: 'normal',
      set_group_index: null,
      setType: 'normal',
      setGroupIndex: null,
    })
  })

  it('ungroups duplicate drop-set parents so every non-drop set remains renderable', () => {
    const repaired = repairDropSetGroups([
      { setType: 'normal', setGroupIndex: 3, reps: 8 },
      { setType: 'normal', setGroupIndex: 3, reps: 7 },
      { setType: 'dropset', setGroupIndex: 3, reps: 6 },
    ])

    expect(repaired[0]).toMatchObject({ setType: 'normal', setGroupIndex: 3, reps: 8 })
    expect(repaired[1]).toMatchObject({ setType: 'normal', setGroupIndex: null, reps: 7 })
    expect(repaired[2]).toMatchObject({ setType: 'dropset', setGroupIndex: 3, reps: 6 })
  })

  it('returns an existing parent group index', () => {
    expect(getDropSetGroupIndexForParent([
      { setType: 'normal', setGroupIndex: 4 },
      { setType: 'dropset', setGroupIndex: 4 },
    ], 0)).toBe(4)
  })

  it('allocates the next group index for an ungrouped parent', () => {
    expect(getDropSetGroupIndexForParent([
      { setType: 'normal', setGroupIndex: 1 },
      { setType: 'dropset', setGroupIndex: 1 },
      { setType: 'normal', setGroupIndex: null },
    ], 2)).toBe(2)
  })

  it('rejects drop rows and invalid indexes as drop-set parents', () => {
    const sets = [
      { setType: 'normal' },
      { setType: 'dropset', setGroupIndex: 0 },
    ]

    expect(getDropSetGroupIndexForParent(sets, 1)).toBeNull()
    expect(getDropSetGroupIndexForParent(sets, 99)).toBeNull()
  })
})

describe('superset group helpers', () => {
  it('pairs two adjacent strength exercises and marks only working sets as supersets', () => {
    const paired = pairExerciseWithNextSuperset([
      {
        id: 'bench',
        name: 'Bench Press',
        category: 'Strength',
        sets: [
          { setType: 'warmup', reps: 8 },
          { setType: 'normal', reps: 8 },
          { setType: 'normal', reps: 7 },
        ],
      },
      {
        id: 'row',
        name: 'Cable Row',
        category: 'Strength',
        sets: [
          { setType: 'normal', reps: 10 },
          { setType: 'normal', reps: 9 },
        ],
      },
    ], 'bench')

    expect(paired[0].supersetGroupId).toBe('superset:bench:row')
    expect(paired[1].supersetGroupId).toBe('superset:bench:row')
    expect(paired[0].sets.map(set => set.setType)).toEqual(['warmup', 'superset', 'superset'])
    expect(paired[1].sets.map(set => set.setType)).toEqual(['superset', 'superset'])
  })

  it('allows drop sets to stay nested under a supersetted parent', () => {
    const paired = pairExerciseWithNextSuperset([
      {
        id: 'bench',
        name: 'Bench Press',
        category: 'Strength',
        sets: [
          { setType: 'normal', setGroupIndex: 2, reps: 8 },
          { setType: 'dropset', setGroupIndex: 2, reps: 8 },
        ],
      },
      {
        id: 'row',
        name: 'Cable Row',
        category: 'Strength',
        sets: [{ setType: 'normal', reps: 10 }],
      },
    ], 'bench')

    expect(paired[0].sets[0]).toMatchObject({ setType: 'superset', setGroupIndex: 2 })
    expect(paired[0].sets[1]).toMatchObject({ setType: 'dropset', setGroupIndex: 2 })
  })

  it('does not pair cardio exercises', () => {
    const exercises = [
      { id: 'run', category: 'Cardio', sets: [{ duration: 600 }] },
      { id: 'row', category: 'Strength', sets: [{ setType: 'normal' }] },
    ]

    expect(pairExerciseWithNextSuperset(exercises, 'run')).toBe(exercises)
  })

  it('pairs with any selected strength exercise and moves the lower one directly underneath', () => {
    const paired = pairExercisesAsSuperset([
      { id: 'bench', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'squat', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'row', category: 'Strength', sets: [{ setType: 'normal' }] },
    ], 'bench', 'row')

    expect(paired.map(exercise => exercise.id)).toEqual(['bench', 'row', 'squat'])
    expect(paired[0].supersetGroupId).toBe('superset:bench:row')
    expect(paired[1].supersetGroupId).toBe('superset:bench:row')
    expect(paired[2].supersetGroupId).toBeUndefined()
    expect(paired[0].sets[0].setType).toBe('superset')
    expect(paired[1].sets[0].setType).toBe('superset')
  })

  it('clears a superset pair back to normal working sets', () => {
    const paired = pairExerciseWithNextSuperset([
      { id: 'bench', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'row', category: 'Strength', sets: [{ setType: 'normal' }, { setType: 'dropset', setGroupIndex: 1 }] },
    ], 'bench')

    const cleared = clearSupersetGroupForExercise(paired, 'row')

    expect(cleared.map(exercise => exercise.supersetGroupId)).toEqual([null, null])
    expect(cleared[0].sets[0].setType).toBe('normal')
    expect(cleared[1].sets.map(set => set.setType)).toEqual(['normal', 'dropset'])
  })

  it('dissolves old pairs before creating a new adjacent pair', () => {
    const firstPair = pairExerciseWithNextSuperset([
      { id: 'bench', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'row', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'curl', category: 'Strength', sets: [{ setType: 'normal' }] },
    ], 'bench')

    const secondPair = pairExerciseWithNextSuperset(firstPair, 'row')

    expect(secondPair[0].supersetGroupId).toBeNull()
    expect(secondPair[0].sets[0].setType).toBe('normal')
    expect(secondPair[1].supersetGroupId).toBe('superset:row:curl')
    expect(secondPair[2].supersetGroupId).toBe('superset:row:curl')
  })

  it('removing an exercise clears its remaining superset partner', () => {
    const paired = pairExerciseWithNextSuperset([
      { id: 'bench', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'row', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'curl', category: 'Strength', sets: [{ setType: 'normal' }] },
    ], 'bench')

    const remaining = removeExerciseAndRepairSupersets(paired, 'bench')

    expect(remaining.map(exercise => exercise.id)).toEqual(['row', 'curl'])
    expect(remaining[0].supersetGroupId).toBeNull()
    expect(remaining[0].sets[0].setType).toBe('normal')
  })

  it('repairs orphan and oversized superset groups', () => {
    const repaired = repairSupersetExerciseGroups([
      { id: 'bench', category: 'Strength', supersetGroupId: 'group-a', sets: [{ setType: 'superset' }] },
      { id: 'row', category: 'Strength', supersetGroupId: 'group-b', sets: [{ setType: 'superset' }] },
      { id: 'curl', category: 'Strength', supersetGroupId: 'group-b', sets: [{ setType: 'superset' }] },
      { id: 'press', category: 'Strength', supersetGroupId: 'group-b', sets: [{ setType: 'superset' }] },
      { id: 'run', category: 'Cardio', supersetGroupId: 'group-c', sets: [{ duration: 600 }] },
    ])

    expect(repaired.map(exercise => exercise.supersetGroupId)).toEqual([null, null, null, null, null])
    expect(repaired[0].sets[0].setType).toBe('normal')
    expect(repaired[4].sets[0]).toEqual({ duration: 600 })
  })

  it('derives adjacent display metadata with equal and mixed round labels', () => {
    const paired = pairExerciseWithNextSuperset([
      { id: 'bench', category: 'Strength', sets: [{ setType: 'normal' }, { setType: 'normal' }] },
      { id: 'row', category: 'Strength', sets: [{ setType: 'normal' }, { setType: 'normal' }] },
      { id: 'curl', category: 'Strength', sets: [{ setType: 'normal' }] },
      { id: 'triceps', category: 'Strength', sets: [{ setType: 'normal' }, { setType: 'normal' }] },
    ], 'bench')
    const twoPairs = pairExerciseWithNextSuperset(paired, 'curl')

    const meta = buildSupersetDisplayGroups(twoPairs)

    expect(meta.groups).toMatchObject([
      { groupLabel: 'Superset A', roundsText: '2 rounds', isAdjacent: true },
      { groupLabel: 'Superset B', roundsText: 'mixed sets', isAdjacent: true },
    ])
    expect(meta.byExerciseId.bench.memberLabel).toBe('A1')
    expect(meta.byExerciseId.row.memberLabel).toBe('A2')
    expect(meta.byExerciseId.curl.memberLabel).toBe('B1')
    expect(meta.byExerciseId.triceps.memberLabel).toBe('B2')
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
      { done: false, completedAt: null, restBeforeSeconds: null, progressionEvent: null, estimatedFresh1rm: null },
    ])
  })

  it('clears progressionEvent when unchecking a completed strength set', () => {
    const exercise = {
      category: 'Strength',
      sets: [
        { done: true, completedAt: '2026-05-14T12:00:00.000Z', restBeforeSeconds: 90, progressionEvent: 'deload' },
        { done: true, completedAt: '2026-05-14T12:02:00.000Z', restBeforeSeconds: 90, progressionEvent: 'reacclimate' },
        { done: true, completedAt: '2026-05-14T12:04:00.000Z', restBeforeSeconds: 90 },
      ],
    }

    expect(clearExerciseSetCompletion(exercise, 0).sets[0].progressionEvent).toBeNull()
    expect(clearExerciseSetCompletion(exercise, 1).sets[1].progressionEvent).toBeNull()
    expect(clearExerciseSetCompletion(exercise, 2).sets[2].progressionEvent).toBeNull()
  })

  it('clears estimatedFresh1rm when unchecking a completed strength set', () => {
    const exercise = {
      category: 'Strength',
      sets: [
        { done: true, completedAt: '2026-05-14T12:00:00.000Z', restBeforeSeconds: 90, estimatedFresh1rm: 126.8 },
        { done: true, completedAt: '2026-05-14T12:02:00.000Z', restBeforeSeconds: 90 },
      ],
    }

    expect(clearExerciseSetCompletion(exercise, 0).sets[0].estimatedFresh1rm).toBeNull()
    expect(clearExerciseSetCompletion(exercise, 1).sets[1].estimatedFresh1rm).toBeNull()
  })

  it('does not introduce progressionEvent when clearing cardio sets', () => {
    const exercise = {
      category: 'Cardio',
      sets: [{ duration: 60, done: true, completedAt: '2026-05-14T12:00:00.000Z' }],
    }

    const result = clearExerciseSetCompletion(exercise, 0)
    expect('progressionEvent' in result.sets[0]).toBe(false)
    expect('estimatedFresh1rm' in result.sets[0]).toBe(false)
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
