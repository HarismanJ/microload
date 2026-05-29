const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

const SCHEDULED_DELOAD_SET_MULTIPLIER = 0.5
const SCHEDULED_DELOAD_LOAD_MULTIPLIER = 0.875
const SCHEDULED_DELOAD_CARDIO_MULTIPLIER = 0.6
const SCHEDULED_DELOAD_TARGET_RIR = 4

export function getDeloadIntervalFromPlan(plan) {
  const periodization = plan?.preferences?.periodization || {}
  const direct = Number(periodization.deloadInterval)
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct)

  const policy = periodization.deloadPolicy
  if (policy === 'auto_4') return 4
  if (policy === 'auto_6') return 6
  if (policy === 'auto_8') return 8
  return null
}

function getPlanStartMs(plan) {
  const source = plan?.started_at || plan?.startedAt || plan?.created_at || plan?.createdAt || plan?.updated_at || plan?.updatedAt
  if (!source) return null
  const ms = new Date(source).getTime()
  return Number.isFinite(ms) ? ms : null
}

export function getActivePlanWeek(plan, now = new Date(), fallbackWeek = 1) {
  const fallback = Math.max(1, Math.round(Number(fallbackWeek) || 1))
  const startMs = getPlanStartMs(plan)
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs) || nowMs < startMs) return fallback
  return Math.max(1, Math.floor((nowMs - startMs) / MS_PER_WEEK) + 1)
}

export function isScheduledDeloadWeek(plan, planWeek) {
  const interval = getDeloadIntervalFromPlan(plan)
  const week = Math.max(1, Math.round(Number(planWeek) || 1))
  return Number.isFinite(interval) && interval > 0 && week > 0 && week % interval === 0
}

function reduceSetCount(sets) {
  return Math.max(1, Math.ceil((Number(sets) || 1) * SCHEDULED_DELOAD_SET_MULTIPLIER))
}

function reduceDurationSeconds(seconds) {
  const duration = Number(seconds)
  if (!Number.isFinite(duration) || duration <= 0) return seconds
  return Math.max(60, Math.round(duration * SCHEDULED_DELOAD_CARDIO_MULTIPLIER))
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

export function applyScheduledDeloadToPlannedExercise(exercise) {
  if (!exercise || typeof exercise !== 'object') return exercise

  if (exercise.category === 'Cardio') {
    return {
      ...exercise,
      sets: reduceSetCount(exercise.sets),
      durationSeconds: reduceDurationSeconds(exercise.durationSeconds),
      scheduledDeload: true,
      targetRir: SCHEDULED_DELOAD_TARGET_RIR,
    }
  }

  const range = parseRepRange(exercise.repRange, exercise.reps)
  return {
    ...exercise,
    sets: reduceSetCount(exercise.sets),
    reps: range ? range.low : exercise.reps,
    repRange: range ? `${range.low}-${range.high}` : exercise.repRange,
    scheduledDeload: true,
    targetRir: SCHEDULED_DELOAD_TARGET_RIR,
  }
}

export function applyScheduledDeloadToPlanDay(day, planWeek) {
  if (!day || typeof day !== 'object') return day
  const exercises = (day.exercises || []).map(applyScheduledDeloadToPlannedExercise)
  return {
    ...day,
    week: planWeek,
    scheduledDeload: true,
    deloadReason: 'scheduled',
    exercises,
  }
}

export function applyScheduledDeloadToSuggestion(suggestion, exercise, snapWeight = null) {
  if (!suggestion || !exercise?.planDeloadWeek) return suggestion

  const rawDeloadKg = Number.isFinite(Number(suggestion.suggestedWeightKg)) && Number(suggestion.suggestedWeightKg) > 0
    ? Number(suggestion.suggestedWeightKg) * SCHEDULED_DELOAD_LOAD_MULTIPLIER
    : null

  let suggestedWeightKg = suggestion.suggestedWeightKg
  if (rawDeloadKg !== null) {
    const snapped = typeof snapWeight === 'function' ? snapWeight(rawDeloadKg) : null
    suggestedWeightKg = Number.isFinite(snapped) ? snapped : Math.round(rawDeloadKg * 10) / 10
  }
  const range = parseRepRange(exercise.planRepRange, exercise.planTargetReps)
  const suggestedReps = range ? range.low : suggestion.suggestedReps

  return {
    ...suggestion,
    action: 'deload',
    suggestedWeightKg,
    suggestedReps,
    planMode: 'scheduled_deload',
    reasoning: `Scheduled deload week ${exercise.planWeek}: use about 50% of the planned sets, keep 3-5 reps in reserve, and use roughly 85-90% of normal load.`,
  }
}
