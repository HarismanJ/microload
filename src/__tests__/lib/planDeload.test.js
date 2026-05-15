import {
  applyScheduledDeloadToPlannedExercise,
  applyScheduledDeloadToPlanDay,
  applyScheduledDeloadToSuggestion,
  getActivePlanWeek,
  getDeloadIntervalFromPlan,
  isScheduledDeloadWeek,
} from '../../lib/planDeload.js'

describe('deload schedule detection', () => {
  it('reads explicit and policy-based deload intervals', () => {
    expect(getDeloadIntervalFromPlan({
      preferences: { periodization: { deloadInterval: '4' } },
    })).toBe(4)
    expect(getDeloadIntervalFromPlan({
      preferences: { periodization: { deloadPolicy: 'auto_6' } },
    })).toBe(6)
    expect(getDeloadIntervalFromPlan({
      preferences: { periodization: { deloadPolicy: 'auto_8' } },
    })).toBe(8)
    expect(getDeloadIntervalFromPlan({ preferences: { periodization: {} } })).toBeNull()
  })

  it('detects scheduled deload weeks', () => {
    const plan = { preferences: { periodization: { deloadInterval: 4 } } }
    expect(isScheduledDeloadWeek(plan, 4)).toBe(true)
    expect(isScheduledDeloadWeek(plan, 3)).toBe(false)
  })

  it('treats 14 elapsed days as active week 3', () => {
    expect(getActivePlanWeek(
      { started_at: '2026-05-01T00:00:00.000Z' },
      new Date('2026-05-15T00:00:00.000Z')
    )).toBe(3)
  })

  it('uses fallback week when dates are missing or before the plan start', () => {
    expect(getActivePlanWeek({}, new Date('2026-05-15T00:00:00.000Z'), 2)).toBe(2)
    expect(getActivePlanWeek(
      { started_at: '2026-05-20T00:00:00.000Z' },
      new Date('2026-05-15T00:00:00.000Z'),
      3
    )).toBe(3)
  })
})

describe('planned exercise deload transforms', () => {
  it('reduces cardio duration and sets', () => {
    expect(applyScheduledDeloadToPlannedExercise({
      category: 'Cardio',
      sets: 5,
      durationSeconds: 1200,
    })).toMatchObject({
      sets: 3,
      durationSeconds: 720,
      scheduledDeload: true,
      targetRir: 4,
    })
  })

  it('reduces strength sets and uses the low end of the rep range', () => {
    expect(applyScheduledDeloadToPlannedExercise({
      category: 'Strength',
      sets: 5,
      repRange: '8-12',
    })).toMatchObject({
      sets: 3,
      reps: 8,
      repRange: '8-12',
      scheduledDeload: true,
      targetRir: 4,
    })
  })

  it('handles object and direct rep ranges', () => {
    expect(applyScheduledDeloadToPlannedExercise({
      sets: 2,
      repRange: { low: 6, high: 8 },
    })).toMatchObject({ sets: 1, reps: 6, repRange: '6-8' })

    expect(applyScheduledDeloadToPlannedExercise({
      sets: 2,
      reps: 10,
    })).toMatchObject({ sets: 1, reps: 10, repRange: '10-10' })
  })

  it('applies a scheduled deload to an entire plan day', () => {
    expect(applyScheduledDeloadToPlanDay({
      exercises: [{ sets: 4, repRange: '8-12' }],
    }, 4)).toMatchObject({
      week: 4,
      scheduledDeload: true,
      deloadReason: 'scheduled',
      exercises: [{ sets: 2, reps: 8 }],
    })
  })

  it('adjusts progression suggestions during scheduled deloads', () => {
    expect(applyScheduledDeloadToSuggestion(
      { action: 'maintain', suggestedWeightKg: 100, suggestedReps: 10 },
      { planDeloadWeek: true, planWeek: 4, planRepRange: '6-10' }
    )).toMatchObject({
      action: 'deload',
      suggestedWeightKg: 87.5,
      suggestedReps: 6,
      planMode: 'scheduled_deload',
    })
  })

  it('leaves non-deload suggestions untouched', () => {
    const suggestion = { action: 'maintain', suggestedWeightKg: 100 }
    expect(applyScheduledDeloadToSuggestion(suggestion, {})).toBe(suggestion)
  })
})
