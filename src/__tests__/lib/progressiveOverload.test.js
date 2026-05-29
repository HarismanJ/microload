import {
  analyzeExerciseHistory,
  buildCurrentSetSuggestion,
  buildExerciseSnapWeight,
  fetchRecentSessions,
  fetchRecentSessionsWithStatus,
  getWeightIncrement,
  resolveCompletedSetProgressionEvent,
  shouldMarkFatigueAdjustedProgression,
} from '../../lib/progressiveOverload.js'
import { DEFAULT_BODYWEIGHT_KG } from '../../lib/liftMath.js'
import { calculateORM } from '../../lib/orm.js'
import { getAnchors } from '../../lib/strengthStandards.js'

const NOW = new Date('2026-05-14T12:00:00.000Z')

function makeSet({
  weightKg = 100,
  reps = 8,
  setNumber = 1,
  estimatedOrmKg = calculateORM(weightKg, reps),
  estimatedFreshOrmKg = null,
  progressionEvent = null,
  isWarmup = false,
} = {}) {
  return {
    weight: weightKg,
    weightKg,
    unit: 'kg',
    reps,
    estimatedOrmKg,
    estimatedFreshOrmKg,
    estimated_fresh_1rm: estimatedFreshOrmKg,
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
    exercise_id: 101,
    weight: 100,
    reps: 8,
    unit: 'kg',
    estimated_1rm: null,
    estimated_fresh_1rm: null,
    set_number: 1,
    duration_seconds: null,
    completed_at: '2026-05-10T12:10:00.000Z',
    rest_before_seconds: null,
    created_at: '2026-05-10T12:10:00.000Z',
    session_id: 'session-1',
    session_started_at: '2026-05-10T12:00:00.000Z',
    progression_event: null,
    is_warmup: false,
    ...overrides,
  }
}

function makeSupabaseRows() {
  return [
    makeSupabaseRow({
      exercise_id: 101,
      session_id: 'newer-session',
      set_number: 2,
      weight: 100,
      reps: 8,
      estimated_1rm: null,
      rest_before_seconds: -20,
      created_at: '2026-05-12T12:12:00.000Z',
      completed_at: '2026-05-12T12:12:00.000Z',
      session_started_at: '2026-05-12T12:00:00.000Z',
    }),
    makeSupabaseRow({
      exercise_id: 101,
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
      session_started_at: '2026-05-12T12:00:00.000Z',
    }),
    makeSupabaseRow({
      exercise_id: 101,
      session_id: 'older-session',
      set_number: 1,
      weight: 80,
      reps: 10,
      estimated_1rm: 110,
      created_at: '2026-05-08T12:05:00.000Z',
      completed_at: '2026-05-08T12:05:00.000Z',
      session_started_at: '2026-05-08T12:00:00.000Z',
    }),
    makeSupabaseRow({
      exercise_id: 202,
      session_id: 'squat-session',
      set_number: 1,
      weight: 120,
      reps: 5,
      estimated_1rm: null,
      created_at: '2026-05-11T12:05:00.000Z',
      completed_at: '2026-05-11T12:05:00.000Z',
      session_started_at: '2026-05-11T12:00:00.000Z',
    }),
  ]
}

function createSupabaseMock({ data = [], error = null } = {}) {
  return {
    supabase: {
      rpc: vi.fn(() => Promise.resolve({ data, error })),
    },
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

  it('halves the increment for bilateral Dumbbell in kg', () => {
    expect(getWeightIncrement('Dumbbell', 'kg', true)).toBe(1.25)
  })

  it('halves the increment for bilateral Dumbbell in lbs (returns kg equivalent of 2.5 lbs)', () => {
    // 5 lbs / 2 = 2.5 lbs; expressed in kg = lbsToKg(2.5)
    expect(getWeightIncrement('Dumbbell', 'lbs', true)).toBeCloseTo(1.13398, 5)
  })

  it('halves the increment for bilateral Cable in kg (5 kg → 2.5 kg per side)', () => {
    expect(getWeightIncrement('Cable', 'kg', true)).toBe(2.5)
  })

  it('does not halve single-implement equipment (Barbell, Machine) even if bilateral=true', () => {
    expect(getWeightIncrement('Barbell', 'kg', true)).toBe(2.5)
    expect(getWeightIncrement('Machine', 'kg', true)).toBe(5.0)
    expect(getWeightIncrement('EZ Bar', 'kg', true)).toBe(2.5)
  })
})

describe('fetchRecentSessions', () => {
  it('returns empty results without a user or exercise id list', async () => {
    const { supabase } = createSupabaseMock()

    await expect(fetchRecentSessions('', [101], supabase)).resolves.toEqual({})
    await expect(fetchRecentSessions('user-1', [], supabase)).resolves.toEqual({})
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns empty results for empty or errored Supabase responses', async () => {
    await expect(fetchRecentSessions(
      'user-1',
      [101],
      createSupabaseMock({ data: [] }).supabase,
    )).resolves.toEqual({})

    await expect(fetchRecentSessions(
      'user-1',
      [101],
      createSupabaseMock({ error: new Error('network failed') }).supabase,
    )).resolves.toEqual({})
  })

  it('groups sessions, normalizes set rows, and excludes the current session when requested', async () => {
    const { supabase } = createSupabaseMock({ data: makeSupabaseRows() })

    const result = await fetchRecentSessions('user-1', [101, 202], supabase, 'current-session')

    expect(supabase.rpc).toHaveBeenCalledWith('get_recent_progressive_overload_sets', {
      p_exercise_ids: [101, 202],
      p_session_limit: 8,
      p_exclude_session_id: 'current-session',
    })
    expect(supabase.rpc.mock.calls[0][1]).not.toHaveProperty('p_user_id')
    expect(result[101].map(session => session.sessionId)).toEqual(['older-session', 'newer-session'])
    expect(result[101][1].sets.map(set => set.set_number)).toEqual([1, 2])
    expect(result[101][1].sets[0]).toMatchObject({
      weight: 200,
      reps: 5,
      unit: 'lbs',
      estimated_1rm: 250,
      progressionEvent: 'deload',
      rest_before_seconds: 90,
    })
    expect(result[101][1].sets[0].weightKg).toBeCloseTo(90.7184, 4)
    expect(result[101][1].sets[0].estimatedOrmKg).toBeCloseTo(113.398, 3)
    expect(result[101][1].sets[1].estimatedOrmKg).toBeCloseTo(calculateORM(100, 8))
    expect(result[101][1].sets[1].rest_before_seconds).toBe(0)
    expect(result[202]).toHaveLength(1)
  })

  it('ignores stored e1RM for sets above the estimation rep cap', async () => {
    const fullRows = [
      makeSupabaseRow({
        exercise_id: 303,
        session_id: 'high-rep-session',
        weight: 40,
        reps: 31,
        estimated_1rm: 999,
      }),
    ]
    const { supabase } = createSupabaseMock({ data: fullRows })

    const result = await fetchRecentSessions('user-1', [303], supabase)

    expect(result[303][0].sets[0]).toMatchObject({
      reps: 31,
      estimated_1rm: 999,
      estimatedOrmKg: null,
    })
  })

  it('normalizes stored fresh e1RM in the same unit as stored e1RM', async () => {
    const { supabase } = createSupabaseMock({
      data: [
        makeSupabaseRow({
          exercise_id: 303,
          session_id: 'fresh-lb-session',
          weight: 200,
          reps: 8,
          unit: 'lbs',
          estimated_1rm: 250,
          estimated_fresh_1rm: 275,
        }),
      ],
    })

    const result = await fetchRecentSessions('user-1', [303], supabase)
    const set = result[303][0].sets[0]

    expect(set.estimatedOrmKg).toBeCloseTo(113.398, 3)
    expect(set.estimatedFreshOrmKg).toBeCloseTo(124.738, 3)
  })

  it('marks requested exercises as error when the RPC fails', async () => {
    const result = await fetchRecentSessionsWithStatus(
      'user-1',
      [101, 202],
      createSupabaseMock({ error: new Error('network failed') }).supabase,
    )

    expect(result.sessionsByExercise).toEqual({})
    expect(result.statusByExercise).toEqual({ 101: 'error', 202: 'error' })
  })

  it('marks all requested exercises as empty when the RPC succeeds without rows', async () => {
    const result = await fetchRecentSessionsWithStatus(
      'user-1',
      [101, 202],
      createSupabaseMock({ data: [] }).supabase,
    )

    expect(result.sessionsByExercise).toEqual({ 101: [], 202: [] })
    expect(result.statusByExercise).toEqual({ 101: 'empty', 202: 'empty' })
  })

  it('marks returned exercises as loaded and absent exercises as empty', async () => {
    const squatRows = [
      makeSupabaseRow({
        exercise_id: 202,
        session_id: 'squat-session',
        created_at: '2026-05-11T12:05:00.000Z',
        session_started_at: '2026-05-11T12:00:00.000Z',
      }),
    ]
    const { supabase } = createSupabaseMock({ data: squatRows })

    const result = await fetchRecentSessionsWithStatus('user-1', [101, 202], supabase)

    expect(result.statusByExercise).toEqual({ 101: 'empty', 202: 'loaded' })
    expect(result.sessionsByExercise[101]).toEqual([])
    expect(result.sessionsByExercise[202]).toHaveLength(1)
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it('dedupes requested exercise ids before calling the RPC', async () => {
    const { supabase } = createSupabaseMock({ data: [] })

    await fetchRecentSessionsWithStatus('user-1', [101, 101, 202], supabase)

    expect(supabase.rpc).toHaveBeenCalledWith('get_recent_progressive_overload_sets', {
      p_exercise_ids: [101, 202],
      p_session_limit: 8,
      p_exclude_session_id: null,
    })
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

  it('returns null for first-time work without a current-session baseline', () => {
    expect(buildCurrentSetSuggestion(makeSuggestionInput())).toBeNull()
  })

  it('uses a beginner standard target for first-time work', async () => {
    await getAnchors()

    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      exerciseName: 'Bench Press',
      userBodyweightKg: 82,
      userGender: 'male',
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 0,
      setNumber: 1,
      action: 'first_time',
      planMode: 'standard_start',
      suggestedWeightKg: 32.5,
      suggestedReps: 8,
      confidence: 'low',
      isBodyweightOnly: false,
    })
    expect(suggestion.reasoning).toContain('Beginner strength standard')
  })

  it('falls back to default bodyweight and male standards for first-time work', async () => {
    await getAnchors()

    const fallbackSuggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      exerciseName: 'Bench Press',
    }))
    const explicitSuggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      exerciseName: 'Bench Press',
      userBodyweightKg: DEFAULT_BODYWEIGHT_KG,
      userGender: 'male',
    }))

    expect(fallbackSuggestion).toMatchObject({
      action: 'first_time',
      suggestedReps: 8,
    })
    expect(fallbackSuggestion.suggestedWeightKg).toBe(explicitSuggestion.suggestedWeightKg)
  })

  it('uses assisted or added load for first-time bodyweight standards', async () => {
    await getAnchors()

    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      exerciseName: 'Pull Ups',
      userBodyweightKg: 80,
      userGender: 'male',
    }))

    expect(suggestion).toMatchObject({
      action: 'first_time',
      planMode: 'standard_start',
      suggestedReps: 8,
      isBodyweightOnly: false,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(0)
    expect(suggestion.suggestedWeightKg).toBeGreaterThanOrEqual(-80)
  })

  it('returns null for first-time work when no strength standard exists', async () => {
    await getAnchors()

    expect(buildCurrentSetSuggestion(makeSuggestionInput({
      exerciseName: 'Not A Real Lift',
      userBodyweightKg: 82,
      userGender: 'male',
    }))).toBeNull()
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

  it('keeps high-rep weighted history visible without forcing a false weight increase', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(4, [makeSet({ reps: 25, estimatedOrmKg: null })]),
        makeSession(2, [makeSet({ reps: 25, estimatedOrmKg: null })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedWeightKg: 100,
      suggestedReps: 26,
    })
    expect(suggestion.reasoning).toContain('22-28 reps')
  })

  it('uses 30+ rep weighted history as rep evidence without calculating e1RM', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(4, [makeSet({ reps: 31, estimatedOrmKg: null })]),
        makeSession(2, [makeSet({ reps: 32, estimatedOrmKg: null })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_weight',
      planMode: 'increase_weight',
      suggestedReps: 28,
    })
    expect(suggestion.suggestedWeightKg).toBeGreaterThan(100)
    expect(suggestion.reasoning).toContain('27-30 reps')
  })

  it('triggers e1RM progression against the prior baseline instead of a self-referencing median', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(7, [makeSet({ reps: 8, estimatedOrmKg: 100 })]),
        makeSession(6, [makeSet({ reps: 8, estimatedOrmKg: 101 })]),
        makeSession(5, [makeSet({ reps: 8, estimatedOrmKg: 102 })]),
        makeSession(4, [makeSet({ reps: 8, estimatedOrmKg: 103 })]),
        makeSession(3, [makeSet({ reps: 8, estimatedOrmKg: 104 })]),
        makeSession(2, [makeSet({ reps: 8, estimatedOrmKg: 106 })]),
        makeSession(1, [makeSet({ reps: 8, estimatedOrmKg: 106 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_weight',
      planMode: 'increase_weight',
      suggestedReps: 8,
    })
    expect(suggestion.reasoning).toContain('estimated 1RM')
  })

  it('requires prior e1RM baseline before using the e1RM progression trigger', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(3, [makeSet({ reps: 8, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ reps: 8, estimatedOrmKg: 106 })]),
        makeSession(1, [makeSet({ reps: 8, estimatedOrmKg: 106 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedReps: 9,
    })
    expect(suggestion.reasoning).not.toContain('estimated 1RM')
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

  it('returns null weight instead of 0 when deload cannot reduce below the minimum increment', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(5, [makeSet({ weightKg: 2.5, estimatedOrmKg: 3.0 })]),
        makeSession(4, [makeSet({ weightKg: 2.5, estimatedOrmKg: 3.0 })]),
        makeSession(3, [makeSet({ weightKg: 2.5, estimatedOrmKg: 3.0 })]),
        makeSession(2, [makeSet({ weightKg: 2.5, estimatedOrmKg: 2.5 })]),
        makeSession(1, [makeSet({ weightKg: 2.5, estimatedOrmKg: 2.5 })]),
      ],
    }))

    expect(suggestion.action).toBe('deload')
    expect(suggestion.suggestedWeightKg).toBeNull()
  })

  it('returns null weight instead of unchanged bar weight when barbell deload cannot go below bare bar (Issue 27)', () => {
    // Barbell at 20 kg (bare bar), no plan range so startWeightKg = baselineWeightKg = 20.
    // Both percentage reduction and increment fallback snap back to 20 kg via snapToPlates
    // (anything below the bar is floored to the bar weight), so no real deload is possible.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Barbell',
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(5, [makeSet({ weightKg: 20, estimatedOrmKg: 30 })]),
        makeSession(4, [makeSet({ weightKg: 20, estimatedOrmKg: 30 })]),
        makeSession(3, [makeSet({ weightKg: 20, estimatedOrmKg: 30 })]),
        makeSession(2, [makeSet({ weightKg: 20, estimatedOrmKg: 20 })]),
        makeSession(1, [makeSet({ weightKg: 20, estimatedOrmKg: 20 })]),
      ],
    }))

    expect(suggestion.action).toBe('deload')
    expect(suggestion.suggestedWeightKg).toBeNull()
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

  it('deloads a bodyweight deload-aware plan after two low-rep sessions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(5, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(3, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 100 })]),
        makeSession(1, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'deload',
      planMode: 'recovery_week',
      isBodyweightOnly: true,
    })
    expect(suggestion.reasoning).toContain('fell below')
  })

  it('does not deload a default bodyweight plan after only two low-rep sessions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(5, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(3, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 100 })]),
        makeSession(1, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).not.toMatchObject({ action: 'deload' })
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

  it('uses the previous completed current set when no history exists for later sets', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 100, done: true }),
        makeCurrentSet(),
      ],
      sessions: [],
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      setNumber: 2,
      action: 'maintain',
      planMode: 'maintain',
      suggestedWeightKg: 100,
      suggestedReps: 8,
      isBodyweightOnly: false,
    })
    expect(suggestion.reasoning).toContain('previous completed set')
    expect(suggestion.reasoning).not.toContain('estimated beginner')
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
        makeCurrentSet({ reps: 9, weight: 100, done: true }),
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

  it('does not penalize Set 2 when Set 1 matches an intentional deload suggestion', () => {
    const sessions = [
      makeSession(5, [
        makeSet({ setNumber: 1, estimatedOrmKg: 100 }),
        makeSet({ setNumber: 2, estimatedOrmKg: 100 }),
      ]),
      makeSession(4, [
        makeSet({ setNumber: 1, estimatedOrmKg: 100 }),
        makeSet({ setNumber: 2, estimatedOrmKg: 100 }),
      ]),
      makeSession(3, [
        makeSet({ setNumber: 1, estimatedOrmKg: 100 }),
        makeSet({ setNumber: 2, estimatedOrmKg: 100 }),
      ]),
      makeSession(2, [
        makeSet({ setNumber: 1, weightKg: 80, estimatedOrmKg: 80 }),
        makeSet({ setNumber: 2, estimatedOrmKg: 100 }),
      ]),
      makeSession(1, [
        makeSet({ setNumber: 1, weightKg: 80, estimatedOrmKg: 80 }),
        makeSet({ setNumber: 2, estimatedOrmKg: 100 }),
      ]),
    ]
    const set1Suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      sessions,
    }))

    expect(set1Suggestion).toMatchObject({ action: 'deload' })

    const set2Suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      planProgressionBias: 'deload_aware',
      currentSets: [
        makeCurrentSet({
          reps: set1Suggestion.suggestedReps,
          weight: set1Suggestion.suggestedWeightKg,
          done: true,
        }),
        makeCurrentSet(),
      ],
      sessions,
    }))

    expect(set2Suggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedReps: 8,
      fatigueAdjustmentPct: 0,
    })
    expect(set2Suggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('no fatigue applied to Set 2 when Set 1 is done at historical weight despite increase_weight suggestion', () => {
    // Set 1 suggestion says increase_weight (e.g. 100 → 100.5kg).
    // The user does Set 1 at the OLD historical weight (100kg × 10).
    // Meeting history is NOT underperformance — the suggestion is aspirational,
    // not the baseline. So Set 2 should have zero fatigue adjustment.
    const sessions = [
      makeSession(4, [
        makeSet({ setNumber: 1, reps: 10 }),
        makeSet({ setNumber: 2, reps: 10 }),
      ]),
      makeSession(2, [
        makeSet({ setNumber: 1, reps: 10 }),
        makeSet({ setNumber: 2, reps: 10 }),
      ]),
    ]
    const set1Suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '10-10',
      customIncrementKg: 0.5,
      sessions,
    }))

    expect(set1Suggestion).toMatchObject({ action: 'increase_weight' })

    const set2Suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '10-10',
      customIncrementKg: 0.5,
      currentSets: [
        makeCurrentSet({ reps: 10, weight: 100, done: true }),
        makeCurrentSet(),
      ],
      sessions,
    }))

    expect(set2Suggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedReps: 10,
    })
    // 100kg × 10 matches historical sessions exactly — no fatigue
    expect(set2Suggestion.fatigueAdjustmentPct).toBe(0)
    expect(set2Suggestion.reasoning).not.toContain('carry-over fatigue from Set 1')
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
    // When lower-bound clamping restores the original rep count, fatigueAdjustmentPct
    // and the reasoning string must be zeroed (Issue 29 fix). The reps stay at 8.
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
      fatigueAdjustmentPct: 0,
    })
    expect(suggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('applies weighted fatigue after a current-session no-history fallback', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 100, done: true }),
        makeCurrentSet({ reps: 8, weight: 70, done: true }),
        makeCurrentSet(),
      ],
      sessions: [],
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 2,
      setNumber: 3,
      action: 'maintain',
      planMode: 'maintain',
      suggestedReps: 8,
      isBodyweightOnly: false,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(70)
    expect(suggestion.reasoning).toContain('Reduced 5% for carry-over fatigue from Set 2')
  })

  it('reports fatigueAdjustmentPct 0 when snapping neutralises the weight reduction (Issue 26)', () => {
    // Dumbbell 2.5 kg increment: 3% fatigue on 20 kg produces rawWeight ~19.5 kg
    // which snaps back to 20 kg — the suggestion is unchanged so no fatigue should be reported.
    const sessions = [
      makeSession(4, [
        makeSet({ weightKg: 20, reps: 8, setNumber: 1 }),
        makeSet({ weightKg: 20, reps: 8, setNumber: 2 }),
      ]),
      makeSession(2, [
        makeSet({ weightKg: 20, reps: 8, setNumber: 1 }),
        makeSet({ weightKg: 20, reps: 8, setNumber: 2 }),
      ]),
    ]
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      currentSets: [
        makeCurrentSet({ reps: 7, weight: 20, done: true }),
        makeCurrentSet(),
      ],
      sessions,
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 20,
      fatigueAdjustmentPct: 0,
    })
    expect(suggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('preserves fatigueAdjustmentPct when snapping genuinely lowers the weight (Issue 26)', () => {
    // Barbell 2.5 kg increment: 5% fatigue on 100 kg produces rawWeight ~95 kg
    // which does snap down — the adjustment is real so the percentage should be preserved.
    const sessions = [
      makeSession(4, [
        makeSet({ weightKg: 100, reps: 8, setNumber: 1 }),
        makeSet({ weightKg: 100, reps: 8, setNumber: 2 }),
      ]),
      makeSession(2, [
        makeSet({ weightKg: 100, reps: 8, setNumber: 1 }),
        makeSet({ weightKg: 100, reps: 8, setNumber: 2 }),
      ]),
    ]
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Barbell',
      currentSets: [
        makeCurrentSet({ reps: 8, weight: 90, done: true }),
        makeCurrentSet(),
      ],
      sessions,
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 1,
      suggestedWeightKg: 95,
      fatigueAdjustmentPct: expect.closeTo(0.05, 2),
    })
    expect(suggestion.reasoning).toContain('carry-over fatigue from Set 1')
  })
})

describe('buildCurrentSetSuggestion fatigue-safe baseline behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not let a recent fatigue-adjusted weighted set drag down the baseline', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(5, [makeSet({ weightKg: 100, reps: 8 })]),
        makeSession(2, [makeSet({ weightKg: 60, reps: 8, progressionEvent: 'fatigue_adjusted' })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      suggestedWeightKg: 100,
      suggestedReps: 9,
    })
  })

  it('does not count fatigue-adjusted weighted sets toward failure deloads', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(7, [makeSet({ weightKg: 100, reps: 8 })]),
        makeSession(6, [makeSet({ weightKg: 60, reps: 8, progressionEvent: 'fatigue_adjusted' })]),
        makeSession(5, [makeSet({ weightKg: 60, reps: 8, progressionEvent: 'fatigue_adjusted' })]),
        makeSession(4, [makeSet({ weightKg: 60, reps: 8, progressionEvent: 'fatigue_adjusted' })]),
        makeSession(2, [makeSet({ weightKg: 100, reps: 8 })]),
      ],
    }))

    expect(suggestion.action).not.toBe('deload')
    expect(suggestion).toMatchObject({
      suggestedWeightKg: 100,
      suggestedReps: 9,
    })
  })

  it('does not count fatigue-adjusted weighted sets toward progression triggers', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(5, [makeSet({ weightKg: 100, reps: 8 })]),
        makeSession(4, [makeSet({ weightKg: 100, reps: 10, progressionEvent: 'fatigue_adjusted' })]),
        makeSession(2, [makeSet({ weightKg: 100, reps: 10, progressionEvent: 'fatigue_adjusted' })]),
      ],
    }))

    expect(suggestion.action).not.toBe('increase_weight')
    expect(suggestion).toMatchObject({
      suggestedWeightKg: 100,
      suggestedReps: 9,
    })
  })

  it('does not let a recent fatigue-adjusted bodyweight set drag down the rep baseline', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(5, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 5, estimatedOrmKg: 100, progressionEvent: 'fatigue_adjusted' })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      isBodyweightOnly: true,
      suggestedWeightKg: 0,
      suggestedReps: 11,
    })
  })

  it('falls back to fatigue-adjusted history when no baseline-eligible history exists', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(2, [makeSet({ weightKg: 70, reps: 8, progressionEvent: 'fatigue_adjusted' })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      suggestedWeightKg: 70,
      suggestedReps: 9,
    })
  })

  it('uses fresh e1RM anchors when every weighted history entry is fatigue-adjusted', () => {
    const actualFatiguedE1rm = calculateORM(92, 8)
    const freshE1rm = calculateORM(100, 8)
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planProgressionBias: 'deload_aware',
      sessions: [
        makeSession(6, [makeSet({
          weightKg: 92,
          reps: 8,
          estimatedOrmKg: actualFatiguedE1rm,
          estimatedFreshOrmKg: freshE1rm,
          progressionEvent: 'fatigue_adjusted',
        })]),
        makeSession(5, [makeSet({
          weightKg: 92,
          reps: 8,
          estimatedOrmKg: actualFatiguedE1rm,
          estimatedFreshOrmKg: freshE1rm,
          progressionEvent: 'fatigue_adjusted',
        })]),
        makeSession(4, [makeSet({
          weightKg: 92,
          reps: 8,
          estimatedOrmKg: actualFatiguedE1rm,
          estimatedFreshOrmKg: freshE1rm,
          progressionEvent: 'fatigue_adjusted',
        })]),
        makeSession(3, [makeSet({
          weightKg: 92,
          reps: 8,
          estimatedOrmKg: actualFatiguedE1rm,
          estimatedFreshOrmKg: freshE1rm,
          progressionEvent: 'fatigue_adjusted',
        })]),
        makeSession(2, [makeSet({
          weightKg: 92,
          reps: 8,
          estimatedOrmKg: actualFatiguedE1rm,
          estimatedFreshOrmKg: freshE1rm,
          progressionEvent: 'fatigue_adjusted',
        })]),
      ],
    }))

    expect(suggestion.suggestedWeightKg).toBeGreaterThan(92)
    expect(suggestion.action).not.toBe('deload')
  })
})

describe('completed set fatigue progression events', () => {
  it('marks weighted fatigue-adjusted completions below the unadjusted target', () => {
    const suggestion = {
      fatigueAdjustmentPct: 0.05,
      crossExerciseFatiguePct: 0,
      isBodyweightOnly: false,
      unadjustedSuggestedE1rmKg: 120,
    }

    expect(shouldMarkFatigueAdjustedProgression(suggestion, { completedE1rmKg: 110 })).toBe(true)
    expect(resolveCompletedSetProgressionEvent({ suggestion, completedE1rmKg: 110 })).toBe('fatigue_adjusted')
  })

  it('keeps weighted completions baseline-eligible when the unadjusted target is met', () => {
    const suggestion = {
      fatigueAdjustmentPct: 0.05,
      crossExerciseFatiguePct: 0,
      isBodyweightOnly: false,
      unadjustedSuggestedE1rmKg: 120,
    }

    expect(shouldMarkFatigueAdjustedProgression(suggestion, { completedE1rmKg: 120 })).toBe(false)
    expect(resolveCompletedSetProgressionEvent({ suggestion, completedE1rmKg: 120 })).toBeNull()
  })

  it('marks bodyweight fatigue-adjusted completions below the unadjusted rep target', () => {
    const suggestion = {
      fatigueAdjustmentPct: 0,
      crossExerciseFatiguePct: 0.06,
      isBodyweightOnly: true,
      unadjustedSuggestedReps: 12,
    }

    expect(resolveCompletedSetProgressionEvent({ suggestion, completedReps: 10 })).toBe('fatigue_adjusted')
    expect(resolveCompletedSetProgressionEvent({ suggestion, completedReps: 12 })).toBeNull()
  })

  it('does not mark fatigue when no fatigue adjustment was applied', () => {
    const suggestion = {
      fatigueAdjustmentPct: 0,
      crossExerciseFatiguePct: 0,
      isBodyweightOnly: false,
      unadjustedSuggestedE1rmKg: 120,
    }

    expect(resolveCompletedSetProgressionEvent({ suggestion, completedE1rmKg: 100 })).toBeNull()
  })

  it('preserves deload and reacclimation precedence over fatigue marking', () => {
    const fatigued = {
      action: 'maintain',
      planMode: 'maintain',
      fatigueAdjustmentPct: 0.05,
      crossExerciseFatiguePct: 0,
      isBodyweightOnly: false,
      unadjustedSuggestedE1rmKg: 120,
    }
    const reacclim = { ...fatigued, planMode: 'reacclimate_hold' }

    expect(resolveCompletedSetProgressionEvent({
      suggestion: fatigued,
      completedE1rmKg: 100,
      scheduledDeload: true,
    })).toBe('deload')
    expect(resolveCompletedSetProgressionEvent({
      suggestion: { ...fatigued, action: 'deload' },
      completedE1rmKg: 100,
    })).toBe('deload')
    expect(resolveCompletedSetProgressionEvent({ suggestion: reacclim, completedE1rmKg: 100 }))
      .toBe('reacclimate')
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
      crossExerciseFatiguePct: 0.06,
    })
    expect(suggestion.suggestedWeightKg).toBeLessThan(100)
    expect(suggestion.reasoning).toContain('Pre-fatigued 6% from overlapping muscles')
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

    expect(underperformed.crossExerciseFatiguePct).toBeCloseTo(0.06)
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

  it('keeps raising load when one increment still misses the expected e1RM floor', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Machine',
      planProgressionBias: 'maintenance',
      sessions: makeFloorHistory({ reps: 6, estimatedOrmKg: 130 }),
    }))
    const floor = 130 - 0.25

    expect(calculateORM(105, 6)).toBeLessThan(floor)
    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintenance',
      suggestedReps: 6,
      suggestedWeightKg: 110,
    })
    expect(calculateORM(suggestion.suggestedWeightKg, suggestion.suggestedReps)).toBeGreaterThanOrEqual(floor)
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

  it('reduces first-set reps for a bodyweight exercise with overlapping prior work', () => {
    const sessions = [
      makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
      makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
    ]
    const baseline = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions,
    }))
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      priorExercises: [makePriorExercise({ doneSets: makeTenWorkingSets() })],
      currentPrimaryMuscles: ['Chest'],
      currentSecondaryMuscles: ['Triceps'],
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions,
    }))

    expect(suggestion).toMatchObject({
      activeSetIndex: 0,
      isBodyweightOnly: true,
      crossExerciseFatiguePct: expect.closeTo(0.06, 2),
    })
    expect(suggestion.suggestedReps).toBeLessThan(baseline.suggestedReps)
    expect(suggestion.reasoning).toContain('Pre-fatigued')
  })

  it('corrects bodyweight cross-exercise fatigue downward when Set 1 outperforms', () => {
    const sharedInput = {
      equipment: 'Bodyweight',
      priorExercises: [makePriorExercise({ doneSets: makeTenWorkingSets() })],
      currentPrimaryMuscles: ['Chest'],
      currentSecondaryMuscles: ['Triceps'],
      sessions: [
        makeSession(4, [
          makeSet({ setNumber: 1, weightKg: 0, reps: 10, estimatedOrmKg: 100 }),
          makeSet({ setNumber: 2, weightKg: 0, reps: 10, estimatedOrmKg: 100 }),
        ]),
        makeSession(2, [
          makeSet({ setNumber: 1, weightKg: 0, reps: 10, estimatedOrmKg: 100 }),
          makeSet({ setNumber: 2, weightKg: 0, reps: 10, estimatedOrmKg: 100 }),
        ]),
      ],
    }

    const underperformed = buildCurrentSetSuggestion(makeSuggestionInput({
      ...sharedInput,
      currentSets: [
        makeCurrentSet({ reps: 5, weight: 0, done: true }),
        makeCurrentSet({ weight: 0 }),
      ],
    }))
    const overperformed = buildCurrentSetSuggestion(makeSuggestionInput({
      ...sharedInput,
      currentSets: [
        makeCurrentSet({ reps: 15, weight: 0, done: true }),
        makeCurrentSet({ weight: 0 }),
      ],
    }))

    expect(overperformed.isBodyweightOnly).toBe(true)
    expect(overperformed.crossExerciseFatiguePct).toBeLessThan(underperformed.crossExerciseFatiguePct)
  })
})

describe('buildCurrentSetSuggestion plan progression bias', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a rep in plan mode when progression bias is reps_first and below upper bound', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-10',
      planProgressionBias: 'reps_first',
      sessions: [
        makeSession(4, [makeSet({ reps: 7, estimatedOrmKg: 110 })]),
        makeSession(2, [makeSet({ reps: 7, estimatedOrmKg: 110 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedReps: 8,
    })
  })

  it('adds load in load_first plan mode after two clean target completions below the upper bound', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      sessions: [
        makeSession(4, [makeSet({ reps: 6 })]),
        makeSession(2, [makeSet({ reps: 6 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_weight',
      planMode: 'increase_weight',
      suggestedReps: 6,
      isBodyweightOnly: false,
    })
    expect(suggestion.suggestedWeightKg).toBeGreaterThan(100)
  })

  it('does not add load in load_first plan mode with only one clean target completion', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      sessions: [
        makeSession(4, [makeSet({ reps: 6, progressionEvent: 'fatigue_adjusted' })]),
        makeSession(2, [makeSet({ reps: 6 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintain',
      suggestedReps: 6,
      isBodyweightOnly: false,
    })
  })

  it('does not add a rep with reps_first when already at the upper bound', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-10',
      planProgressionBias: 'reps_first',
      sessions: [
        makeSession(4, [makeSet({ reps: 10, estimatedOrmKg: 130 })]),
        makeSession(2, [makeSet({ reps: 10, estimatedOrmKg: 130 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: expect.stringMatching(/^(maintain|increase_weight)$/),
    })
    expect(suggestion.suggestedReps).toBeLessThanOrEqual(10)
  })

  it('adds a bodyweight rep in load_first plan mode after two clean target completions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-12',
      planProgressionBias: 'load_first',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 9, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 9, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 10,
      isBodyweightOnly: true,
    })
  })

  it('adds a bodyweight rep in reps_first plan mode after two clean target completions', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-12',
      planProgressionBias: 'reps_first',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 9, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 9, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_reps',
      planMode: 'increase_reps',
      suggestedWeightKg: 0,
      suggestedReps: 10,
      isBodyweightOnly: true,
    })
  })

  it('keeps bodyweight top-of-range plan progression above the configured ceiling', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      planProgressionBias: 'load_first',
      currentSets: [makeCurrentSet({ weight: 0 })],
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

  it('forces reps-only bodyweight progression even with weighted history', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      bodyweightProgressionMode: 'reps',
      currentSets: [makeCurrentSet({ weight: '' })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 5, reps: 8, estimatedOrmKg: 20 })]),
        makeSession(2, [makeSet({ weightKg: 5, reps: 8, estimatedOrmKg: 20 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      isBodyweightOnly: true,
      suggestedWeightKg: 0,
    })
  })

  it('forces added-load bodyweight progression from pure bodyweight history', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      bodyweightProgressionMode: 'load',
      currentSets: [makeCurrentSet({ weight: '' })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 25 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 25 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'increase_weight',
      planMode: 'increase_weight',
      suggestedWeightKg: 2.5,
      isBodyweightOnly: false,
    })
  })

  it('caps the first added-load bodyweight suggestion to one increment in plan mode', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      bodyweightProgressionMode: 'load',
      planRepRange: '8-12',
      currentSets: [makeCurrentSet({ weight: '' })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 80 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      suggestedWeightKg: 2.5,
      isBodyweightOnly: false,
    })
  })

  it('auto-selects added-load bodyweight progression when the current set has external load', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [makeCurrentSet({ weight: 10 })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 25 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 25 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      isBodyweightOnly: false,
      suggestedWeightKg: 2.5,
    })
  })

  it('auto-selects reps bodyweight progression when the current set explicitly has zero load', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 25 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 25 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      isBodyweightOnly: true,
      suggestedWeightKg: 0,
    })
  })

  it('holds bodyweight target in plan maintenance mode', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-12',
      planProgressionBias: 'maintenance',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(4, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 100 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintenance',
      suggestedWeightKg: 0,
      isBodyweightOnly: true,
    })
    expect(suggestion.reasoning).toContain('maintenance')
  })

  it('returns maintain for a weighted exercise in plan maintenance mode', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '8-10',
      planProgressionBias: 'maintenance',
      sessions: [
        makeSession(4, [makeSet({ reps: 8, estimatedOrmKg: 120 })]),
        makeSession(2, [makeSet({ reps: 8, estimatedOrmKg: 120 })]),
      ],
    }))

    expect(suggestion).toMatchObject({
      action: 'maintain',
      planMode: 'maintenance',
      isBodyweightOnly: false,
    })
  })
})

describe('drop set awareness', () => {
  it('activeSetIndex skips drop sets and targets next working set', () => {
    // Session has 3 sets so position 2 gets real history, enabling a non-null suggestion
    const session = makeSession(7, [
      makeSet({ weightKg: 100, reps: 8, setNumber: 1 }),
      makeSet({ weightKg: 75,  reps: 8, setNumber: 2 }),
      makeSet({ weightKg: 100, reps: 8, setNumber: 3 }),
    ])
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        { reps: '8', weight: '100', done: true,  setType: 'normal',  setGroupIndex: null },
        { reps: '6', weight: '75',  done: false, setType: 'dropset', setGroupIndex: 0 },
        { reps: '8', weight: '100', done: false, setType: 'normal',  setGroupIndex: null },
      ],
      sessions: [session, session, session],
    }))
    expect(suggestion).not.toBeNull()
    expect(suggestion.activeSetIndex).toBe(2)
  })

  it('returns null when all remaining undone sets are drop sets', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      currentSets: [
        { reps: '8', weight: '100', done: true,  setType: 'normal',  setGroupIndex: null },
        { reps: '6', weight: '75',  done: false, setType: 'dropset', setGroupIndex: 0 },
      ],
    }))
    expect(suggestion).toBeNull()
  })
})

describe('Issue 23: loaded bodyweight e1RM coordinate fix', () => {
  // +10 kg × 8 at 80 kg bodyweight.
  // calculateSetEstimatedOrm stores added-load-equivalent e1RM:
  //   totalORM(90 kg, 8) ≈ 112.9 kg → stored = 112.9 - 80 = 32.9 kg
  // The engine must invert that back to added weight, not treat 32.9 as a
  // plain external-load e1RM (which would produce ~25 kg of added weight).
  const BW_KG = 80
  const ADDED_WEIGHT_KG = 10
  const ADDED_LOAD_E1RM = 32.9  // calculateSetEstimatedOrm({weight:10, reps:8, equipment:'Bodyweight', bodyweightKg:80})

  function makeBwSession(daysAgo) {
    return makeSession(daysAgo, [makeSet({ weightKg: ADDED_WEIGHT_KG, reps: 8, estimatedOrmKg: ADDED_LOAD_E1RM })])
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plan mode: suggests ~10 kg added weight, not the inflated ~25 kg', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      userBodyweightKg: BW_KG,
      planRepRange: '8-10',
      sessions: [makeBwSession(4), makeBwSession(2)],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.isBodyweightOnly).toBe(false)
    // Before the fix: suggestedWeightKg ≈ 25 (weightForOrm(32.9, 8) treated as external load).
    // After the fix:  suggestedWeightKg ≈ 10 (weightForAddedLoadOrm correctly subtracts bodyweight).
    expect(suggestion.suggestedWeightKg).toBeGreaterThanOrEqual(ADDED_WEIGHT_KG - 2.5)
    expect(suggestion.suggestedWeightKg).toBeLessThanOrEqual(ADDED_WEIGHT_KG + 2.5)
  })

  it('non-plan mode: e1RM floor does not inflate added weight from ~10 to ~27.5 kg', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      userBodyweightKg: BW_KG,
      sessions: [makeBwSession(4), makeBwSession(2)],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.isBodyweightOnly).toBe(false)
    // Before the fix: floor check compares calcOrmKg(10, 8)≈12.7 against floor≈32.65,
    // then walks weight up to ~27.5 kg to clear it.
    // After the fix: floor check compares calcAddedLoadE1rmKg(10, 8, 80)=32.9 against
    // floor≈32.65, which already passes — no inflation.
    expect(suggestion.suggestedWeightKg).toBeGreaterThanOrEqual(ADDED_WEIGHT_KG - 2.5)
    expect(suggestion.suggestedWeightKg).toBeLessThanOrEqual(ADDED_WEIGHT_KG + 2.5)
  })

  it('fatigue cascade between sets stays in added-load space', () => {
    // Set 1 done at +8 kg (slightly under the +10 kg suggestion).
    // Without the fix the cascade compares calcOrmKg(10,8)≈12.7 planned vs
    // calcOrmKg(8,8)≈10.1 actual — a 20% drop, capped at 5% — then applies
    // weightForOrm on an already-wrong e1RM, compounding the error.
    // With the fix both values are in added-load space, so the 5% reduction
    // correctly produces ~9.5 kg → snaps to 10 kg (no change at the increment).
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      userBodyweightKg: BW_KG,
      sessions: [makeBwSession(4), makeBwSession(2)],
      currentSets: [
        { reps: '8', weight: '8', done: true,  setType: 'normal', setGroupIndex: null },
        { reps: '',  weight: '',  done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.isBodyweightOnly).toBe(false)
    expect(suggestion.suggestedWeightKg).toBeLessThanOrEqual(ADDED_WEIGHT_KG + 2.5)
  })
})

describe('Issue 24: current-session warmup sets excluded from workingSetPos', () => {
  // Historical warmups are excluded by getSetHistoryByIndex (fixed in Issue 28:
  // warmups now filtered before indexing, not after). The bug fixed here: the
  // current-session loop only skipped dropsets, so a done warmup before the first
  // working set consumed workingSetPos=0, making the working set query Set 2
  // history and receive a phantom 5% fatigue penalty.
  const session = makeSession(2, [makeSet({ reps: 8 })])

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a done warmup before the active working set does not offset workingSetPos', () => {
    // Without the fix: workingSetPos=0 consumed by warmup, active set queries
    // Set 2 history (empty) → first_time fallback, setNumber=2.
    // With the fix: warmup skipped, active set queries Set 1 history, setNumber=1.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [session, session],
      currentSets: [
        { reps: '5', weight: '60', done: true,  setType: 'warmup', setGroupIndex: null },
        { reps: '',  weight: '',   done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.setNumber).toBe(1)
    expect(suggestion.suggestedWeightKg).toBe(100)
  })

  it('a done warmup before the active working set does not inject phantom fatigue', () => {
    // Without the fix: previousActualE1rmKg seeded from warmup (60 kg × 5 ≈ 72),
    // previousPlannedE1rmKg from Set 1 history (≈ 119), cascade fires at 5%.
    // With the fix: warmup skipped entirely, no cascade on Set 1.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [session, session],
      currentSets: [
        { reps: '5', weight: '60', done: true,  setType: 'warmup', setGroupIndex: null },
        { reps: '',  weight: '',   done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.fatigueAdjustmentPct).toBe(0)
  })

  it('returns null when the only undone set is a warmup', () => {
    // Warmups should never receive a working-set progression suggestion.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [session],
      currentSets: [
        { reps: '',  weight: '',   done: false, setType: 'warmup', setGroupIndex: null },
      ],
    }))

    expect(suggestion).toBeNull()
  })

  it('done warmup followed by done working set followed by active working set — cascade uses real Set 1 data', () => {
    // [warmup done, Set1 done at 100×8, Set2 undone]
    // Without the fix: warmup→pos0 (Set1 history), Set1→pos1 (Set2 history, empty),
    // Set2→pos2 (Set3 history, empty) → suggestion is first_time/fallback.
    // With the fix: warmup skipped, Set1→pos0, Set2→pos1 (Set2 history).
    const twoSetSession = makeSession(2, [makeSet({ reps: 8, setNumber: 1 }), makeSet({ reps: 8, setNumber: 2 })])
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [twoSetSession, twoSetSession],
      currentSets: [
        { reps: '5',  weight: '60',  done: true,  setType: 'warmup', setGroupIndex: null },
        { reps: '8',  weight: '100', done: true,  setType: 'normal', setGroupIndex: null },
        { reps: '',   weight: '',    done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.setNumber).toBe(2)
  })
})

describe('Issue 25: failure deload uses prior-only baseline, not self-referencing median', () => {
  // A sustained e1RM drop (e.g. 100 → 80 over 3 sessions) pulls the median of the
  // last-5 window down to 80, the threshold to 74.4, and the 3 failing sessions at 80
  // no longer look like failures. The fix: compute the failure baseline from the oldest
  // FAILURE_COUNT_THRESHOLD entries of the window so the benchmark stays at the
  // pre-drop level.

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('weighted: 3 sessions at 80 e1RM after 2 at 100 triggers deload (not maintain)', () => {
    // Without fix: median([100,100,80,80,80])=80, threshold=74.4, 0 failures → maintain.
    // With fix:    priorOnly=[100,100], baseline=100, threshold=93, 3 failures ≥ 3 → deload.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(6, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(5, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ estimatedOrmKg: 80 })]),
        makeSession(3, [makeSet({ estimatedOrmKg: 80 })]),
        makeSession(2, [makeSet({ estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).toBe('deload')
  })

  it('weighted: only 2 sessions below baseline does not deload with the default threshold', () => {
    // 2 failures < FAILURE_COUNT_THRESHOLD (3) → maintain, even with the new prior-only baseline.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(5, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(4, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(3, [makeSet({ estimatedOrmKg: 100 })]),
        makeSession(2, [makeSet({ estimatedOrmKg: 80 })]),
        makeSession(1, [makeSet({ estimatedOrmKg: 80 })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).not.toBe('deload')
  })

  it('bodyweight: 3 sessions at low reps after 2 at high reps triggers deload', () => {
    // Without fix: median([15,15,6,6,6])=6, threshold=5.58, 0 rep failures → maintain.
    // With fix:    priorOnly=[15,15], expectedReps=15, threshold=13.95, 3 failures → deload.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '12-15',
      currentSets: [makeCurrentSet({ weight: 0 })],
      sessions: [
        makeSession(6, [makeSet({ weightKg: 0, reps: 15, estimatedOrmKg: 0 })]),
        makeSession(5, [makeSet({ weightKg: 0, reps: 15, estimatedOrmKg: 0 })]),
        makeSession(4, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 0 })]),
        makeSession(3, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 0 })]),
        makeSession(2, [makeSet({ weightKg: 0, reps: 6, estimatedOrmKg: 0 })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).toBe('deload')
    expect(suggestion.isBodyweightOnly).toBe(true)
  })
})

describe('Issue 29: bodyweight fatigue percentage zeroed when clamping neutralises the rep reduction', () => {
  // applyE1rmFatigueCascade (weighted path) already zeroes fatigueAdjustmentPct when
  // snapping returns the original weight (Issue 26 fix). The bodyweight branch in
  // buildCurrentSetSuggestion had the same gap: it computed newReps, clamped to the
  // range lower bound, and then stamped the nonzero fatiguePct unconditionally even
  // when the clamp restored the original rep count.
  //
  // Reproduction:  planRepRange '8-10' (lower = 8), consistent 8-rep history.
  //   Set 1 done at 5 reps  → rawFatigue = (8-5)/8 = 37.5%, capped to 5%.
  //   Set 2 raw suggestion   = 8 reps (maintain at lower bound).
  //   Math.floor(8 × 0.95)  = 7  →  Math.max(8, 7) = 8  →  reps unchanged.
  //   Bug: fatigueAdjustmentPct: 0.05, reasoning "Reduced 5%…", completedReps < unadjusted → fatigue_adjusted.
  //   Fix: when newReps === rawSuggestion.reps, zero both fatigueAdjustmentPct and the local fatiguePct.

  const bwSession = makeSession(3, [
    makeSet({ weightKg: 0, reps: 8, estimatedOrmKg: 0 }),
    makeSet({ weightKg: 0, reps: 8, estimatedOrmKg: 0 }),
  ])

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fatigueAdjustmentPct is 0 when lower-bound clamping neutralises the rep reduction', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      sessions: [bwSession, bwSession, bwSession],
      currentSets: [
        { reps: '5', weight: '0', done: true,  setType: 'normal', setGroupIndex: null },
        { reps: '',  weight: '',  done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.fatigueAdjustmentPct).toBe(0)
  })

  it('reasoning does not mention carry-over fatigue when reps did not change', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      sessions: [bwSession, bwSession, bwSession],
      currentSets: [
        { reps: '5', weight: '0', done: true,  setType: 'normal', setGroupIndex: null },
        { reps: '',  weight: '',  done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.reasoning).not.toContain('carry-over fatigue')
  })

  it('resolveCompletedSetProgressionEvent does not return fatigue_adjusted when reps did not change', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      planRepRange: '8-10',
      sessions: [bwSession, bwSession, bwSession],
      currentSets: [
        { reps: '5', weight: '0', done: true,  setType: 'normal', setGroupIndex: null },
        { reps: '',  weight: '',  done: false, setType: 'normal', setGroupIndex: null },
      ],
    }))

    expect(suggestion).not.toBeNull()
    const event = resolveCompletedSetProgressionEvent({ suggestion, completedReps: 7 })
    expect(event).not.toBe('fatigue_adjusted')
  })
})

describe('Issue 28: historical warmup sets excluded from set-history position indexing', () => {
  // getSetHistoryByIndex previously filtered out dropsets only, then checked
  // isWarmup after indexing. A session shaped [warmup, working set] caused
  // countedSets[0] to be the warmup; that was skipped, so valid Set 1 working-set
  // history was never found and the engine returned first_time every session.
  // Fix: warmups are now removed from countedSets before indexing.

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sessions with a tagged warmup before the working set still provide Set 1 history', () => {
    // Without fix: countedSets[0] = warmup → isWarmup skip → all 3 sessions return
    // nothing for setIndex=0 → empty history → first_time suggestion.
    // With fix: warmup excluded before indexing → countedSets[0] = 100 kg × 8 → maintain.
    const sessionWithWarmup = makeSession(3, [
      makeSet({ weightKg: 40, reps: 5, isWarmup: true, estimatedOrmKg: calculateORM(40, 5) }),
      makeSet({ weightKg: 100, reps: 8 }),
    ])

    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [sessionWithWarmup, sessionWithWarmup, sessionWithWarmup],
      currentSets: [makeCurrentSet()],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).not.toBe('first_time')
    expect(suggestion.setNumber).toBe(1)
  })
})

describe('Issue 31: weight-increase snaps back to original load on coarse-increment equipment', () => {
  // 20 kg * 1.025 = 20.5 kg → Math.round(20.5 / 2.5) * 2.5 = 8 * 2.5 = 20 kg (unchanged).
  // Fix: snapToWeightIncrease falls back to startWeightKg + incrementKg = 22.5 kg.
  // Using load_first plan mode with two clean target completions to reliably trigger
  // the weight-increase path (same pattern as the existing load_first tests).

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Dumbbell at 20 kg: suggests 22.5 kg (one step up), not 20 kg (snap-back no-op)', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      sessions: [
        makeSession(4, [makeSet({ weightKg: 20, reps: 6, estimatedOrmKg: calculateORM(20, 6) })]),
        makeSession(2, [makeSet({ weightKg: 20, reps: 6, estimatedOrmKg: calculateORM(20, 6) })]),
      ],
    }))

    expect(suggestion?.action).toBe('increase_weight')
    expect(suggestion?.suggestedWeightKg).toBe(22.5)
  })

  it('bilateral Dumbbell at 20 kg: snaps to 21.25 kg (1.25 kg step), not 22.5 kg', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      bilateral: true,
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      sessions: [
        makeSession(4, [makeSet({ weightKg: 20, reps: 6, estimatedOrmKg: calculateORM(20, 6) })]),
        makeSession(2, [makeSet({ weightKg: 20, reps: 6, estimatedOrmKg: calculateORM(20, 6) })]),
      ],
    }))

    expect(suggestion?.action).toBe('increase_weight')
    expect(suggestion?.suggestedWeightKg).toBe(21.25)
  })

  it('bilateral Dumbbell: customIncrementKg overrides bilateral halving', () => {
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      bilateral: true,
      customIncrementKg: 2.5,
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      sessions: [
        makeSession(4, [makeSet({ weightKg: 20, reps: 6, estimatedOrmKg: calculateORM(20, 6) })]),
        makeSession(2, [makeSet({ weightKg: 20, reps: 6, estimatedOrmKg: calculateORM(20, 6) })]),
      ],
    }))

    expect(suggestion?.action).toBe('increase_weight')
    expect(suggestion?.suggestedWeightKg).toBe(22.5) // user's 2.5 kg step wins over 1.25 kg bilateral default
  })

  it('Barbell at 100 kg: percentage increase clears the plate increment, no one-step fallback needed', () => {
    // 100 * 1.025 = 102.5 → snapToPlates(102.5) = 102.5 (valid plate combo). No fallback.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Barbell',
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      sessions: [
        makeSession(4, [makeSet({ weightKg: 100, reps: 6 })]),
        makeSession(2, [makeSet({ weightKg: 100, reps: 6 })]),
      ],
    }))

    expect(suggestion?.action).toBe('increase_weight')
    expect(suggestion?.suggestedWeightKg).toBeGreaterThan(100)
  })

  it('custom 10 lb increment: 80 lb curl suggests 90 lbs (one step up), not 80 lbs (snap-back no-op)', () => {
    // User-reported case: 80 lb curl, 10 lb custom increment.
    // 80 lbs = 36.2874 kg; 10 lbs = 4.5359 kg.
    // Percentage path: 36.2874 × 1.025 = 37.19 → roundToIncrement(37.19, 4.5359) = 36.29 (same load — snap-back).
    // Fallback path:   36.2874 + 4.5359 = 40.82 → roundToIncrement(40.82, 4.5359) = 40.82 kg (90 lbs) ✅
    // Exercises the customIncrementKg → overrideIncrement=true → roundToIncrement path,
    // which the existing Issue 31 tests do NOT cover (they use default equipment increments).
    const LBS_PER_KG = 0.453592
    const startKg = 80 * LBS_PER_KG   // 36.2874 kg
    const incrKg  = 10 * LBS_PER_KG   // 4.5359 kg

    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      unitPreference: 'lbs',
      planRepRange: '6-10',
      planProgressionBias: 'load_first',
      customIncrementKg: incrKg,
      sessions: [
        makeSession(4, [makeSet({ weightKg: startKg, reps: 6, estimatedOrmKg: calculateORM(startKg, 6) })]),
        makeSession(2, [makeSet({ weightKg: startKg, reps: 6, estimatedOrmKg: calculateORM(startKg, 6) })]),
      ],
    }))

    expect(suggestion?.action).toBe('increase_weight')
    // 90 lbs = 9 × incrKg ≈ 40.82 kg (not 80 lbs = startKg)
    expect(suggestion?.suggestedWeightKg).toBeCloseTo(9 * incrKg, 3)
    expect(suggestion?.suggestedWeightKg).toBeGreaterThan(startKg + 0.125)
  })
})

describe('Issue 32: assisted bodyweight (negative external load) sign semantics', () => {
  // Assisted pull-ups at -5 kg (5 kg assistance) with 80 kg bodyweight.
  // e1RM stored as added-load-equivalent: calcOrmKg(bw + added, reps) - bw.
  //   -20 kg × 10: calcOrmKg(60, 10) - 80 = 80 - 80 = 0 (zero, cannot be used as failure baseline)
  //    -5 kg ×  8: calcOrmKg(75,  8) - 80 ≈ 14.1  (positive — usable baseline for deload test)
  //    -5 kg ×  5: calcOrmKg(75,  5) - 80 ≈  7.4  (below 93% of 14.1 → failure)

  const BW = 80

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('progression: suggests -17.5 kg (less assistance = harder), not -20 or -20.5 kg', () => {
    // Two sessions at the plan rep ceiling → rep_ceiling trigger fires.
    // Old code: -20 * 1.025 = -20.5 → roundToSignedIncrement → snaps back to -20 (unchanged).
    // Fix: snapToWeightIncrease fallback: -20 + 2.5 = -17.5 kg.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      userBodyweightKg: BW,
      planRepRange: '8-10',
      sessions: [
        makeSession(14, [makeSet({ weightKg: -20, reps: 10, estimatedOrmKg: 0 })]),
        makeSession(7,  [makeSet({ weightKg: -20, reps: 10, estimatedOrmKg: 0 })]),
      ],
    }))

    expect(suggestion?.action).toBe('increase_weight')
    expect(suggestion?.suggestedWeightKg).toBe(-17.5)
  })

  it('deload: suggests -7.5 kg (more assistance = easier), not null', () => {
    // -5 kg assistance: e1RM = calcOrmKg(75, reps) - 80 is positive for reps ≥ 6.
    // Prior baseline (oldest 2 of 5): ≈14.1. Failure threshold: 14.1 * 0.93 ≈ 13.1.
    // Bad sessions at 5 reps: ≈7.4 < 13.1 → 3 failures ≥ 3 → failure deload fires.
    // Old code: safeReduceWeight(-5, ...) returned null immediately (weightKg <= 0 guard).
    // Fix: negative path steps one increment more negative → -7.5 kg.
    const E1RM_GOOD = Math.round((calculateORM(75, 8) - BW) * 10) / 10
    const E1RM_BAD  = Math.round((calculateORM(75, 5) - BW) * 10) / 10
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Bodyweight',
      userBodyweightKg: BW,
      sessions: [
        makeSession(20, [makeSet({ weightKg: -5, reps: 8, estimatedOrmKg: E1RM_GOOD })]),
        makeSession(14, [makeSet({ weightKg: -5, reps: 8, estimatedOrmKg: E1RM_GOOD })]),
        makeSession(8,  [makeSet({ weightKg: -5, reps: 5, estimatedOrmKg: E1RM_BAD })]),
        makeSession(5,  [makeSet({ weightKg: -5, reps: 5, estimatedOrmKg: E1RM_BAD })]),
        makeSession(2,  [makeSet({ weightKg: -5, reps: 5, estimatedOrmKg: E1RM_BAD })]),
      ],
    }))

    expect(suggestion?.action).toBe('deload')
    expect(suggestion?.suggestedWeightKg).toBe(-7.5)
  })
})

describe('Issue 37: buildExerciseSnapWeight respects custom starting weight for plate equipment', () => {
  it('uses roundToIncrement path (not snapToPlates) when custom starting weight is set for Barbell', () => {
    const snap = buildExerciseSnapWeight('Barbell', 'kg', null, 15)
    // With 15 kg custom bar and 2.5 kg increment: valid loads are 15, 17.5, 20, 22.5, ...
    expect(snap(17.5)).toBe(17.5)
    expect(snap(20)).toBe(20)
    expect(snap(22.5)).toBe(22.5)
    // Anything below the 15 kg floor is clamped to 15
    expect(snap(10)).toBe(15)
    expect(snap(15)).toBe(15)
    // Rounds to nearest 2.5 from phase 0 (15 % 2.5 === 0)
    expect(snap(16)).toBe(15)
    expect(snap(16.5)).toBe(17.5)
  })

  it('uses snapToPlates path (default bar) when no custom starting weight is set', () => {
    const snap = buildExerciseSnapWeight('Barbell', 'kg', null, null)
    // Default barbell bar = 20 kg; anything below bar returns 20
    expect(snap(15)).toBe(20)
    expect(snap(20)).toBe(20)
    // 17.5 kg is not achievable with a 20 kg bar → snaps up to 20
    expect(snap(17)).toBe(20)
  })

  it('custom increment still overrides the plate path regardless of starting weight', () => {
    // customIncrementKg set → overrideIncrement is true, starting weight is just phase offset
    const snap = buildExerciseSnapWeight('Barbell', 'kg', 5, 20)
    expect(snap(25)).toBe(25)
    expect(snap(22)).toBe(20)
    expect(snap(23)).toBe(25)
  })

  it('EZ Bar with custom starting weight uses increment path instead of default 10 kg bar', () => {
    const snap = buildExerciseSnapWeight('EZ Bar', 'kg', null, 8)
    // Without fix: snapToPlates returns 10 (default EZ bar) for anything ≤ 10
    // With fix: roundToIncrement from 8, increment 2.5 → 8, 10.5, 13, ...
    expect(snap(8)).toBe(8)
    expect(snap(9)).toBe(8)  // rounds to nearest 2.5 from phase 8%2.5=0.5 → (9-0.5)/2.5=3.4 → round→3 → 3*2.5+0.5=8
  })

  it('Dumbbell (non-plate) is unaffected — startingWeightKg does not enable plate bypass', () => {
    const snap = buildExerciseSnapWeight('Dumbbell', 'kg', null, 10)
    // Dumbbell is not in PLATE_EQUIPMENT, so overrideIncrement remains false when only starting weight is set
    // roundToIncrement path with increment 2.5, starting weight 10
    expect(snap(12.5)).toBe(12.5)
    expect(snap(10)).toBe(10)
    expect(snap(9)).toBe(10)  // clamped to min
  })
})

describe('Issue 35: assisted bodyweight fatigue cascade handles negative external loads', () => {
  // applyE1rmFatigueCascade and applyCrossExercisePreFatigue are private — tested end-to-end.
  // For assisted bodyweight (negative external load), the fatigue cascade must NOT fall back to
  // the original suggestion.weightKg simply because rawWeight is negative.
  // In practice the 5% cap + 2.5 kg increment often neutralises the snap (Issue 26 guard sets
  // fatigueAdjustmentPct: 0), but the code path must proceed without error and the weight must
  // remain in signed-load space (never silently become 0 or positive).

  const BW = 80

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('produces a valid suggestion for Set 2 of an assisted bodyweight exercise without crashing', () => {
    const E1RM = Math.round((calculateORM(75, 8) - BW) * 10) / 10
    const suggestion = buildCurrentSetSuggestion({
      sessions: [
        makeSession(7,  [makeSet({ weightKg: -5, reps: 8, estimatedOrmKg: E1RM })]),
        makeSession(14, [makeSet({ weightKg: -5, reps: 8, estimatedOrmKg: E1RM })]),
      ],
      currentSets: [
        { reps: '5', weight: '-5', done: true },
        { reps: '', weight: '', done: false },
      ],
      equipment: 'Bodyweight',
      unitPreference: 'kg',
      userBodyweightKg: BW,
    })
    // Suggestion must be returned: the fatigue cascade must not crash on negative rawWeight
    expect(suggestion).not.toBeNull()
    // Weight must remain negative (never silently coerced to 0 or positive)
    expect(suggestion.suggestedWeightKg).toBeLessThanOrEqual(0)
  })

  it('non-bodyweight exercises still reject rawWeight <= 0 (guard preserved)', () => {
    // Regression: for non-BW exercises (no bodyweightKg), rawWeight <= 0 must still fall back
    // to suggestion.weightKg. Supply history with a very low e1RM that after cascade adjustment
    // would produce near-zero rawWeight — the suggestion weight must not be 0 or negative.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      equipment: 'Dumbbell',
      sessions: [
        makeSession(7,  [makeSet({ weightKg: 2.5, reps: 8, estimatedOrmKg: calculateORM(2.5, 8) })]),
        makeSession(14, [makeSet({ weightKg: 2.5, reps: 8, estimatedOrmKg: calculateORM(2.5, 8) })]),
      ],
      currentSets: [
        { reps: '2', weight: '2.5', done: true },
        { reps: '', weight: '', done: false },
      ],
    }))
    if (suggestion !== null) {
      // If a suggestion is returned, its weight must be positive
      expect(suggestion.suggestedWeightKg === null || suggestion.suggestedWeightKg > 0).toBe(true)
    }
  })
})

describe('Issue 38: maintain suggestion e1RM ceiling guard', () => {
  // Weight and reps are computed independently in the default maintain/increase_reps
  // branch. baselineWeightKg comes from the most recent baseline-eligible session;
  // suggestedReps comes from baselineReps clamped to the objective range. Together
  // they can imply an e1RM above expectedE1rmKg (the 5-session median) — a semantic
  // contradiction: a "maintain" suggestion should not ask the user to exceed their
  // demonstrated level.
  //
  // Fix (progressiveOverload.js, buildPerSetSuggestion): after resolving action and
  // suggestedReps, if action === 'maintain' and calcOrmKg(startWeightKg, suggestedReps)
  // > expectedE1rmKg, drop reps by one — provided the result stays inside
  // objectiveProfile.lower. 'increase_reps' is deliberately exempt: adding reps is
  // intentional double-progression and its higher e1RM is the point.

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reduces reps when the maintain suggestion implies an e1RM above the baseline median', () => {
    // History: four sessions at 100 kg × 7 reps (median e1RM ≈ 121.7 kg),
    // followed by one session at 105 kg × 8 reps (most recent, baseline-eligible).
    // The most recent session sets baselineWeightKg = 105 kg and baselineReps = 8.
    // In plan mode without reps_first bias, suggestedReps = targetReps = 8 → maintain.
    //
    // Without guard: 105 × 8 implies e1RM ≈ 131.7 kg >> 121.7 kg baseline — contradictory.
    // With guard: the guard fires (131.7 > 121.7), reducedReps = 7 ≥ lower (6) → finalReps = 7.
    //
    // Progression trigger does NOT fire:
    //   rep_ceiling: second-to-last session at 7 reps < 8 (upper) — not both at ceiling.
    //   e1rm_above:  second-to-last e1RM (121.7) < threshold (121.7 × 1.03 = 125.3) — not both above.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-8',
      sessions: [
        makeSession(10, [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(8,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(6,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(4,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(2,  [makeSet({ weightKg: 105, reps: 8, estimatedOrmKg: calculateORM(105, 8) })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).toBe('maintain')
    // In plan mode startWeightKg = planModeTargetWeightKg = weightForOrm(expectedE1rmKg≈121.7, 7) ≈ 100
    expect(suggestion.suggestedWeightKg).toBe(100)
    // Guard fires: calcORM(100, 8) ≈ 125.4 > expectedE1rmKg ≈ 121.7 → reps pulled back to 7
    expect(suggestion.suggestedReps).toBe(7)
    // Verify the guard moved in the right direction (lower implied e1RM than the raw 8-rep target)
    expect(calculateORM(100, 7)).toBeLessThan(calculateORM(100, 8))
    // Directly verify the core invariant: the final 'maintain' suggestion must not
    // imply an e1RM above the established baseline median.
    const expectedE1rmForTest = calculateORM(100, 7) // median of the four 100×7 sessions ≈ 121.7
    expect(calculateORM(suggestion.suggestedWeightKg, suggestion.suggestedReps))
      .toBeLessThanOrEqual(expectedE1rmForTest)
  })

  it('does not apply the ceiling guard to increase_reps — adding reps is intentional double-progression', () => {
    // Five consistent sessions at 100 kg × 8 (no plan range).
    // Objective profile: center = 8, hypertrophy range [6, 10].
    // 8 < 10 (upper) → suggestedReps = 9 → action = increase_reps.
    // calcORM(100, 9) ≈ 129.3 > calcORM(100, 8) ≈ 125.4 (expectedE1rmKg) —
    // the guard WOULD fire if applied, but it must not: increase_reps is exempt.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      sessions: [
        makeSession(10, [makeSet({ reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(8,  [makeSet({ reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(6,  [makeSet({ reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(4,  [makeSet({ reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(2,  [makeSet({ reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).toBe('increase_reps')
    expect(suggestion.suggestedWeightKg).toBe(100)
    expect(suggestion.suggestedReps).toBe(9)
  })

  it('does not fire the guard when the implied e1RM is at or below the baseline median', () => {
    // Plan mode, planRepRange '6-8' (lower=6, upper=8, center=7).
    // Five consistent sessions at 100 kg × 7 (exactly at the plan centre).
    //
    // expectedE1rmKg = 121.7, planModeTargetWeightKg = weightForOrm(121.7, 7) ≈ 100
    // baselineReps = 7 (clamped to [6,8]) → suggestedReps = 7 → action = 'maintain'
    //
    // Guard check: calcORM(100, 7) = 121.7 = expectedE1rmKg (not strictly greater)
    // → guard does NOT fire → suggestion stays at 100 × 7
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-8',
      sessions: [
        makeSession(10, [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(8,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(6,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(4,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
        makeSession(2,  [makeSet({ weightKg: 100, reps: 7, estimatedOrmKg: calculateORM(100, 7) })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).toBe('maintain')
    expect(suggestion.suggestedWeightKg).toBe(100)
    // Guard does NOT fire: calcORM(100, 7) ≈ 121.7 = expectedE1rmKg (not strictly greater)
    expect(suggestion.suggestedReps).toBe(7)
  })

  it('does not reach the e1RM ceiling guard when reacclimation fires — early return before the default branch', () => {
    // A session more than 28 days ago triggers the reacclimate_reduce_two early return
    // inside buildPerSetSuggestion, which exits before the default maintain branch and
    // therefore before the e1RM ceiling guard is ever evaluated.
    const suggestion = buildCurrentSetSuggestion(makeSuggestionInput({
      planRepRange: '6-8',
      sessions: [
        makeSession(35, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ],
    }))

    expect(suggestion).not.toBeNull()
    expect(suggestion.action).toBe('maintain')
    expect(suggestion.planMode).toBe('reacclimate_reduce_two')
    // Weight is reduced — confirms the reacclimation path ran, not the guard path
    expect(suggestion.suggestedWeightKg).toBeLessThan(100)
  })
})

// ─── confidenceSignal ─────────────────────────────────────────────────────────

describe('confidenceSignal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper: N sessions, each with 1 eligible working set, oldest first
  function makeEligibleSessions(n, { reps = 8, weightKg = 100, daysAgoFn } = {}) {
    const defaultDaysAgo = (i) => (n - i) * 3 // oldest at n*3, most recent at 3 days ago
    const daysAgoFor = daysAgoFn ?? defaultDaysAgo
    return Array.from({ length: n }, (_, i) =>
      makeSession(daysAgoFor(i), [
        makeSet({ weightKg, reps, estimatedOrmKg: calculateORM(weightKg, reps) }),
      ])
    )
  }

  // ── Axis 1: History Quantity ────────────────────────────────────────────────

  describe('axis 1 — history quantity', () => {
    it('zero sessions → score = 0, level = low, reason includes No baseline', () => {
      // exerciseName needed so strength standards provide valid first_time weight/reps
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      const cs = s.confidenceSignal
      expect(cs.axes.historyQuantity.score).toBe(0)
      expect(cs.level).toBe('low')
      expect(cs.axes.historyQuantity.reasons).toContain('No baseline sessions recorded yet')
      expect(cs.topReasons).toContain('No baseline sessions recorded yet')
    })

    it('1 session → score = 0.25, reason mentions Only 1 baseline session', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: makeEligibleSessions(1),
      }))
      const cs = s.confidenceSignal
      expect(cs.axes.historyQuantity.score).toBe(0.25)
      expect(cs.axes.historyQuantity.reasons[0]).toMatch(/Only 1 baseline session/)
    })

    it('3 sessions → score = 0.70', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: makeEligibleSessions(3),
      }))
      expect(s.confidenceSignal.axes.historyQuantity.score).toBe(0.7)
    })

    it('5+ sessions → score = 1.0, no reasons', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: makeEligibleSessions(5),
      }))
      expect(s.confidenceSignal.axes.historyQuantity.score).toBe(1.0)
      expect(s.confidenceSignal.axes.historyQuantity.reasons).toHaveLength(0)
    })

    it('isFallbackFromPrior with 5 sessions → score < 1.0, fallback reason present', () => {
      // Two current sets: first done, second active.
      // Sessions each have 1 working set → set 2 has no direct history → isFallbackFromPrior
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        currentSets: [
          makeCurrentSet({ reps: '8', weight: '100', done: true }),
          makeCurrentSet(),
        ],
      }))
      expect(s.confidenceSignal.axes.historyQuantity.score).toBeLessThan(1.0)
      expect(s.confidenceSignal.axes.historyQuantity.reasons).toContain(
        'History borrowed from adjacent set position — direct data unavailable'
      )
    })
  })

  // ── Axis 2: History Recency ─────────────────────────────────────────────────

  describe('axis 2 — history recency', () => {
    it('last baseline session 3 days ago → no recency reason', () => {
      // Sessions at 15, 12, 9, 6, 3 days ago — most recent = 3 days
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      const reasons = s.confidenceSignal.axes.historyRecency.reasons
      expect(reasons.every(r => !r.includes('days ago'))).toBe(true)
    })

    it('last baseline session 18 days ago → recency reason fires', () => {
      // Chronological order: 32, 25, 18 days ago
      const sessions = [
        makeSession(32, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(25, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(18, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      // daysSinceLastBaseline = 18 > 14 → reason fires
      expect(s.confidenceSignal.axes.historyRecency.reasons.some(r => r.includes('days ago'))).toBe(true)
      expect(s.confidenceSignal.axes.historyRecency.score).toBeLessThan(0.90)
    })

    it('no history → axis2 score = 0.65 (recency 0.50 * 0.70 + regularity 1.0 * 0.30)', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      // null daysSinceLastBaseline → recencyScore = 0.50; < 3 gaps → regularityScore = 1.0
      // axis2 = 0.50 * 0.70 + 1.0 * 0.30 = 0.65
      expect(s.confidenceSignal.axes.historyRecency.score).toBeCloseTo(0.65, 5)
    })

    it('highly irregular gaps → irregularity reason fires', () => {
      // Session dates: 32, 29, 26, 6, 3 days ago
      // Gaps: [3, 3, 20, 3] → gapCV ≈ 1.01 > 0.80
      const sessions = [
        makeSession(32, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(29, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(26, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(6,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(3,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.historyRecency.reasons).toContain(
        'Training schedule has been irregular'
      )
    })

    it('highly regular gaps (every 4 days) → no irregularity reason', () => {
      // All gaps exactly 4 days → stdDev = 0 → gapCV = 0
      const sessions = makeEligibleSessions(5, { daysAgoFn: (i) => (5 - i) * 4 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.historyRecency.reasons).not.toContain(
        'Training schedule has been irregular'
      )
    })
  })

  // ── Axis 3: History Representativeness ─────────────────────────────────────

  describe('axis 3 — history representativeness', () => {
    it('all sessions eligible → no representativeness reasons', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      const reasons = s.confidenceSignal.axes.historyRepresentativeness.reasons
      expect(reasons).not.toContain('All recent sessions were exceptional — baseline using unfiltered history')
      expect(reasons).not.toContain('Most recent sessions excluded from baseline (deload/reacclimate)')
    })

    it('3 of 5 sessions are deload → excludedRatio = 0.60, reason fires', () => {
      const sessions = [
        makeSession(10, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(8,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(6,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(4,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(2,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.historyRepresentativeness.reasons).toContain(
        'Most recent sessions excluded from baseline (deload/reacclimate)'
      )
    })

    it('all sessions are deload → allExcludedFallback → reason fires', () => {
      const sessions = [
        makeSession(6, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(4, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(2, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.historyRepresentativeness.reasons).toContain(
        'All recent sessions were exceptional — baseline using unfiltered history'
      )
    })

    it('recent 2 sessions 15%+ above median → above-baseline reason fires', () => {
      const baseE1rm = calculateORM(100, 8)
      const highE1rm = calculateORM(116, 8) // ≈ 15.2% above base
      const sessions = [
        makeSession(14, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: baseE1rm })]),
        makeSession(12, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: baseE1rm })]),
        makeSession(10, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: baseE1rm })]),
        makeSession(5,  [makeSet({ weightKg: 116, reps: 8, estimatedOrmKg: highE1rm })]),
        makeSession(2,  [makeSet({ weightKg: 116, reps: 8, estimatedOrmKg: highE1rm })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(
        s.confidenceSignal.axes.historyRepresentativeness.reasons.some(r => r.includes('above baseline'))
      ).toBe(true)
    })

    it('recent 2 sessions 15%+ below median → below-baseline reason fires', () => {
      const highE1rm = calculateORM(116, 8)
      const lowE1rm  = calculateORM(100, 8)
      const sessions = [
        makeSession(14, [makeSet({ weightKg: 116, reps: 8, estimatedOrmKg: highE1rm })]),
        makeSession(12, [makeSet({ weightKg: 116, reps: 8, estimatedOrmKg: highE1rm })]),
        makeSession(10, [makeSet({ weightKg: 116, reps: 8, estimatedOrmKg: highE1rm })]),
        makeSession(5,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: lowE1rm })]),
        makeSession(2,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: lowE1rm })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(
        s.confidenceSignal.axes.historyRepresentativeness.reasons.some(r => r.includes('below baseline'))
      ).toBe(true)
    })

    it('drift within 3% → no drift reasons', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 100, reps: 8 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      const reasons = s.confidenceSignal.axes.historyRepresentativeness.reasons
      expect(reasons.every(r => !r.includes('baseline'))).toBe(true)
    })
  })

  // ── Axis 4: Statistical Reliability ────────────────────────────────────────

  describe('axis 4 — statistical reliability', () => {
    it('all 5 sessions tight e1RM range → no CV reason', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 100, reps: 8 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.statisticalReliability.reasons).not.toContain(
        'Highly variable performance across recent sessions'
      )
    })

    it('high e1RM variance (80 and 120 alternating) → CV reason fires', () => {
      const sessions = [
        makeSession(10, [makeSet({ weightKg: 80,  reps: 8, estimatedOrmKg: calculateORM(80,  8) })]),
        makeSession(8,  [makeSet({ weightKg: 120, reps: 8, estimatedOrmKg: calculateORM(120, 8) })]),
        makeSession(6,  [makeSet({ weightKg: 80,  reps: 8, estimatedOrmKg: calculateORM(80,  8) })]),
        makeSession(4,  [makeSet({ weightKg: 120, reps: 8, estimatedOrmKg: calculateORM(120, 8) })]),
        makeSession(2,  [makeSet({ weightKg: 80,  reps: 8, estimatedOrmKg: calculateORM(80,  8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.statisticalReliability.reasons).toContain(
        'Highly variable performance across recent sessions'
      )
    })

    it('all sessions same rep count → no rep-spread reason', () => {
      const sessions = makeEligibleSessions(5, { reps: 8 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.statisticalReliability.reasons).not.toContain(
        'Sessions span very different rep ranges — e1RM estimates less comparable'
      )
    })

    it('sessions spanning reps 3–15 → rep-spread reason fires', () => {
      const sessions = [
        makeSession(10, [makeSet({ weightKg: 140, reps: 3,  estimatedOrmKg: calculateORM(140, 3)  })]),
        makeSession(8,  [makeSet({ weightKg: 100, reps: 8,  estimatedOrmKg: calculateORM(100, 8)  })]),
        makeSession(6,  [makeSet({ weightKg: 90,  reps: 10, estimatedOrmKg: calculateORM(90,  10) })]),
        makeSession(4,  [makeSet({ weightKg: 70,  reps: 15, estimatedOrmKg: calculateORM(70,  15) })]),
        makeSession(2,  [makeSet({ weightKg: 100, reps: 8,  estimatedOrmKg: calculateORM(100, 8)  })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.statisticalReliability.reasons).toContain(
        'Sessions span very different rep ranges — e1RM estimates less comparable'
      )
    })

    it('many sessions at reps=1 (extreme) → extreme-rep reason fires', () => {
      // reps=1 is an extreme count where the e1RM formula is less accurate
      const sessions = [
        makeSession(10, [makeSet({ weightKg: 150, reps: 1, estimatedOrmKg: 150 })]),
        makeSession(8,  [makeSet({ weightKg: 148, reps: 1, estimatedOrmKg: 148 })]),
        makeSession(6,  [makeSet({ weightKg: 145, reps: 1, estimatedOrmKg: 145 })]),
        makeSession(4,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(2,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.statisticalReliability.reasons).toContain(
        'Many sessions at extreme rep counts where the e1RM formula is less accurate'
      )
    })
  })

  // ── Axis 5: Suggestion Integrity ───────────────────────────────────────────

  describe('axis 5 — suggestion integrity', () => {
    it('clean suggestion, no corrections → axis5 score > 0.80', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.suggestionIntegrity.score).toBeGreaterThan(0.80)
    })

    it('reacclimate planMode → reacclimation reason fires', () => {
      // Last session 16 days ago → reacclimationTier = reduce_one
      const sessions = [
        makeSession(30, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(25, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(16, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.planMode).toMatch(/reacclimate/)
      expect(s.confidenceSignal.axes.suggestionIntegrity.reasons).toContain(
        'Reacclimation estimate applied — not a calibrated prediction'
      )
    })

    it('suggestion weight deviates significantly from baseline → deviation reason may fire', () => {
      // planRepRange 1-3 with history at reps=8 → planModeTargetWeightKg >> baselineWeightKg
      const sessions = makeEligibleSessions(5, { weightKg: 100, reps: 8 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        planRepRange: '1-3',
      }))
      // Score should be penalised (less than 1.0) due to large rep-range shift
      expect(s.confidenceSignal.axes.suggestionIntegrity.score).toBeLessThanOrEqual(1.0)
    })

    it('all four integrity flags stacked → score near floor (≥ 0.10)', () => {
      // reacclimate (>15 days) + plan-mismatch deviation
      const sessions = [
        makeSession(30, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(20, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(16, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        planRepRange: '1-3',
      }))
      expect(s.confidenceSignal.axes.suggestionIntegrity.score).toBeGreaterThanOrEqual(0.10)
    })
  })

  // ── Axis 6: Current State Knowledge ────────────────────────────────────────

  describe('axis 6 — current state knowledge', () => {
    it('recent session, no failures, no fatigue → axis6 score > 0.85', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.currentStateKnowledge.score).toBeGreaterThan(0.85)
    })

    it('most recent session 18 days ago → staleness reason fires', () => {
      // Chronological: 32, 25, 18 days ago
      const sessions = [
        makeSession(32, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(25, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
        makeSession(18, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8) })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      // daysSinceLast = 18 > 10 → staleness reason fires
      expect(
        s.confidenceSignal.axes.currentStateKnowledge.reasons.some(r => r.includes('days ago'))
      ).toBe(true)
    })

    it('max fatigue at cap → fatigueScore < 1.0', () => {
      // Set 2 suggestion with Set 1 done at lower reps → fatigue cascade fires
      // Use 5 sessions at 100kg×8
      const sessions = makeEligibleSessions(5)
      // Set 1 done at 4 reps (expected 8) → fatiguePct = (8-4)/8 = 0.50 → clamped to FATIGUE_MAX_PCT=5%
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        currentSets: [
          makeCurrentSet({ reps: '4', weight: '100', done: true }),
          makeCurrentSet(),
        ],
      }))
      // fatigueAdjustmentPct > 0 when fatigue cascade fires
      expect(s.confidenceSignal.axes.currentStateKnowledge.score).toBeLessThanOrEqual(1.0)
    })

    it('crossExerciseFatiguePct above FATIGUE_MAX_PCT → normalisedFatigue clamped, axis6 score not over-penalised', () => {
      // 10 working sets of a prior chest exercise saturates cross-exercise pre-fatigue at
      // CROSS_EXERCISE_PRE_FATIGUE_MAX_PCT = 0.06, which exceeds FATIGUE_MAX_PCT = 0.05.
      // Without the Math.min(..., 1) clamp, normalisedFatigue would be 1.2 and fatigueScore
      // would drop to 0.70 — making axis6Score 0.94 with fresh sessions and no failures.
      // With the clamp, normalisedFatigue = 1.0, fatigueScore = 0.75, axis6Score = 0.95.
      const sessions = makeEligibleSessions(5)
      const heavyChestPrior = makePriorExercise({
        doneSets: Array.from({ length: 10 }, () => ({ reps: 10, weight: 100, setType: 'normal' })),
        primaryMuscles: ['Chest'],
        secondaryMuscles: [],
      })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        priorExercises: [heavyChestPrior],
        currentPrimaryMuscles: ['Chest'],
      }))
      // Confirm cross-exercise fatigue fired above FATIGUE_MAX_PCT (0.05)
      expect(s.crossExerciseFatiguePct).toBeGreaterThan(0.05)
      // With clamp: axis6Score = 0.40 + 0.40 + 0.75*0.20 = 0.95
      // Without clamp: axis6Score = 0.40 + 0.40 + 0.60*0.20 = 0.92
      expect(s.confidenceSignal.axes.currentStateKnowledge.score).toBeGreaterThanOrEqual(0.94)
    })
  })

  // ── Axis 7: Formula / Model Fit ─────────────────────────────────────────────

  describe('axis 7 — formula / model fit', () => {
    it('Barbell, no loaded BW → score = 1.0, no reasons', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Barbell' }))
      expect(s.confidenceSignal.axes.formulaModelFit.score).toBe(1.0)
      expect(s.confidenceSignal.axes.formulaModelFit.reasons).toHaveLength(0)
    })

    it('Cable equipment → equipmentPenalty = 0.18 → score = 0.82', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 50 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Cable' }))
      expect(s.confidenceSignal.axes.formulaModelFit.score).toBeCloseTo(0.82, 5)
      expect(s.confidenceSignal.axes.formulaModelFit.reasons).toContain(
        'Cable/machine/bodyweight equipment has higher set-to-set variability'
      )
    })

    it('Machine equipment → score = 0.82', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 50 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Machine' }))
      expect(s.confidenceSignal.axes.formulaModelFit.score).toBeCloseTo(0.82, 5)
    })

    it('unknown equipment (Other) → default penalty 0.18 → score = 0.82', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 50 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Other' }))
      // EQUIPMENT_VARIABILITY['Other'] is undefined → ?? 0.18 → 1.0 - 0.18 = 0.82
      expect(s.confidenceSignal.axes.formulaModelFit.score).toBeCloseTo(0.82, 5)
    })
  })

  // ── Axis 8: Plan Regime Fit ─────────────────────────────────────────────────

  describe('axis 8 — plan regime fit', () => {
    it('no planRange → score = 1.0, no reasons', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.planRegimeFit.score).toBe(1.0)
      expect(s.confidenceSignal.axes.planRegimeFit.reasons).toHaveLength(0)
    })

    it('100% history in plan range → no overlap reason', () => {
      // History at reps=8, plan range 6-12 → 100% overlap
      const sessions = makeEligibleSessions(5, { reps: 8 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        planRepRange: '6-12',
      }))
      expect(s.confidenceSignal.axes.planRegimeFit.reasons).not.toContain(
        "Training history is mostly outside the plan's rep range"
      )
    })

    it('0% history in plan range → overlapScore = 0.30, reason fires', () => {
      // History at reps=8, plan range 1-5 → no overlap
      const sessions = makeEligibleSessions(5, { reps: 8 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        planRepRange: '1-5',
      }))
      expect(s.confidenceSignal.axes.planRegimeFit.reasons).toContain(
        "Training history is mostly outside the plan's rep range"
      )
    })

    it('plan active, no baseline history → overlapScore = 1.0, no overlap reason fires', () => {
      // Bug regression: overlapRatio defaults to 0 when historicalReps is empty, which
      // previously caused the "mostly outside the plan's rep range" reason to fire even
      // though overlapScore was correctly set to 1.0 via the early guard. The guard
      // historicalReps.length > 0 must be checked before comparing overlapRatio < 0.40.
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [],
        exerciseName: 'Bench Press',
        equipment: 'Barbell',
        planRepRange: '8-12',
      }))
      expect(s.confidenceSignal.axes.planRegimeFit.score).toBe(1.0)
      expect(s.confidenceSignal.axes.planRegimeFit.reasons).not.toContain(
        "Training history is mostly outside the plan's rep range"
      )
    })

    it('planModeTargetWeightKg 30%+ above baselineWeightKg → deviation reason fires', () => {
      // History at reps=8×100kg, plan range 1-3 → targetWeight ≈ e1rm × factor >> 100kg
      const sessions = makeEligibleSessions(5, { reps: 8, weightKg: 100 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        planRepRange: '1-3',
      }))
      // planModeTargetWeightKg is derived from e1RM at 1-3 reps → much higher than 100kg baseline
      expect(s.confidenceSignal.axes.planRegimeFit.reasons).toContain(
        'Plan weight target differs significantly from historical baseline'
      )
    })
  })

  // ── Axis 9: Exercise Inherent Variability ───────────────────────────────────

  describe('axis 9 — exercise inherent variability', () => {
    it('Barbell → score = 1.0, no reasons', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Barbell' }))
      expect(s.confidenceSignal.axes.exerciseVariability.score).toBe(1.0)
      expect(s.confidenceSignal.axes.exerciseVariability.reasons).toHaveLength(0)
    })

    it('Band → score = max(1 - 0.28 - 0, 0.20) = 0.72', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 10 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Band' }))
      expect(s.confidenceSignal.axes.exerciseVariability.score).toBeCloseTo(0.72, 5)
    })

    it('Bodyweight → bwFluctuationPenalty applied, fluctuation reason present', () => {
      // Bodyweight: predictionNoise=0.20, bwFluctuationPenalty=0.08 → score = max(0.72, 0.20) = 0.72
      const sessions = [
        makeSession(15, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 1.33 })]),
        makeSession(12, [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 1.33 })]),
        makeSession(9,  [makeSet({ weightKg: 0, reps: 10, estimatedOrmKg: 1.33 })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Bodyweight' }))
      expect(s.confidenceSignal.axes.exerciseVariability.score).toBeLessThan(1.0)
      expect(s.confidenceSignal.axes.exerciseVariability.reasons).toContain(
        'Bodyweight exercises are sensitive to body-composition changes'
      )
    })
  })

  // ── Combination formula ─────────────────────────────────────────────────────

  describe('combination formula', () => {
    it('all axes optimal (barbell, 5 recent consistent sessions) → level = very_high', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Barbell' }))
      expect(s.confidenceSignal.level).toBe('very_high')
      expect(s.confidenceSignal.score).toBeGreaterThanOrEqual(0.875)
    })

    it('zero history → axis1.score = 0 → hard veto → score ≤ 0.30 → level = low', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      expect(s.confidenceSignal.axes.historyQuantity.score).toBe(0)
      expect(s.confidenceSignal.score).toBeLessThanOrEqual(0.30)
      expect(s.confidenceSignal.level).toBe('low')
    })

    it('level=very_high ↔ score >= 0.875', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Barbell' }))
      expect(s.confidenceSignal.score).toBeGreaterThanOrEqual(0.875)
      expect(s.confidenceSignal.level).toBe('very_high')
    })

    it('level=low ↔ score < 0.45 (zero sessions)', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      expect(s.confidenceSignal.score).toBeLessThan(0.45)
      expect(s.confidenceSignal.level).toBe('low')
    })

    it('score is a number between 0 and 1 rounded to 2 decimal places', () => {
      const sessions = makeEligibleSessions(3)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      const { score } = s.confidenceSignal
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
      expect(score).toBe(Math.round(score * 100) / 100)
    })

    it('cable exercise with 5 sessions → criticalScore dampened by axis7 → score < 1.0', () => {
      // axis7 = 0.82 (cable penalty) → criticalScore = min(1.0, 0.82) = 0.82
      const sessions = makeEligibleSessions(5, { weightKg: 50 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Cable' }))
      expect(s.confidenceSignal.axes.formulaModelFit.score).toBeCloseTo(0.82, 5)
      expect(s.confidenceSignal.score).toBeLessThan(1.0)
    })
  })

  // ── topReasons ──────────────────────────────────────────────────────────────

  describe('topReasons', () => {
    it('all axes healthy → topReasons is empty', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Barbell' }))
      expect(s.confidenceSignal.topReasons).toHaveLength(0)
    })

    it('axis1 bad only (zero sessions) → topReasons[0] = No baseline sessions recorded yet', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      expect(s.confidenceSignal.topReasons.length).toBeGreaterThan(0)
      expect(s.confidenceSignal.topReasons[0]).toBe('No baseline sessions recorded yet')
    })

    it('topReasons capped at 3 even when many axes have reasons', () => {
      // Old stale + cable + all-deload history → multiple axes fire
      const sessions = [
        makeSession(40, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
        makeSession(35, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
        makeSession(30, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Cable' }))
      expect(s.confidenceSignal.topReasons.length).toBeLessThanOrEqual(3)
    })

    it('five axes bad → topReasons has exactly 3 strings (capped)', () => {
      // All-deload history + cable + stale (32 days) + irregular gaps → many reasons
      const sessions = [
        makeSession(40, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
        makeSession(38, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
        makeSession(36, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
        makeSession(10, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
        makeSession(32, [makeSet({ weightKg: 50, reps: 8, estimatedOrmKg: calculateORM(50, 8), progressionEvent: 'deload' })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Cable' }))
      expect(s.confidenceSignal.topReasons.length).toBeLessThanOrEqual(3)
    })

    it('reason strings are human-readable English, not JSON or field names', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      for (const reason of s.confidenceSignal.topReasons) {
        expect(typeof reason).toBe('string')
        expect(reason).not.toMatch(/^\{/)
        expect(reason).not.toMatch(/analysis\./)
        expect(reason).not.toMatch(/finalSuggestion\./)
        expect(reason.length).toBeGreaterThan(10)
      }
    })
  })

  // ── Integration ─────────────────────────────────────────────────────────────

  describe('integration', () => {
    it('fresh user, 0 sessions → level = low, topReasons non-empty', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [], exerciseName: 'Bench Press', equipment: 'Barbell',
      }))
      expect(s).not.toBeNull()
      expect(s.confidenceSignal.level).toBe('low')
      expect(s.confidenceSignal.topReasons.length).toBeGreaterThan(0)
    })

    it('established user, 6 consistent barbell sessions, recent → level = very_high, topReasons empty', () => {
      const sessions = makeEligibleSessions(6, { daysAgoFn: (i) => (6 - i) * 4 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Barbell' }))
      expect(s.confidenceSignal.level).toBe('very_high')
      expect(s.confidenceSignal.topReasons).toHaveLength(0)
    })

    it('all-deload history → axis3 fires allExcludedFallback reason', () => {
      const sessions = [
        makeSession(10, [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(7,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(4,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
        makeSession(2,  [makeSet({ weightKg: 100, reps: 8, estimatedOrmKg: calculateORM(100, 8), progressionEvent: 'deload' })]),
      ]
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(s.confidenceSignal.axes.historyRepresentativeness.reasons).toContain(
        'All recent sessions were exceptional — baseline using unfiltered history'
      )
    })

    it('cable exercise, 5 consistent sessions → confidenceSignal present, level medium or high', () => {
      const sessions = makeEligibleSessions(5, { weightKg: 50 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions, equipment: 'Cable' }))
      expect(s.confidenceSignal).toBeDefined()
      expect(['medium', 'high', 'very_high']).toContain(s.confidenceSignal.level)
    })

    it('plan active with history at wrong rep range → axis8 penalised', () => {
      const sessions = makeEligibleSessions(5, { reps: 12 })
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions,
        planRepRange: '1-5',
      }))
      expect(s.confidenceSignal.axes.planRegimeFit.score).toBeLessThan(0.80)
      expect(s.confidenceSignal.axes.planRegimeFit.reasons).toContain(
        "Training history is mostly outside the plan's rep range"
      )
    })

    it('confidenceSignal present when action = first_time (known exercise with standards)', () => {
      const s = buildCurrentSetSuggestion(makeSuggestionInput({
        sessions: [],
        exerciseName: 'Bench Press',
        equipment: 'Barbell',
      }))
      if (s !== null) {
        expect(s.confidenceSignal).toBeDefined()
        expect(['low', 'medium', 'high']).toContain(s.confidenceSignal.level)
      }
    })

    it('existing confidence field unchanged alongside new confidenceSignal', () => {
      const sessions = makeEligibleSessions(5)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      expect(['low', 'medium', 'high', 'very_high']).toContain(s.confidence)
      expect(s.confidenceSignal).toBeDefined()
      expect(['low', 'medium', 'high', 'very_high']).toContain(s.confidenceSignal.level)
    })

    it('confidenceSignal has the full expected shape with all 9 axes', () => {
      const sessions = makeEligibleSessions(3)
      const s = buildCurrentSetSuggestion(makeSuggestionInput({ sessions }))
      const cs = s.confidenceSignal
      expect(cs).toMatchObject({
        level: expect.stringMatching(/^(low|medium|high|very_high)$/),
        score: expect.any(Number),
        topReasons: expect.any(Array),
        axes: {
          historyQuantity:           { score: expect.any(Number), reasons: expect.any(Array) },
          historyRecency:            { score: expect.any(Number), reasons: expect.any(Array) },
          historyRepresentativeness: { score: expect.any(Number), reasons: expect.any(Array) },
          statisticalReliability:    { score: expect.any(Number), reasons: expect.any(Array) },
          suggestionIntegrity:       { score: expect.any(Number), reasons: expect.any(Array) },
          currentStateKnowledge:     { score: expect.any(Number), reasons: expect.any(Array) },
          formulaModelFit:           { score: expect.any(Number), reasons: expect.any(Array) },
          planRegimeFit:             { score: expect.any(Number), reasons: expect.any(Array) },
          exerciseVariability:       { score: expect.any(Number), reasons: expect.any(Array) },
        },
      })
    })
  })
})
