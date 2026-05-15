import {
  analyzeExerciseHistory,
  buildCurrentSetSuggestion,
  fetchRecentSessions,
  getWeightIncrement,
} from '../../lib/progressiveOverload.js'
import { calculateORM } from '../../lib/orm.js'

const NOW = new Date('2026-05-14T12:00:00.000Z')

function makeSet({
  weightKg = 100,
  reps = 8,
  setNumber = 1,
  estimatedOrmKg = calculateORM(weightKg, reps),
  progressionEvent = null,
  isWarmup = false,
} = {}) {
  return {
    weight: weightKg,
    weightKg,
    unit: 'kg',
    reps,
    estimatedOrmKg,
    estimated_1rm: estimatedOrmKg,
    set_number: setNumber,
    completed_at: NOW.toISOString(),
    rest_before_seconds: null,
    progressionEvent,
    isWarmup,
  }
}

function makeSession(daysAgo, sets) {
  return {
    sessionId: `session-${daysAgo}`,
    sessionDate: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    sets,
  }
}

function makeCurrentSet({ reps = '', weight = '', done = false } = {}) {
  return { reps, weight, done }
}

function makePriorExercise({
  doneSets = [{ reps: 10, weight: 100, setType: 'normal' }],
  primaryMuscles = ['Chest'],
  secondaryMuscles = ['Triceps'],
} = {}) {
  return { doneSets, primaryMuscles, secondaryMuscles }
}

function makeSuggestionInput(overrides = {}) {
  return {
    sessions: [],
    currentSets: [makeCurrentSet()],
    equipment: 'Barbell',
    unitPreference: 'kg',
    exerciseName: null,
    ...overrides,
  }
}

function makeSupabaseRow(overrides = {}) {
  return {
    exercise_id: 'bench',
    weight: 100,
    reps: 8,
    unit: 'kg',
    estimated_1rm: null,
    set_number: 1,
    duration_seconds: null,
    completed_at: '2026-05-10T12:10:00.000Z',
    rest_before_seconds: null,
    created_at: '2026-05-10T12:10:00.000Z',
    session_id: 'session-1',
    progression_event: null,
    is_warmup: false,
    workout_sessions: { started_at: '2026-05-10T12:00:00.000Z' },
    ...overrides,
  }
}

function makeSupabaseRows() {
  return [
    makeSupabaseRow({
      exercise_id: 'bench',
      session_id: 'newer-session',
      set_number: 2,
      weight: 100,
      reps: 8,
      estimated_1rm: null,
      rest_before_seconds: -20,
      created_at: '2026-05-12T12:12:00.000Z',
      completed_at: '2026-05-12T12:12:00.000Z',
      workout_sessions: { started_at: '2026-05-12T12:00:00.000Z' },
    }),
    makeSupabaseRow({
      exercise_id: 'bench',
      session_id: 'newer-session',
      set_number: 1,
      weight: 200,
      reps: 5,
      unit: 'lbs',
      estimated_1rm: 250,
      rest_before_seconds: 90,
      progression_event: 'deload',
      created_at: '2026-05-12T12:05:00.000Z',
      completed_at: '2026-05-12T12:05:00.000Z',
      workout_sessions: { started_at: '2026-05-12T12:00:00.000Z' },
    }),
    makeSupabaseRow({
      exercise_id: 'bench',
      session_id: 'older-session',
      set_number: 1,
      weight: 80,
      reps: 10,
      estimated_1rm: 110,
      created_at: '2026-05-08T12:05:00.000Z',
      completed_at: '2026-05-08T12:05:00.000Z',
      workout_sessions: { started_at: '2026-05-08T12:00:00.000Z' },
    }),
    makeSupabaseRow({
      exercise_id: 'squat',
      session_id: 'squat-session',
      set_number: 1,
      weight: 120,
      reps: 5,
      estimated_1rm: null,
      created_at: '2026-05-11T12:05:00.000Z',
      completed_at: '2026-05-11T12:05:00.000Z',
      workout_sessions: { started_at: '2026-05-11T12:00:00.000Z' },
    }),
  ]
}

function createSupabaseMock({ data = [], error = null, data2 = null, error2 = null } = {}) {
  let callCount = 0
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    then: (resolve, reject) => {
      callCount++
      const useSecond = callCount >= 2 && data2 !== null
      return Promise.resolve({
        data: useSecond ? data2 : data,
        error: useSecond ? error2 : error,
      }).then(resolve, reject)
    },
  }
  return {
    supabase: { from: vi.fn(() => builder) },
    builder,
  }
}

describe('getWeightIncrement', () => {
  it('returns equipment increments in kg and converts pound increments to kg', () => {
    expect(getWeightIncrement('Barbell', 'kg')).toBe(2.5)
    expect(getWeightIncrement('Dumbbell', 'lbs')).toBeCloseTo(2.26796, 5)
  })

  it('falls back for unknown equipment', () => {
    expect(getWeightIncrement('Mystery Machine', 'kg')).toBe(2.5)
    expect(getWeightIncrement('Mystery Machine', 'lbs')).toBeCloseTo(2.26796, 5)
  })
})

describe('fetchRecentSessions', () => {
  it('returns empty results without a user or exercise id list', async () => {
    const { supabase } = createSupabaseMock()

    await expect(fetchRecentSessions('', ['bench'], supabase)).resolves.toEqual({})
    await expect(fetchRecentSessions('user-1', [], supabase)).resolves.toEqual({})
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns empty results for empty or errored Supabase responses', async () => {
    await expect(fetchRecentSessions(
      'user-1',
      ['bench'],
      createSupabaseMock({ data: [] }).supabase,
    )).resolves.toEqual({})

    await expect(fetchRecentSessions(
      'user-1',
      ['bench'],
      createSupabaseMock({ error: new Error('network failed') }).supabase,
    )).resolves.toEqual({})
  })

  it('groups sessions, normalizes set rows, and excludes the current session when requested', async () => {
    const fullRows = makeSupabaseRows()
    const indexRows = fullRows.map(({ exercise_id, session_id, created_at }) => ({ exercise_id, session_id, created_at }))
    const { supabase, builder } = createSupabaseMock({ data: indexRows, data2: fullRows })

    const result = await fetchRecentSessions('user-1', ['bench', 'squat'], supabase, 'current-session')

    expect(supabase.from).toHaveBeenCalledWith('workout_sets')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(builder.in).toHaveBeenCalledWith('exercise_id', ['bench', 'squat'])
    expect(builder.neq).toHaveBeenCalledWith('session_id', 'current-session')
    expect(builder.in).toHaveBeenCalledWith('session_id', expect.arrayContaining(['newer-session', 'older-session', 'squat-session']))
    expect(result.bench.map(session => session.sessionId)).toEqual(['older-session', 'newer-session'])
    expect(result.bench[1].sets.map(set => set.set_number)).toEqual([1, 2])
    expect(result.bench[1].sets[0]).toMatchObject({
      weight: 200,
      reps: 5,
      unit: 'lbs',
      estimated_1rm: 250,
      progressionEvent: 'deload',
      rest_before_seconds: 90,
    })
    expect(result.bench[1].sets[0].weightKg).toBeCloseTo(90.7184, 4)
    expect(result.bench[1].sets[0].estimatedOrmKg).toBeCloseTo(113.398, 3)
    expect(result.bench[1].sets[1].estimatedOrmKg).toBeCloseTo(calculateORM(100, 8))
    expect(result.bench[1].sets[1].rest_before_seconds).toBe(0)
    expect(result.squat).toHaveLength(1)
  })
})

describe('buildCurrentSetSuggestion guards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when there are no current sets', () => {
    expect(buildCurrentSetSuggestion(makeSuggestionInput({ currentSets: [] }))).toBeNull()
  })

  it('returns null when all current sets are done', () => {
    expect(buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [{ reps: 8, weight: 100, done: true }],
      sessions: [makeSession(2, [makeSet()])],
    }))).toBeNull()
  })

  it('returns null for first-time work when no beginner fallback is available', () => {
    expect(buildCurrentSetSuggestion(makeSuggestionInput())).toBeNull()
  })

  it('keeps the backward-compatible first-time history result', () => {
    expect(analyzeExerciseHistory([], 'Barbell', 'kg')).toMatchObject({
      action: 'first_time',
      suggestedWeightKg: null,
      suggestedReps: null,
      confidence: 'low',
    })
  })

  it('returns backward-compatible suggestions for non-empty history', () => {
    expect(analyzeExerciseHistory([
      makeSession(4, [makeSet({ reps: 8 })]),
      makeSession(2, [makeSet({ reps: 8 })]),
    ], 'Barbell', 'kg')).toMatchObject({
      action: 'increase_reps',
      suggestedWeightKg: 100,
      suggestedReps: 9,
      confidence: 'low',
      objective: 'hypertrophy',
      isBodyweightOnly: false,
      planMode: 'increase_reps',
    })
  })
})

describe('buildCurrentSetSuggestion progression behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('increases weight after two recent sessions at the top of the plan range', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      sessions: [
        makeSession(4, [makeSet({ reps: 10 })]),
        makeSession(2, [makeSet({ reps: 10 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 0,
      action: 'increase_weight',
      planMode: 'increase_weight',
      suggestedReps: 9,
      isBodyweightOnly: false,
    })
    expect(suggestion.suggestedWeightKg).toBeGreaterThan(100)
  })

  it('increases reps instead of load for bodyweight-only history', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      currentSets: [{ reps: '', weight: 0, done: false }],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 11,
      isBodyweightOnly: true,
    })
  })

  it('deloads after repeated low e1RM sessions in a deload-aware plan', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(5, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(3, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
        makeSession(1, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'deload',
      planMode: 'recovery_week',
      suggestedReps: 9,
      isBodyweightOnly: false,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(80)
  })

  it('does not deload a default weighted plan after only two low e1RM sessions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      sessions: [
        makeSession(5, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(3, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
        makeSession(1, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintain',
      suggestedWeightKg: 80,
      suggestedReps: 8,
    })
    expect(suggestion.reasoning).not.toContain('fell short')
  })

  it('does not immediately trigger another deload after a recent deload event', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(5, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ weightKg: 90, estimatedOrmKg: 90, progressionEvent: 'deload' })]),
        makeSession(2, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintain',
      suggestedReps: 8,
    })
  })

  it('can deload again after enough post-deload low e1RM sessions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(7, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(6, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(5, [makeSet({ weightKg: 90, estimatedOrmKg: 90, progressionEvent: 'deload' })]),
        makeSession(4, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
        makeSession(1, [makeSet({ weightKg: 80, estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'deload',
      planMode: 'recovery_week',
      suggestedReps: 9,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(80)
  })

  it('keeps bodyweight work steady after two low-rep sessions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(5, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(3, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 8, estimatedOrmKg: 100 })]),
        makeSession(1, [makeSet({ weightKg: 0, reps: 8, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintain',
      suggestedWeightKg: 0,
      suggestedReps: 8,
      isBodyweightOnly: true,
    })
    expect(suggestion.reasoning).not.toContain('fell below')
  })

  it('applies the bodyweight post-deload guard before counting low reps again', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(5, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ weightKg: 0, reps: 9, estimatedOrmKg: 100, progressionEvent: 'deload' })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 8, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedWeightKg: 0,
      isBodyweightOnly: true,
    })
    expect(suggestion.reasoning).not.toContain('fell below')
  })
})

describe('buildCurrentSetSuggestion reacclimation behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reduces weight and reps after more than four weeks away', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      sessions: [makeSession(31, [makeSet({ reps: 8 })])],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'reacclimate_reduce_two',
      suggestedReps: 9,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(100)
  })

  it('holds the current target after a short break', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      sessions: [makeSession(10, [makeSet({ reps: 8 })])],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'reacclimate_hold',
      suggestedReps: 8,
      suggestedWeightKg: 100,
    })
  })

  it('does not enter reacclimation mode before the hold threshold', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      sessions: [makeSession(7, [makeSet({ reps: 8 })])],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintain',
      suggestedReps: 8,
    })
  })
})

describe('buildCurrentSetSuggestion active set behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the first incomplete set index', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        { reps: 8, weight: 100, done: true },
        { reps: '', weight: '', done: false },
      ],
      sessions: [
        makeSession(4, [
          makeSet({ setNumber: 1, reps: 8 }),
          makeSet({ setNumber: 2, reps: 8 }),
        ]),
        makeSession(2, [
          makeSet({ setNumber: 1, reps: 8 }),
          makeSet({ setNumber: 2, reps: 8 }),
        ]),
      ],
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedReps: 9,
    })
  })

  it('falls back to prior set history when the active set has no history', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        { reps: 8, weight: 100, done: true },
        { reps: '', weight: '', done: false },
      ],
      sessions: [
        makeSession(4, [makeSet({ setNumber: 1, reps: 8 })]),
        makeSession(2, [makeSet({ setNumber: 1, reps: 8 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedReps: 9,
    })
    expect(suggestion.reasoning).toContain('Using Set 1')
  })
})

describe('buildCurrentSetSuggestion fatigue cascade behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function makeTwoSetHistory(overrides = {}) {
    return [
      makeSession(4, [
        makeSet({ setNumber: 1, ...overrides.set1 }),
        makeSet({ setNumber: 2, ...overrides.set2 }),
      ]),
      makeSession(2, [
        makeSet({ setNumber: 1, ...overrides.set1 }),
        makeSet({ setNumber: 2, ...overrides.set2 }),
      ]),
    ]
  }

  it('reduces weighted Set 2 load after Set 1 underperformance', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 70, done: true }),
        makeCurrentSet(),
      ],
      sessions: makeTwoSetHistory(),
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedReps: 9,
      isBodyweightOnly: false,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(100)
    expect(suggestion.reasoning).toContain('Reduced 5% for carry-over fatigue from Set 1')
  })

  it('keeps weighted Set 2 unchanged when Set 1 meets or beats the target', () => {
    const equalSuggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 100, done: true }),
        makeCurrentSet(),
      ],
      sessions: makeTwoSetHistory(),
    }))
    const overSuggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 110, done: true }),
        makeCurrentSet(),
      ],
      sessions: makeTwoSetHistory(),
    }))

    expect(equalSuggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 100,
      suggestedReps: 9,
    })
    expect(overSuggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 100,
      suggestedReps: 9,
    })
    expect(equalSuggestion.reasoning).not.toContain('carry-over fatigue')
    expect(overSuggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('does not apply weighted fatigue when completed Set 1 data is incomplete', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        makeCurrentSet({ reps: '', weight: '', done: true }),
        makeCurrentSet(),
      ],
      sessions: makeTwoSetHistory(),
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 100,
      suggestedReps: 9,
    })
    expect(suggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('reduces bodyweight Set 2 reps after Set 1 underperformance', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 0, done: true }),
        makeCurrentSet({ weight: 0 }),
      ],
      sessions: makeTwoSetHistory({
        set1: { weightKg: 0, reps: 10, estimatedOrmKg: 100 },
        set2: { weightKg: 0, reps: 10, estimatedOrmKg: 100 },
      }),
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 10,
      isBodyweightOnly: true,
    })
    expect(suggestion.reasoning).toContain('Reduced 5% for carry-over fatigue from Set 1')
  })

  it('keeps bodyweight Set 2 reps when Set 1 meets or beats the target', () => {
    const equalSuggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [
        makeCurrentSet({ reps: 11, weight: 0, done: true }),
        makeCurrentSet({ weight: 0 }),
      ],
      sessions: makeTwoSetHistory({
        set1: { weightKg: 0, reps: 10, estimatedOrmKg: 100 },
        set2: { weightKg: 0, reps: 10, estimatedOrmKg: 100 },
      }),
    }))
    const overSuggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [
        makeCurrentSet({ reps: 12, weight: 0, done: true }),
        makeCurrentSet({ weight: 0 }),
      ],
      sessions: makeTwoSetHistory({
        set1: { weightKg: 0, reps: 10, estimatedOrmKg: 100 },
        set2: { weightKg: 0, reps: 10, estimatedOrmKg: 100 },
      }),
    }))

    expect(equalSuggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 0,
      suggestedReps: 11,
    })
    expect(overSuggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 0,
      suggestedReps: 11,
    })
    expect(equalSuggestion.reasoning).not.toContain('carry-over fatigue')
    expect(overSuggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('keeps bodyweight fatigue reductions above the objective lower bound', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      currentSets: [
        makeCurrentSet({ reps: 1, weight: 0, done: true }),
        makeCurrentSet({ weight: 0 }),
      ],
      sessions: makeTwoSetHistory({
        set1: { weightKg: 0, reps: 8, estimatedOrmKg: 100 },
        set2: { weightKg: 0, reps: 8, estimatedOrmKg: 100 },
      }),
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 0,
      suggestedReps: 8,
      isBodyweightOnly: true,
    })
    expect(suggestion.reasoning).toContain('Reduced 5% for carry-over fatigue from Set 1')
  })
})

describe('buildCurrentSetSuggestion cross-exercise fatigue and e1RM floor behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function makeTenWorkingSets() {
    return Array.from({ length: 10 }, () => ({ reps: 10, weight: 100, setType: 'normal' }))
  }

  function makeFloorHistory({ reps = 8, estimatedOrmKg = 130 } = {}) {
    return [
      makeSession(4, [makeSet({ weightKg: 100, reps, estimatedOrmKg })]),
      makeSession(2, [makeSet({ weightKg: 100, reps, estimatedOrmKg })]),
    ]
  }

  it('reduces first-set load after overlapping prior exercise work', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      priorExercises: [
        makePriorExercise({ doneSets: makeTenWorkingSets() }),
      ],
      currentPrimaryMuscles: ['Chest'],
      currentSecondaryMuscles: ['Triceps'],
      sessions: [
        makeSession(4, [makeSet({ reps: 8 })]),
        makeSession(2, [makeSet({ reps: 8 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 0,
      action: 'increase_reps',
      suggestedReps: 9,
      crossExerciseFatiguePct: 0.08,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(100)
    expect(suggestion.reasoning).toContain('Pre-fatigued 8% from overlapping muscles')
  })

  it('ignores non-overlapping and warmup-only prior exercise work', () => {
    const nonOverlapping = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      priorExercises: [
        makePriorExercise({
          doneSets: makeTenWorkingSets(),
          primaryMuscles: ['Quads'],
          secondaryMuscles: [],
        }),
      ],
      currentPrimaryMuscles: ['Chest'],
      currentSecondaryMuscles: ['Triceps'],
      sessions: [
        makeSession(4, [makeSet({ reps: 8 })]),
        makeSession(2, [makeSet({ reps: 8 })]),
      ],
    }))
    const warmupOnly = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      priorExercises: [
        makePriorExercise({
          doneSets: [{ reps: 10, weight: 100, setType: 'warmup' }],
        }),
      ],
      currentPrimaryMuscles: ['Chest'],
      currentSecondaryMuscles: ['Triceps'],
      sessions: [
        makeSession(4, [makeSet({ reps: 8 })]),
        makeSession(2, [makeSet({ reps: 8 })]),
      ],
    }))

    expect(nonOverlapping).toMatchObject({
      suggestedWeightKg: 100,
      crossExerciseFatiguePct: 0,
    })
    expect(warmupOnly).toMatchObject({
      suggestedWeightKg: 100,
      crossExerciseFatiguePct: 0,
    })
    expect(nonOverlapping.reasoning).not.toContain('Pre-fatigued')
    expect(warmupOnly.reasoning).not.toContain('Pre-fatigued')
  })

  it('corrects cross-exercise fatigue downward when Set 1 beats the adjusted suggestion', () => {
    const sharedInput = {
      equipment: 'Machine',
      priorExercises: [
        makePriorExercise({ doneSets: makeTenWorkingSets() }),
      ],
      currentPrimaryMuscles: ['Chest'],
      currentSecondaryMuscles: ['Triceps'],
      sessions: [
        makeSession(4, [
          makeSet({ setNumber: 1, reps: 8 }),
          makeSet({ setNumber: 2, reps: 8 }),
        ]),
        makeSession(2, [
          makeSet({ setNumber: 1, reps: 8 }),
          makeSet({ setNumber: 2, reps: 8 }),
        ]),
      ],
    }
    const underperformed = buildCurrentSetSuggestion(makeSuggestionInput({
      ...sharedInput,
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 70, done: true }),
        makeCurrentSet(),
      ],
    }))
    const overperformed = buildCurrentSetSuggestion(makeSuggestionInput({
      ...sharedInput,
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 130, done: true }),
        makeCurrentSet(),
      ],
    }))

    expect(underperformed.crossExerciseFatiguePct).toBeCloseTo(0.08)
    expect(overperformed.crossExerciseFatiguePct).toBeLessThan(underperformed.crossExerciseFatiguePct)
  })

  it('raises reps to preserve the expected e1RM floor', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      planProgressionBias: 'maintenance',
      sessions: makeFloorHistory({ reps: 8, estimatedOrmKg: 130 }),
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintenance',
      suggestedWeightKg: 100,
    })
    expect(suggestion.suggestedReps).toBeGreaterThan(8)
    expect(suggestion.reasoning).toContain('Adjusted to maintain your expected 1RM')
  })

  it('raises load when reps cannot preserve the expected e1RM floor', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      planProgressionBias: 'maintenance',
      sessions: makeFloorHistory({ reps: 6, estimatedOrmKg: 123 }),
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintenance',
      suggestedReps: 6,
    })
    expect(suggestion.suggestedWeightKg).toBeGreaterThan(100)
    expect(suggestion.reasoning).toContain('Adjusted to maintain your expected 1RM')
  })

  it('skips the e1RM floor adjustment in explicit plan mode', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      planRepRange: '8-10',
      planProgressionBias: 'maintenance',
      sessions: makeFloorHistory({ reps: 8, estimatedOrmKg: 130 }),
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintenance',
      suggestedReps: 8,
    })
    expect(suggestion.reasoning).not.toContain('Adjusted to maintain your expected 1RM')
  })
})
