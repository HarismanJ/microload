import { VALIDATION_LIMITS } from './inputValidation'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getCompletedPlanExercises(exercises = []) {
  return exercises.filter(exercise => exercise?.planSource === 'training_plan')
}

function countPlannedSets(day) {
  return (day?.exercises || []).reduce((total, exercise) => total + (Number(exercise.sets) || 1), 0)
}

function countCompletedSets(exercises = []) {
  return exercises.reduce((total, exercise) => (
    total + (exercise.sets || []).filter(set => set?.done).length
  ), 0)
}

function parseRepRange(repRange, fallback = null) {
  if (repRange && typeof repRange === 'object') {
    const low = Number(repRange.low ?? repRange.lower ?? repRange.min)
    const high = Number(repRange.high ?? repRange.upper ?? repRange.max)
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low) return { low, high }
  }

  const text = String(repRange || '')
  const match = text.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (match) return { low: Number(match[1]), high: Number(match[2]) }

  const direct = Number(repRange || fallback)
  return Number.isFinite(direct) && direct > 0 ? { low: direct, high: direct } : null
}

function getStrengthCompletion(exercises = []) {
  let targetableSets = 0
  let hitTopRangeSets = 0
  let missedLowRangeSets = 0

  exercises.forEach(exercise => {
    if (exercise.category === 'Cardio') return
    const range = parseRepRange(exercise.planRepRange, exercise.planTargetReps)
    if (!range) return
    ;(exercise.sets || []).forEach(set => {
      if (!set?.done) return
      const reps = Number(set.reps)
      if (!Number.isFinite(reps)) return
      targetableSets += 1
      if (reps >= range.high) hitTopRangeSets += 1
      if (reps < range.low) missedLowRangeSets += 1
    })
  })

  return { targetableSets, hitTopRangeSets, missedLowRangeSets }
}

function createAdjustment(type, title, body, payload = {}) {
  return { type, title, body, payload }
}

export function buildPlanAdaptation({
  plan,
  day,
  exercises = [],
  durationSeconds = 0,
  sessionId = null,
  planWeek = null,
} = {}) {
  if (!plan?.id || !day?.id) return null

  const planExercises = getCompletedPlanExercises(exercises)
  if (!planExercises.length) return null

  const plannedSets = Math.max(1, countPlannedSets(day))
  const completedSets = countCompletedSets(planExercises)
  const completionRate = completedSets / plannedSets
  const plannedMinutes = Math.max(1, Number(day.estimatedMinutes || plan.session_minutes || 60))
  const actualMinutes = Math.max(1, Math.round((Number(durationSeconds) || 0) / 60))
  const durationRatio = actualMinutes / plannedMinutes
  const strengthCompletion = getStrengthCompletion(planExercises)
  const adjustments = []

  if (completionRate < 0.7) {
    adjustments.push(createAdjustment(
      'reduce_volume',
      'Trim the next pass',
      'You completed less than 70% of the planned sets, so reduce one accessory set before adding more work.',
      { setDelta: -1, dayId: day.id }
    ))
  }

  if (durationRatio > 1.25 && completedSets >= Math.ceil(plannedSets * 0.75)) {
    adjustments.push(createAdjustment(
      'trim_duration',
      'Tighten session length',
      'This session ran long, so trim the final accessory or shorten accessory rest targets.',
      { durationRatio, dayId: day.id }
    ))
  }

  if (strengthCompletion.targetableSets >= 3 && strengthCompletion.hitTopRangeSets / strengthCompletion.targetableSets >= 0.75) {
    adjustments.push(createAdjustment(
      'increase_target',
      'Progress next targets',
      'Most completed strength sets reached the top of the planned range, so this day is ready for a small progression.',
      { repDelta: 1, dayId: day.id }
    ))
  }

  if (strengthCompletion.targetableSets >= 3 && strengthCompletion.missedLowRangeSets / strengthCompletion.targetableSets >= 0.4) {
    adjustments.push(createAdjustment(
      'hold_or_reduce',
      'Hold the load',
      'Several sets landed below the planned range, so keep targets steady or reduce one accessory set.',
      { dayId: day.id }
    ))
  }

  if (!adjustments.length) {
    adjustments.push(createAdjustment(
      'keep_plan',
      'Stay the course',
      'The workout landed close enough to the plan that no structural change is needed yet.',
      { dayId: day.id }
    ))
  }

  const primary = adjustments[0]
  return {
    planId: plan.id,
    sessionId,
    planDayId: day.id,
    planWeek: Number(planWeek) || Number(day.week) || 1,
    status: 'pending',
    summary: primary.title,
    body: primary.body,
    metrics: {
      plannedSets,
      completedSets,
      completionRate: Math.round(completionRate * 100) / 100,
      plannedMinutes,
      actualMinutes,
      durationRatio: Math.round(durationRatio * 100) / 100,
      targetableSets: strengthCompletion.targetableSets,
      hitTopRangeSets: strengthCompletion.hitTopRangeSets,
      missedLowRangeSets: strengthCompletion.missedLowRangeSets,
    },
    adjustments,
  }
}

function adjustExerciseForIncrease(exercise) {
  if (exercise.category === 'Cardio' || exercise.durationSeconds) {
    return {
      ...exercise,
      durationSeconds: clamp((Number(exercise.durationSeconds) || 600) + 120, 60, VALIDATION_LIMITS.cardioDurationMaxSeconds),
    }
  }

  const range = parseRepRange(exercise.repRange, exercise.reps)
  if (!range) return exercise
  const nextHigh = clamp(range.high + 1, 1, 50)
  const nextLow = clamp(range.low + 1, 1, nextHigh)
  return {
    ...exercise,
    reps: nextHigh,
    repRange: `${nextLow}-${nextHigh}`,
  }
}

function adjustExerciseForReducedVolume(exercise) {
  if (exercise.role === 'main') return exercise
  const sets = Number(exercise.sets)
  if (!Number.isFinite(sets) || sets <= 2) return exercise
  return { ...exercise, sets: sets - 1 }
}

export function applyPlanAdaptation(plan, adaptation) {
  if (!plan || !adaptation?.adjustments?.length) return plan
  const dayId = adaptation.planDayId || adaptation.plan_day_id
  const actionable = adaptation.adjustments.filter(item => item.type !== 'keep_plan')
  if (!actionable.length) return plan

  return {
    ...plan,
    preferences: {
      ...(plan.preferences || {}),
      adaptiveCoach: {
        ...((plan.preferences || {}).adaptiveCoach || {}),
        enabled: true,
        style: 'guided',
        lastReviewedAt: new Date().toISOString(),
      },
    },
    days: (plan.days || []).map(day => {
      if (day.id !== dayId) return day
      let exercises = day.exercises || []
      actionable.forEach(adjustment => {
        if (adjustment.type === 'increase_target') {
          exercises = exercises.map(exercise => (
            exercise.role === 'main' || exercise.role === 'secondary'
              ? adjustExerciseForIncrease(exercise)
              : exercise
          ))
        }
        if (adjustment.type === 'reduce_volume' || adjustment.type === 'hold_or_reduce') {
          exercises = exercises.map(adjustExerciseForReducedVolume)
        }
        if (adjustment.type === 'trim_duration') {
          exercises = exercises.length > 3 ? exercises.slice(0, -1) : exercises
        }
      })
      return { ...day, exercises }
    }),
  }
}
