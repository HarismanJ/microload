import {
  applyPlanAdaptation,
  buildPlanAdaptation,
} from '../../lib/trainingPlanAdaptation.js'

const NOW = new Date('2026-05-14T12:00:00.000Z')

function makePlan(overrides = {}) {
  return {
    id: 'plan-1',
    session_minutes: 60,
    preferences: {
      theme: 'balanced',
      adaptiveCoach: { style: 'manual', previous: true },
    },
    days: [
      makeDay(),
      makeDay({ id: 'day-2', week: 2, exercises: [{ id: 'other-main', role: 'main', category: 'Strength', sets: 3, reps: 8, repRange: '6-8' }] }),
    ],
    ...overrides,
  }
}

function makeDay(overrides = {}) {
  return {
    id: 'day-1',
    week: 3,
    estimatedMinutes: 60,
    exercises: [
      { id: 'bench', role: 'main', category: 'Strength', sets: 3, reps: 10, repRange: '8-10' },
      { id: 'row', role: 'secondary', category: 'Strength', sets: 3, reps: 10, repRange: '8-10' },
      { id: 'curl', role: 'accessory', category: 'Strength', sets: 3, reps: 12, repRange: '10-12' },
      { id: 'bike', role: 'secondary', category: 'Cardio', sets: 1, durationSeconds: 600 },
    ],
    ...overrides,
  }
}

function makeCompletedExercise(overrides = {}) {
  const setReps = overrides.setReps || [9, 9, 9]
  return {
    id: 'bench',
    planSource: 'training_plan',
    category: 'Strength',
    planRepRange: '8-10',
    planTargetReps: 10,
    sets: setReps.map(reps => ({ done: true, reps })),
    ...overrides,
  }
}

function makeAdaptation(overrides = {}) {
  return {
    planDayId: 'day-1',
    adjustments: [
      { type: 'increase_target', title: 'Progress next targets', body: 'Ready to progress', payload: { dayId: 'day-1' } },
    ],
    ...overrides,
  }
}

describe('buildPlanAdaptation', () => {
  it('returns null for missing plan/day identity or no completed plan exercises', () => {
    const plan = makePlan()
    const day = makeDay()

    expect(buildPlanAdaptation({ plan: {}, day, exercises: [makeCompletedExercise()] })).toBeNull()
    expect(buildPlanAdaptation({ plan, day: {}, exercises: [makeCompletedExercise()] })).toBeNull()
    expect(buildPlanAdaptation({ plan, day, exercises: [] })).toBeNull()
    expect(buildPlanAdaptation({
      plan,
      day,
      exercises: [makeCompletedExercise({ planSource: 'manual' })],
    })).toBeNull()
  })

  it('ignores non-plan exercises and resolves plan week precedence', () => {
    const plan = makePlan()
    const day = makeDay({
      week: 4,
      estimatedMinutes: 45,
      exercises: [
        { id: 'bench', sets: 4 },
      ],
    })
    const exercises = [
      makeCompletedExercise({ setReps: [9, 9, 9] }),
      makeCompletedExercise({ id: 'manual', planSource: 'manual', setReps: [10, 10, 10, 10] }),
    ]

    const explicitWeek = buildPlanAdaptation({
      plan,
      day,
      exercises,
      durationSeconds: 45 * 60,
      sessionId: 'session-1',
      planWeek: 7,
    })
    const dayWeek = buildPlanAdaptation({ plan, day, exercises, durationSeconds: 45 * 60 })
    const fallbackWeek = buildPlanAdaptation({
      plan,
      day: { ...day, week: undefined },
      exercises,
      durationSeconds: 45 * 60,
    })

    expect(explicitWeek).toMatchObject({
      planId: 'plan-1',
      sessionId: 'session-1',
      planDayId: 'day-1',
      planWeek: 7,
      status: 'pending',
      summary: 'Stay the course',
      metrics: {
        plannedSets: 4,
        completedSets: 3,
        completionRate: 0.75,
        plannedMinutes: 45,
        actualMinutes: 45,
        durationRatio: 1,
        targetableSets: 3,
      },
      adjustments: [{ type: 'keep_plan' }],
    })
    expect(dayWeek.planWeek).toBe(4)
    expect(fallbackWeek.planWeek).toBe(1)
  })

  it('recommends reducing volume when completion is under 70%', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({
        exercises: [
          { id: 'bench', sets: 3 },
          { id: 'row', sets: 3 },
        ],
      }),
      exercises: [makeCompletedExercise({ setReps: [9, 9] })],
      durationSeconds: 45 * 60,
    })

    expect(adaptation.summary).toBe('Trim the next pass')
    expect(adaptation.adjustments.map(item => item.type)).toContain('reduce_volume')
    expect(adaptation.metrics).toMatchObject({
      plannedSets: 6,
      completedSets: 2,
      completionRate: 0.33,
    })
  })

  it('recommends trimming duration when the session runs long after enough completed work', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({
        estimatedMinutes: 40,
        exercises: [
          { id: 'bench', sets: 2 },
          { id: 'row', sets: 2 },
        ],
      }),
      exercises: [
        makeCompletedExercise({ setReps: [9, 9] }),
        makeCompletedExercise({ id: 'row', setReps: [9] }),
      ],
      durationSeconds: 52 * 60,
    })

    expect(adaptation.summary).toBe('Tighten session length')
    expect(adaptation.adjustments.map(item => item.type)).toContain('trim_duration')
    expect(adaptation.metrics).toMatchObject({
      plannedSets: 4,
      completedSets: 3,
      durationRatio: 1.3,
    })
  })

  it('ignores drop sets and warmups when counting planned strength completion', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({
        estimatedMinutes: 40,
        exercises: [{ id: 'bench', sets: 3 }],
      }),
      exercises: [
        makeCompletedExercise({
          sets: [
            { done: true, reps: 10 },
            { done: true, reps: 4, setType: 'dropset' },
            { done: true, reps: 10, setType: 'warmup' },
            { done: true, reps: 5, set_type: 'dropset' },
            { done: true, reps: 10, is_warmup: true },
            { done: true, reps: 10 },
          ],
        }),
      ],
      durationSeconds: 52 * 60,
    })

    expect(adaptation.summary).toBe('Trim the next pass')
    expect(adaptation.adjustments.map(item => item.type)).toContain('reduce_volume')
    expect(adaptation.adjustments.map(item => item.type)).not.toContain('trim_duration')
    expect(adaptation.metrics).toMatchObject({
      plannedSets: 3,
      completedSets: 2,
      completionRate: 0.67,
      targetableSets: 2,
      hitTopRangeSets: 2,
      missedLowRangeSets: 0,
    })
  })

  it('recommends increasing targets when most strength sets hit the top range', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 4 }] }),
      exercises: [
        makeCompletedExercise({ setReps: [10, 10, 10, 9] }),
      ],
      durationSeconds: 45 * 60,
    })

    expect(adaptation.summary).toBe('Progress next targets')
    expect(adaptation.adjustments.map(item => item.type)).toContain('increase_target')
    expect(adaptation.metrics).toMatchObject({
      targetableSets: 4,
      hitTopRangeSets: 3,
      missedLowRangeSets: 0,
    })
  })

  it('counts superset rows as planned strength working sets', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 3 }] }),
      exercises: [
        makeCompletedExercise({
          sets: [
            { done: true, reps: 10 },
            { done: true, reps: 10, setType: 'superset' },
            { done: true, reps: 10, set_type: 'superset' },
            { done: true, reps: 5, setType: 'dropset' },
            { done: true, reps: 10, setType: 'warmup' },
          ],
        }),
      ],
      durationSeconds: 45 * 60,
    })

    expect(adaptation.adjustments.map(item => item.type)).toContain('increase_target')
    expect(adaptation.metrics).toMatchObject({
      plannedSets: 3,
      completedSets: 3,
      completionRate: 1,
      targetableSets: 3,
      hitTopRangeSets: 3,
      missedLowRangeSets: 0,
    })
  })

  it('recommends holding or reducing when many strength sets miss the low range', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 5 }] }),
      exercises: [
        makeCompletedExercise({ setReps: [7, 7, 9, 9, 9] }),
      ],
      durationSeconds: 45 * 60,
    })

    expect(adaptation.summary).toBe('Hold the load')
    expect(adaptation.adjustments.map(item => item.type)).toContain('hold_or_reduce')
    expect(adaptation.metrics).toMatchObject({
      targetableSets: 5,
      hitTopRangeSets: 0,
      missedLowRangeSets: 2,
    })
  })

  it('uses keep_plan when the workout lands close enough to the plan', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 3 }] }),
      exercises: [makeCompletedExercise({ setReps: [9, 9, 9] })],
      durationSeconds: 45 * 60,
    })

    expect(adaptation).toMatchObject({
      summary: 'Stay the course',
      body: 'The workout landed close enough to the plan that no structural change is needed yet.',
      adjustments: [{ type: 'keep_plan' }],
      metrics: {
        completionRate: 1,
        durationRatio: 0.75,
      },
    })
  })
})

describe('applyPlanAdaptation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the original plan when there is no actionable adaptation', () => {
    const plan = makePlan()

    expect(applyPlanAdaptation(null, makeAdaptation())).toBeNull()
    expect(applyPlanAdaptation(plan, null)).toBe(plan)
    expect(applyPlanAdaptation(plan, { adjustments: [] })).toBe(plan)
    expect(applyPlanAdaptation(plan, makeAdaptation({
      adjustments: [{ type: 'keep_plan', title: 'Stay the course' }],
    }))).toBe(plan)
  })

  it('applies increase_target to main and secondary exercises and preserves preferences', () => {
    const plan = makePlan({
      preferences: {
        theme: 'balanced',
        focusAreas: ['Chest', 'Back'],
        schedule: { mode: 'fixed', trainingDays: ['mon', 'thu'] },
        periodization: { style: 'double_progression', deloadPolicy: 'adaptive' },
        adaptiveCoach: { style: 'manual', previous: true },
      },
    })

    const nextPlan = applyPlanAdaptation(plan, makeAdaptation())
    const [day, otherDay] = nextPlan.days

    expect(nextPlan.preferences).toMatchObject({
      theme: 'balanced',
      focusAreas: ['Chest', 'Back'],
      schedule: { mode: 'fixed', trainingDays: ['mon', 'thu'] },
      periodization: { style: 'double_progression', deloadPolicy: 'adaptive' },
      adaptiveCoach: {
        previous: true,
        enabled: true,
        style: 'guided',
        lastReviewedAt: NOW.toISOString(),
      },
    })
    expect(day.exercises[0]).toMatchObject({ id: 'bench', reps: 11, repRange: '9-11' })
    expect(day.exercises[1]).toMatchObject({ id: 'row', reps: 11, repRange: '9-11' })
    expect(day.exercises[2]).toMatchObject({ id: 'curl', reps: 12, repRange: '10-12' })
    expect(day.exercises[3]).toMatchObject({ id: 'bike', durationSeconds: 720 })
    expect(otherDay).toBe(plan.days[1])
  })

  it('accepts snake_case plan day ids', () => {
    const plan = makePlan()

    const nextPlan = applyPlanAdaptation(plan, makeAdaptation({
      planDayId: undefined,
      plan_day_id: 'day-1',
      adjustments: [{ type: 'reduce_volume' }],
    }))

    expect(nextPlan.days[0].exercises.map(exercise => exercise.sets)).toEqual([3, 2, 2, 1])
  })

  it('reduces non-main volume only when set counts are above two', () => {
    const plan = makePlan({
      days: [
        makeDay({
          exercises: [
            { id: 'main', role: 'main', category: 'Strength', sets: 5 },
            { id: 'secondary', role: 'secondary', category: 'Strength', sets: 3 },
            { id: 'small', role: 'accessory', category: 'Strength', sets: 2 },
            { id: 'invalid', role: 'accessory', category: 'Strength', sets: 'later' },
          ],
        }),
      ],
    })

    const nextPlan = applyPlanAdaptation(plan, makeAdaptation({
      adjustments: [{ type: 'hold_or_reduce' }],
    }))

    expect(nextPlan.days[0].exercises.map(exercise => exercise.sets)).toEqual([5, 2, 2, 'later'])
  })

  it('trims the final exercise only when the target day has more than three exercises', () => {
    const plan = makePlan({
      days: [
        makeDay({
          id: 'long-day',
          exercises: [
            { id: 'one', sets: 2 },
            { id: 'two', sets: 2 },
            { id: 'three', sets: 2 },
            { id: 'four', sets: 2 },
          ],
        }),
        makeDay({
          id: 'short-day',
          exercises: [
            { id: 'one', sets: 2 },
            { id: 'two', sets: 2 },
            { id: 'three', sets: 2 },
          ],
        }),
      ],
    })

    const trimmed = applyPlanAdaptation(plan, makeAdaptation({
      planDayId: 'long-day',
      adjustments: [{ type: 'trim_duration' }],
    }))
    const unchanged = applyPlanAdaptation(plan, makeAdaptation({
      planDayId: 'short-day',
      adjustments: [{ type: 'trim_duration' }],
    }))

    expect(trimmed.days[0].exercises.map(exercise => exercise.id)).toEqual(['one', 'two', 'three'])
    expect(unchanged.days[1].exercises.map(exercise => exercise.id)).toEqual(['one', 'two', 'three'])
  })

  it('applies multiple actionable adjustments in order to the matching day only', () => {
    const plan = makePlan()

    const nextPlan = applyPlanAdaptation(plan, makeAdaptation({
      adjustments: [
        { type: 'increase_target' },
        { type: 'reduce_volume' },
        { type: 'trim_duration' },
      ],
    }))

    expect(nextPlan.days[0].exercises.map(exercise => exercise.id)).toEqual(['bench', 'row', 'curl'])
    expect(nextPlan.days[0].exercises[0]).toMatchObject({ reps: 11, repRange: '9-11', sets: 3 })
    expect(nextPlan.days[0].exercises[1]).toMatchObject({ reps: 11, repRange: '9-11', sets: 2 })
    expect(nextPlan.days[0].exercises[2]).toMatchObject({ reps: 12, repRange: '10-12', sets: 2 })
    expect(nextPlan.days[1]).toBe(plan.days[1])
  })
})

describe('buildPlanAdaptation parseRepRange object and numeric inputs', () => {
  it('counts sets when planRepRange is an object with low/high keys', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 3 }] }),
      exercises: [makeCompletedExercise({ planRepRange: { low: 8, high: 10 }, setReps: [10, 10, 10] })],
      durationSeconds: 45 * 60,
    })
    expect(adaptation.metrics).toMatchObject({ targetableSets: 3, hitTopRangeSets: 3 })
    expect(adaptation.adjustments.map(a => a.type)).toContain('increase_target')
  })

  it('counts sets when planRepRange uses lower/upper aliases', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 3 }] }),
      exercises: [makeCompletedExercise({ planRepRange: { lower: 8, upper: 10 }, setReps: [10, 10, 10] })],
      durationSeconds: 45 * 60,
    })
    expect(adaptation.metrics).toMatchObject({ targetableSets: 3, hitTopRangeSets: 3 })
  })

  it('ignores sets when planRepRange object has an invalid low value', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 3 }] }),
      exercises: [makeCompletedExercise({
        planRepRange: { low: 0, high: 10 },
        planTargetReps: null,
        setReps: [10, 10, 10],
      })],
      durationSeconds: 45 * 60,
    })
    // low > 0 fails → falls through → Number({...}) = NaN → returns null → exercise skipped
    expect(adaptation.metrics).toMatchObject({ targetableSets: 0 })
  })

  it('counts sets when planRepRange is a bare number', () => {
    const adaptation = buildPlanAdaptation({
      plan: makePlan(),
      day: makeDay({ exercises: [{ id: 'bench', sets: 3 }] }),
      exercises: [makeCompletedExercise({
        planRepRange: 10,
        planTargetReps: null,
        setReps: [10, 10, 10],
      })],
      durationSeconds: 45 * 60,
    })
    // String('10') → no regex → Number(10) = 10 > 0 → { low: 10, high: 10 } → all hit top
    expect(adaptation.metrics).toMatchObject({ targetableSets: 3, hitTopRangeSets: 3 })
  })
})
