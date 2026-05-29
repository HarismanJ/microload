import { toKg, DEFAULT_BODYWEIGHT_KG } from './liftMath'
import { computeMuscleOverlapWeight } from './muscleWorkload'
import { ESTIMATED_ORM_REP_CAP, calculateORM } from './orm'
import { PLATE_EQUIPMENT, snapToPlates } from './plateUtils'
import { weightForOrm, getAnchors, anchorsOrNull } from './strengthStandards'

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_SESSION_LIMIT = 8
const GOAL_INFERENCE_LIMIT = 3
const FAILURE_WINDOW = 5
const FAILURE_COUNT_THRESHOLD = 3
const FAILURE_E1RM_DROP_PCT = 0.07
const PROGRESSION_E1RM_UP_PCT = 0.03
const PROGRESSION_BASELINE_MIN_COUNT = 2
const WEIGHT_INCREASE_PCT = 0.025
const DELOAD_WEIGHT_PCT = 0.05
const FATIGUE_MAX_PCT = 0.05
const CROSS_EXERCISE_PER_SET_RATE = 0.007
const CROSS_EXERCISE_DECAY = 0.60
const CROSS_EXERCISE_PRE_FATIGUE_MAX_PCT = 0.06
const WARMUP_E1RM_THRESHOLD = 0.80
const REACCLIMATION_HOLD_DAYS = 8
const REACCLIMATION_REDUCE_ONE_DAYS = 15
const REACCLIMATION_REDUCE_TWO_DAYS = 28
const SAME_LOAD_TOLERANCE_KG = 0.25
const PLAN_PERIODIZATION_STYLES = new Set(['double_progression', 'linear', 'undulating', 'maintenance', 'deload_aware'])
const PLAN_INTENSITY_TAGS = new Set(['standard', 'heavy', 'volume', 'light', 'maintenance'])
const PLAN_PROGRESSION_BIASES = new Set(['reps_first', 'load_first', 'maintenance', 'deload_aware'])
const BODYWEIGHT_PROGRESSION_MODES = new Set(['auto', 'reps', 'load'])
const BASELINE_EXCLUDED_PROGRESSION_EVENTS = new Set(['deload', 'reacclimate', 'fatigue_adjusted'])
const REACCLIMATION_PLAN_MODES = new Set(['reacclimate_hold', 'reacclimate_reduce_one', 'reacclimate_reduce_two'])
const FIRST_TIME_STANDARD_REPS = 8
const DEFAULT_STANDARDS_GENDER = 'male'

// Equipment variability: how much set-to-set loading noise the equipment introduces
// (used in axis 7 — formula / model fit)
const EQUIPMENT_VARIABILITY = {
  'Barbell':       0.00,
  'EZ Bar':        0.05,
  'Smith Machine': 0.05,
  'Plate Loaded':  0.05,
  'Dumbbell':      0.12,
  'Cable':         0.18,
  'Machine':       0.18,
  'Kettlebell':    0.20,
  'Bodyweight':    0.22,
  'Band':          0.30,
}

// Prediction noise: session-to-session capability variation by equipment
// (used in axis 9 — exercise inherent variability)
const PREDICTION_NOISE = {
  'Barbell':       0.00,
  'EZ Bar':        0.03,
  'Smith Machine': 0.05,
  'Plate Loaded':  0.05,
  'Dumbbell':      0.10,
  'Cable':         0.15,
  'Machine':       0.15,
  'Kettlebell':    0.18,
  'Bodyweight':    0.20,
  'Band':          0.28,
}

const WEIGHT_INCREMENTS_KG = {
  'Barbell': 2.5,
  'EZ Bar': 2.5,
  'Smith Machine': 2.5,
  'Plate Loaded': 2.5,
  'Dumbbell': 2.5,
  'Machine': 5.0,
  'Cable': 5.0,
  'Kettlebell': 4.0,
  'Bodyweight': 2.5,
  'Other': 2.5,
}

const WEIGHT_INCREMENTS_LBS = {
  'Barbell': 5,
  'EZ Bar': 5,
  'Smith Machine': 5,
  'Plate Loaded': 5,
  'Dumbbell': 5,
  'Machine': 5,
  'Cable': 5,
  'Kettlebell': 8,
  'Bodyweight': 5,
  'Other': 5,
}

// ─── Weight increment & snapping ─────────────────────────────────────────────

export function getWeightIncrement(equipment, unitPreference = 'kg', bilateral = false) {
  let increment
  if (unitPreference === 'lbs') {
    const lbs = WEIGHT_INCREMENTS_LBS[equipment] ?? 5
    increment = toKg(lbs, 'lbs')
  } else {
    increment = WEIGHT_INCREMENTS_KG[equipment] ?? 2.5
  }
  // Guard: only halve for per-side equipment (Dumbbell, Cable) — prevents accidental
  // halving on single-implement equipment like Barbell/Machine/EZ Bar.
  const perSideEquipment = equipment === 'Dumbbell' || equipment === 'Cable'
  return perSideEquipment && bilateral ? increment / 2 : increment
}

function roundToIncrement(weightKg, incrementKg, startingWeightKg = 0) {
  if (!incrementKg || incrementKg <= 0) return Math.round(weightKg * 10) / 10
  const phase = startingWeightKg > 0 ? startingWeightKg % incrementKg : 0
  return Math.round((weightKg - phase) / incrementKg) * incrementKg + phase
}

function roundToSignedIncrement(weightKg, incrementKg) {
  if (!incrementKg || incrementKg <= 0) return Math.round(weightKg * 10) / 10
  if (weightKg >= 0) return roundToIncrement(weightKg, incrementKg)
  return -roundToIncrement(Math.abs(weightKg), incrementKg)
}

function createWeightSnapper(equipment, unitPreference, incrementKg, overrideIncrement = false, startingWeightKg = 0) {
  return function snapWeight(weightKg) {
    if (weightKg === null || weightKg === undefined) return null
    if (!overrideIncrement && PLATE_EQUIPMENT.has(equipment)) {
      return snapToPlates(Math.max(0, weightKg), unitPreference, equipment)
    }
    if (equipment === 'Bodyweight') {
      return roundToSignedIncrement(weightKg, incrementKg)
    }
    const minWeight = startingWeightKg > 0 ? startingWeightKg : 0
    return roundToIncrement(Math.max(minWeight, weightKg), incrementKg, startingWeightKg)
  }
}

export function buildExerciseSnapWeight(equipment, unitPreference, customIncrementKg = null, customStartingWeightKg = null, bilateral = false) {
  const incrementKg = customIncrementKg ?? getWeightIncrement(equipment, unitPreference, bilateral)
  const startingWeightKg = customStartingWeightKg ?? 0
  const overrideIncrement = customIncrementKg !== null || (PLATE_EQUIPMENT.has(equipment) && startingWeightKg > 0)
  return createWeightSnapper(equipment, unitPreference, incrementKg, overrideIncrement, startingWeightKg)
}

// ─── Pure utilities ───────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function median(values = []) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function isFiniteNumber(value) {
  return Number.isFinite(value)
}

function stdDev(values) {
  if (values.length < 2) return 0
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function weightedMean(pairs) {
  const totalWeight = pairs.reduce((s, [, w]) => s + w, 0)
  if (totalWeight === 0) return 0
  return pairs.reduce((s, [v, w]) => s + v * w, 0) / totalWeight
}

function normalizeStandardsGender(gender) {
  return String(gender || '').toLowerCase() === 'female' ? 'female' : DEFAULT_STANDARDS_GENDER
}

function normalizePlanPeriodizationStyle(style) {
  return PLAN_PERIODIZATION_STYLES.has(style) ? style : null
}

function normalizePlanIntensityTag(tag) {
  return PLAN_INTENSITY_TAGS.has(tag) ? tag : null
}

function getDefaultProgressionBias(style, intensityTag) {
  if (style === 'maintenance') return 'maintenance'
  if (style === 'deload_aware') return 'deload_aware'
  if (style === 'linear' || intensityTag === 'heavy') return 'load_first'
  if (style || intensityTag) return 'reps_first'
  return null
}

function normalizePlanProgressionBias(bias, style, intensityTag) {
  if (PLAN_PROGRESSION_BIASES.has(bias)) return bias
  return getDefaultProgressionBias(style, intensityTag)
}

function normalizeBodyweightProgressionMode(mode) {
  return BODYWEIGHT_PROGRESSION_MODES.has(mode) ? mode : 'auto'
}

function getPlanFailureThreshold(progressionBias) {
  return progressionBias === 'deload_aware' ? Math.max(2, FAILURE_COUNT_THRESHOLD - 1) : FAILURE_COUNT_THRESHOLD
}

function calcOrmKg(weightKg, reps) {
  if (!reps || reps <= 0) return 0
  if (reps > ESTIMATED_ORM_REP_CAP) return null
  if (reps === 1) return weightKg
  return calculateORM(weightKg, reps)
}

// For loaded bodyweight (pull-up with vest, weighted dip), the stored
// estimatedOrmKg is an added-load-equivalent: calcORM(bw + added, reps) - bw.
// These two helpers perform the same inversion in that coordinate system so
// that e1RM comparisons and weight back-calculations stay consistent.

function calcAddedLoadE1rmKg(addedWeightKg, reps, bwKg) {
  const totalOrm = calcOrmKg(addedWeightKg + bwKg, reps)
  return isFiniteNumber(totalOrm) ? totalOrm - bwKg : null
}

function weightForAddedLoadOrm(addedLoadE1rmKg, reps, bwKg) {
  const totalWeight = weightForOrm(addedLoadE1rmKg + bwKg, reps)
  return isFiniteNumber(totalWeight) ? totalWeight - bwKg : null
}

function buildFirstTimeStandardSuggestion(analysis, equipment) {
  const {
    exerciseName,
    userGender,
    userBodyweightKg,
    snapWeight,
    objectiveLabel,
    repRangeText,
  } = analysis
  if (!exerciseName) return null

  const gender = normalizeStandardsGender(userGender)
  const anchors = anchorsOrNull()?.[gender]?.[exerciseName]
  const beginnerRatio = anchors?.[1]
  if (!isFiniteNumber(beginnerRatio) || beginnerRatio <= 0) return null

  const resolvedBodyweightKg = isFiniteNumber(userBodyweightKg) && userBodyweightKg > 0
    ? userBodyweightKg
    : DEFAULT_BODYWEIGHT_KG
  const reps = FIRST_TIME_STANDARD_REPS
  const beginnerOrmKg = beginnerRatio * resolvedBodyweightKg
  const rawWeightKg = equipment === 'Bodyweight'
    ? weightForAddedLoadOrm(beginnerOrmKg - resolvedBodyweightKg, reps, resolvedBodyweightKg)
    : weightForOrm(beginnerOrmKg, reps)

  if (!isFiniteNumber(rawWeightKg)) return null
  const boundedWeightKg = equipment === 'Bodyweight'
    ? Math.max(-resolvedBodyweightKg, rawWeightKg)
    : rawWeightKg
  const snappedWeightKg = snapWeight(boundedWeightKg)
  const finalWeightKg = equipment === 'Bodyweight' && isFiniteNumber(snappedWeightKg)
    ? Math.max(-resolvedBodyweightKg, snappedWeightKg)
    : snappedWeightKg
  if (!isFiniteNumber(finalWeightKg)) return null

  return {
    action: 'first_time',
    weightKg: finalWeightKg,
    reps,
    planMode: 'standard_start',
    reasoning: `${objectiveLabel} focus (${repRangeText}) — no prior history yet, so start from the Beginner strength standard converted to an 8-rep working weight.`,
    confidence: 'low',
    isBodyweightOnly: false,
    objectiveLabel,
    repRangeText,
  }
}

// ─── Rep range / objective helpers ───────────────────────────────────────────

function formatObjectiveLabel(objective) {
  if (objective === 'strength') return 'Strength'
  if (objective === 'endurance') return 'Endurance'
  return 'Hypertrophy'
}

function buildRepRangeFromCenter(centerValue) {
  const roundedCenter = clamp(Math.round(centerValue), 1, 100)

  if (roundedCenter <= 6) {
    const lower = clamp(roundedCenter - 1, 1, 6)
    const upper = clamp(roundedCenter + 1, lower, 6)
    return {
      objective: 'strength',
      center: roundedCenter,
      lower,
      upper,
      midpoint: Math.round((lower + upper) / 2),
      lowerHalfTarget: lower,
    }
  }

  if (roundedCenter <= 15) {
    const lower = clamp(roundedCenter - 2, 6, 15)
    const upper = clamp(roundedCenter + 2, lower, 15)
    return {
      objective: 'hypertrophy',
      center: roundedCenter,
      lower,
      upper,
      midpoint: Math.round((lower + upper) / 2),
      lowerHalfTarget: clamp(Math.floor((lower + upper) / 2), lower, upper),
    }
  }

  const enduranceCenter = Math.min(roundedCenter, ESTIMATED_ORM_REP_CAP)
  const lower = clamp(enduranceCenter - 3, 12, ESTIMATED_ORM_REP_CAP)
  const upper = clamp(enduranceCenter + 3, lower, ESTIMATED_ORM_REP_CAP)
  return {
    objective: 'endurance',
    center: enduranceCenter,
    lower,
    upper,
    midpoint: Math.round((lower + upper) / 2),
    lowerHalfTarget: clamp(Math.floor((lower + upper) / 2), lower, upper),
  }
}

function formatRepRange(repRange) {
  return `${repRange.lower}-${repRange.upper} reps`
}

function clampRepsToRange(reps, repRange) {
  if (!isFiniteNumber(reps)) return repRange.lower
  return clamp(Math.round(reps), repRange.lower, repRange.upper)
}

function getReacclimationTier(daysSinceLast) {
  if (!isFiniteNumber(daysSinceLast)) return 'none'
  if (daysSinceLast >= REACCLIMATION_REDUCE_TWO_DAYS) return 'reduce_two'
  if (daysSinceLast >= REACCLIMATION_REDUCE_ONE_DAYS) return 'reduce_one'
  if (daysSinceLast >= REACCLIMATION_HOLD_DAYS) return 'hold'
  return 'none'
}

function isBaselineEligibleEntry(entry) {
  if (
    entry?.set?.progressionEvent === 'fatigue_adjusted' &&
    isFiniteNumber(entry?.set?.estimatedFreshOrmKg) &&
    entry.set.estimatedFreshOrmKg > 0
  ) {
    return true
  }
  return !BASELINE_EXCLUDED_PROGRESSION_EVENTS.has(entry?.set?.progressionEvent)
}

function getBaselineSetHistory(setHistory) {
  const eligible = setHistory.filter(isBaselineEligibleEntry)
  return eligible.length > 0 ? eligible : setHistory
}

// ─── DB row → set object ──────────────────────────────────────────────────────

function buildSessionSet(record) {
  const unit = record.unit || 'kg'
  const weight = record.weight === null || record.weight === undefined ? null : Number(record.weight)
  const reps = record.reps === null || record.reps === undefined ? null : Number(record.reps)
  const weightKg = weight === null ? null : toKg(weight, unit)
  const shouldUseStoredOrm = record.estimated_1rm !== null &&
    record.estimated_1rm !== undefined &&
    (!isFiniteNumber(reps) || reps <= ESTIMATED_ORM_REP_CAP)
  const storedOrm = shouldUseStoredOrm ? toKg(Number(record.estimated_1rm), unit) : null
  const estimatedFreshOrmKg = (() => {
    if (record.estimated_fresh_1rm === null || record.estimated_fresh_1rm === undefined) return null
    const raw = toKg(Number(record.estimated_fresh_1rm), unit)
    return isFiniteNumber(raw) && raw > 0 ? raw : null
  })()
  const estimatedOrmKg = storedOrm ?? (
    isFiniteNumber(weightKg) && isFiniteNumber(reps) && reps > 0
      ? calcOrmKg(weightKg, reps)
      : null
  )
  const completedAt = record.completed_at || record.created_at || null
  const rawRest = record.rest_before_seconds
  const restBeforeSeconds = rawRest === null || rawRest === undefined
    ? null
    : Math.max(0, Number(rawRest) || 0)

  return {
    weight,
    weightKg,
    reps,
    unit,
    estimated_1rm: record.estimated_1rm === null || record.estimated_1rm === undefined ? null : Number(record.estimated_1rm),
    estimated_fresh_1rm: record.estimated_fresh_1rm === null || record.estimated_fresh_1rm === undefined ? null : Number(record.estimated_fresh_1rm),
    estimatedFreshOrmKg,
    estimatedOrmKg,
    duration_seconds: record.duration_seconds === null || record.duration_seconds === undefined ? null : Number(record.duration_seconds),
    set_number: Number(record.set_number) || 1,
    completed_at: completedAt,
    rest_before_seconds: isFiniteNumber(restBeforeSeconds) ? restBeforeSeconds : null,
    progressionEvent: record.progression_event ?? null,
    isWarmup: record.is_warmup ?? false,
    setType: record.is_warmup ? 'warmup' : (record.set_type ?? 'normal'),
    setGroupIndex: record.set_group_index ?? null,
  }
}

// ─── fetchRecentSessions ──────────────────────────────────────────────────────

async function fetchRecentSessionsBatch(userId, exerciseIds, supabase, currentSessionId = null) {
  if (!exerciseIds.length || !userId) return { sessionsByExercise: {}, error: null }

  try {
    await getAnchors()
  } catch (error) {
    return { sessionsByExercise: {}, error }
  }

  const rpcExerciseIds = exerciseIds
    .map(id => Number(id))
    .filter(id => Number.isInteger(id))
  if (!rpcExerciseIds.length) return { sessionsByExercise: {}, error: null }

  let result
  try {
    result = await supabase.rpc('get_recent_progressive_overload_sets', {
      p_exercise_ids: rpcExerciseIds,
      p_session_limit: HISTORY_SESSION_LIMIT,
      p_exclude_session_id: currentSessionId || null,
    })
  } catch (error) {
    return { sessionsByExercise: {}, error }
  }

  const { data, error } = result
  if (error) return { sessionsByExercise: {}, error }
  if (!data?.length) return { sessionsByExercise: {}, error: null }

  try {
    const groupedByExercise = {}

    for (const row of data) {
      const normalizedRow = {
        ...row,
        workout_sessions: row.workout_sessions ?? { started_at: row.session_started_at },
      }
      const exerciseId = row.exercise_id
      const sessionId = row.session_id
      if (!groupedByExercise[exerciseId]) groupedByExercise[exerciseId] = new Map()
      if (!groupedByExercise[exerciseId].has(sessionId)) {
        groupedByExercise[exerciseId].set(sessionId, {
          sessionId,
          sessionDate: new Date(normalizedRow.workout_sessions.started_at),
          sets: [],
        })
      }
      groupedByExercise[exerciseId].get(sessionId).sets.push(buildSessionSet(normalizedRow))
    }

    const sessionsByExercise = {}
    for (const exerciseId of Object.keys(groupedByExercise)) {
      const sessions = [...groupedByExercise[exerciseId].values()]
        .sort((a, b) => a.sessionDate - b.sessionDate)
        .slice(-HISTORY_SESSION_LIMIT)

      for (const session of sessions) {
        session.sets.sort((a, b) => a.set_number - b.set_number)
      }
      sessionsByExercise[exerciseId] = sessions
    }

    return { sessionsByExercise, error: null }
  } catch (error) {
    return { sessionsByExercise: {}, error }
  }
}

export async function fetchRecentSessionsWithStatus(userId, exerciseIds, supabase, currentSessionId = null) {
  const requestedIds = [...new Set((exerciseIds || []).filter(Boolean))]
  const emptyResult = { sessionsByExercise: {}, statusByExercise: {} }
  if (!requestedIds.length || !userId) return emptyResult

  const initial = await fetchRecentSessionsBatch(userId, requestedIds, supabase, currentSessionId)
  if (initial.error) {
    return {
      sessionsByExercise: {},
      statusByExercise: Object.fromEntries(requestedIds.map(id => [id, 'error'])),
    }
  }

  const sessionsByExercise = { ...initial.sessionsByExercise }
  const statusByExercise = {}

  for (const exerciseId of requestedIds) {
    if (sessionsByExercise[exerciseId]?.length) {
      statusByExercise[exerciseId] = 'loaded'
    } else {
      sessionsByExercise[exerciseId] = []
      statusByExercise[exerciseId] = 'empty'
    }
  }

  return { sessionsByExercise, statusByExercise }
}

export async function fetchRecentSessions(userId, exerciseIds, supabase, currentSessionId = null) {
  const { sessionsByExercise } = await fetchRecentSessionsWithStatus(userId, exerciseIds, supabase, currentSessionId)
  return Object.fromEntries(
    Object.entries(sessionsByExercise).filter(([, sessions]) => sessions.length > 0)
  )
}

// ─── parseLoggedStrengthSet ───────────────────────────────────────────────────

function parseLoggedStrengthSet(set, unitPreference) {
  const parsedReps = Number.parseInt(set?.reps, 10)
  const reps = Number.isFinite(parsedReps) ? parsedReps : null

  const hasWeightValue = set?.weight !== '' && set?.weight !== null && set?.weight !== undefined
  const parsedWeight = hasWeightValue ? Number.parseFloat(set.weight) : null
  const weightKg = parsedWeight === null || !Number.isFinite(parsedWeight)
    ? null
    : toKg(parsedWeight, unitPreference)

  return { reps, weightKg }
}

function hasExternalBodyweightLoad(weightKg) {
  return isFiniteNumber(weightKg) && Math.abs(weightKg) >= SAME_LOAD_TOLERANCE_KG
}

function inferBodyweightProgressionMode({
  equipment,
  requestedMode,
  currentSet,
  previousCurrentSets = [],
  setHistory = [],
  unitPreference,
}) {
  const normalized = normalizeBodyweightProgressionMode(requestedMode)
  if (equipment !== 'Bodyweight') return 'load'
  if (normalized === 'reps' || normalized === 'load') return normalized

  const current = parseLoggedStrengthSet(currentSet, unitPreference)
  if (isFiniteNumber(current.weightKg)) {
    return hasExternalBodyweightLoad(current.weightKg) ? 'load' : 'reps'
  }

  const hasCurrentSessionLoad = previousCurrentSets.some(set => {
    const parsed = parseLoggedStrengthSet(set, unitPreference)
    return hasExternalBodyweightLoad(parsed.weightKg)
  })
  if (hasCurrentSessionLoad) return 'load'

  const hasHistoricalLoad = setHistory.some(entry => hasExternalBodyweightLoad(entry?.set?.weightKg))
  return hasHistoricalLoad ? 'load' : 'reps'
}

// ─── Per-set history extraction ───────────────────────────────────────────────

function getSetHistoryByIndex(sessions, setIndex) {
  const result = []

  for (const session of sessions) {
    const allSets = (session.sets || []).filter(s =>
      isFiniteNumber(s.reps) && s.reps > 0 && isFiniteNumber(s.weightKg)
    )
    const countedSets = allSets.filter(s => s.setType !== 'dropset' && !s.isWarmup)
    if (!countedSets.length) continue

    // Find best e1RM in counted pool for untagged-warmup exclusion
    let sessionBestOrmKg = 0
    let bestIdx = -1
    countedSets.forEach((s, i) => {
      if (isFiniteNumber(s.estimatedOrmKg) && s.estimatedOrmKg > sessionBestOrmKg) {
        sessionBestOrmKg = s.estimatedOrmKg
        bestIdx = i
      }
    })

    const targetSet = countedSets[setIndex]
    if (!targetSet) continue
    if (!isFiniteNumber(targetSet.weightKg)) continue

    // Warmup exclusion: before the peak set AND e1RM < 80% of session best
    if (
      sessionBestOrmKg > 0 &&
      bestIdx !== -1 &&
      setIndex < bestIdx &&
      isFiniteNumber(targetSet.estimatedOrmKg) &&
      targetSet.estimatedOrmKg < sessionBestOrmKg * WARMUP_E1RM_THRESHOLD
    ) {
      continue
    }

    result.push({ session, set: targetSet })
  }

  return result
}

// ─── Plan range parsing ───────────────────────────────────────────────────────

function parsePlanRange(planRepRange, planTargetReps) {
  if (planRepRange) {
    const match = String(planRepRange).match(/(\d+)\s*[-–]\s*(\d+)/)
    if (match) {
      const low = Number(match[1])
      const high = Number(match[2])
      if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low) {
        return { low, high }
      }
    }
  }
  const direct = Number(planTargetReps)
  if (Number.isFinite(direct) && direct > 0) {
    return { low: direct, high: direct }
  }
  return null
}

// ─── Per-set objective profile ────────────────────────────────────────────────

function inferSetObjectiveProfile(setHistory, planRange) {
  if (planRange) {
    const midpoint = Math.round((planRange.low + planRange.high) / 2)
    const base = buildRepRangeFromCenter(midpoint)
    return {
      ...base,
      center: midpoint,
      lower: planRange.low,
      upper: planRange.high,
      midpoint,
      lowerHalfTarget: clamp(
        Math.floor((planRange.low + planRange.high) / 2),
        planRange.low,
        planRange.high
      ),
    }
  }

  const recentReps = setHistory
    .slice(-GOAL_INFERENCE_LIMIT)
    .map(entry => entry.set.reps)
    .filter(reps => isFiniteNumber(reps) && reps > 0)

  const center = median(recentReps)
  if (isFiniteNumber(center)) return buildRepRangeFromCenter(center)

  return buildRepRangeFromCenter(8)
}

// ─── Expected e1RM ────────────────────────────────────────────────────────────

function getSetExpectedE1rmKg(setHistory) {
  const values = setHistory
    .slice(-FAILURE_WINDOW)
    .map(getCapabilityE1rmKg)
    .filter(v => isFiniteNumber(v) && v > 0)
  return values.length > 0 ? median(values) : null
}

function getProgressionExpectedE1rmKg(setHistory) {
  const values = setHistory
    .slice(0, -2)
    .slice(-FAILURE_WINDOW)
    .map(getCapabilityE1rmKg)
    .filter(v => isFiniteNumber(v) && v > 0)
  return values.length >= PROGRESSION_BASELINE_MIN_COUNT ? median(values) : null
}

function getFailureExpectedE1rmKg(setHistory) {
  // Exclude the most recent FAILURE_COUNT_THRESHOLD entries from the baseline so a
  // sustained drop cannot pull the median below the failing sessions themselves,
  // making them disappear as failures. Returns null when prior history is too short
  // to form a baseline (caller falls back to the standard expectedE1rmKg).
  const window = setHistory.slice(-FAILURE_WINDOW)
  const priorOnly = window.slice(0, -FAILURE_COUNT_THRESHOLD)
  const values = priorOnly
    .map(getCapabilityE1rmKg)
    .filter(v => isFiniteNumber(v) && v > 0)
  return values.length > 0 ? median(values) : null
}

function getCapabilityE1rmKg(entry) {
  if (
    entry?.set?.progressionEvent === 'fatigue_adjusted' &&
    isFiniteNumber(entry?.set?.estimatedFreshOrmKg) &&
    entry.set.estimatedFreshOrmKg > 0
  ) {
    return entry.set.estimatedFreshOrmKg
  }
  return entry?.set?.estimatedOrmKg
}

// ─── Deload boundary ──────────────────────────────────────────────────────────

function findDeloadBoundaryIndex(setHistory) {
  for (let i = setHistory.length - 1; i >= 0; i--) {
    if (setHistory[i].set.progressionEvent === 'deload') return i
  }
  return -1
}

// ─── Failure counting ─────────────────────────────────────────────────────────

function countSetFailures(setHistory, expectedE1rmKg, evidenceHistory = setHistory) {
  if (!isFiniteNumber(expectedE1rmKg) || expectedE1rmKg <= 0) {
    return { count: 0, total: 0, postDeloadGuard: false }
  }

  const boundaryIndex = findDeloadBoundaryIndex(setHistory)
  const postDeloadEntries = boundaryIndex === -1
    ? setHistory
    : setHistory.slice(boundaryIndex + 1)
  const evidenceSet = new Set(evidenceHistory)
  const postDeloadEvidence = boundaryIndex === -1
    ? evidenceHistory
    : postDeloadEntries.filter(entry => evidenceSet.has(entry))

  if (boundaryIndex !== -1 && postDeloadEntries.length < 2) {
    return { count: 0, total: 0, postDeloadGuard: true }
  }

  const window = postDeloadEvidence.slice(-FAILURE_WINDOW)
  const threshold = expectedE1rmKg * (1 - FAILURE_E1RM_DROP_PCT)
  let count = 0
  for (const entry of window) {
    const capabilityE1rmKg = getCapabilityE1rmKg(entry)
    if (isFiniteNumber(capabilityE1rmKg) && capabilityE1rmKg < threshold) count++
  }

  return { count, total: window.length, postDeloadGuard: false }
}

function countBodyweightRepFailures(setHistory, expectedReps, evidenceHistory = setHistory) {
  if (!isFiniteNumber(expectedReps) || expectedReps <= 0) {
    return { count: 0, total: 0, postDeloadGuard: false }
  }

  const boundaryIndex = findDeloadBoundaryIndex(setHistory)
  const postDeloadEntries = boundaryIndex === -1
    ? setHistory
    : setHistory.slice(boundaryIndex + 1)
  const evidenceSet = new Set(evidenceHistory)
  const postDeloadEvidence = boundaryIndex === -1
    ? evidenceHistory
    : postDeloadEntries.filter(entry => evidenceSet.has(entry))

  if (boundaryIndex !== -1 && postDeloadEntries.length < 2) {
    return { count: 0, total: 0, postDeloadGuard: true }
  }

  const window = postDeloadEvidence.slice(-FAILURE_WINDOW)
  const threshold = expectedReps * (1 - FAILURE_E1RM_DROP_PCT)
  let count = 0
  for (const entry of window) {
    if (isFiniteNumber(entry.set.reps) && entry.set.reps < threshold) count++
  }

  return { count, total: window.length, postDeloadGuard: false }
}

// ─── Progression trigger ──────────────────────────────────────────────────────

function checkSetProgressionTrigger(setHistory, objectiveProfile, progressionExpectedE1rmKg) {
  if (setHistory.length < 2) return { triggered: false, reason: null }

  const last2 = setHistory.slice(-2)

  const triggerA = last2.every(entry =>
    isFiniteNumber(entry.set.reps) && entry.set.reps >= objectiveProfile.upper
  )
  if (triggerA) return { triggered: true, reason: 'rep_ceiling' }

  if (isFiniteNumber(progressionExpectedE1rmKg) && progressionExpectedE1rmKg > 0) {
    const e1rmThreshold = progressionExpectedE1rmKg * (1 + PROGRESSION_E1RM_UP_PCT)
    const triggerB = last2.every(entry =>
      isFiniteNumber(getCapabilityE1rmKg(entry)) && getCapabilityE1rmKg(entry) >= e1rmThreshold
    )
    if (triggerB) return { triggered: true, reason: 'e1rm_above' }
  }

  return { triggered: false, reason: null }
}

function hasTwoCleanPlanTargetHits(baselineSetHistory, targetReps) {
  if (!isFiniteNumber(targetReps)) return false
  const recent = baselineSetHistory.filter(entry => entry?.set?.progressionEvent !== 'fatigue_adjusted').slice(-2)
  return recent.length === 2 && recent.every(entry =>
    isFiniteNumber(entry.set.reps) && entry.set.reps >= targetReps
  )
}

// ─── Per-set analysis ─────────────────────────────────────────────────────────

function buildSetConfidence(setHistory) {
  const n = setHistory.length
  if (n >= 5) return 'high'
  if (n >= 3) return 'medium'
  return 'low'
}

function analyzeSetHistory(
  setHistory,
  setIndex,
  equipment,
  unitPreference,
  planRange,
  userBodyweightKg,
  isFallbackFromPrior,
  customIncrementKg = null,
  customStartingWeightKg = null,
  planPeriodizationStyle = null,
  planIntensityTag = null,
  planProgressionBias = null,
  bodyweightProgressionMode = 'auto',
  exerciseName = null,
  userGender = null,
  bilateral = false,
) {
  const normalizedPlanStyle = normalizePlanPeriodizationStyle(planPeriodizationStyle)
  const normalizedIntensityTag = normalizePlanIntensityTag(planIntensityTag)
  const normalizedProgressionBias = normalizePlanProgressionBias(planProgressionBias, normalizedPlanStyle, normalizedIntensityTag)
  const incrementKg = customIncrementKg ?? getWeightIncrement(equipment, unitPreference, bilateral)
  const snapWeight = buildExerciseSnapWeight(equipment, unitPreference, customIncrementKg, customStartingWeightKg, bilateral)
  const baselineSetHistory = getBaselineSetHistory(setHistory)
  const objectiveProfile = inferSetObjectiveProfile(baselineSetHistory, planRange)
  const expectedE1rmKg = getSetExpectedE1rmKg(baselineSetHistory)
  const progressionExpectedE1rmKg = getProgressionExpectedE1rmKg(baselineSetHistory)
  const failureExpectedE1rmKg = getFailureExpectedE1rmKg(baselineSetHistory) ?? expectedE1rmKg
  const failures = countSetFailures(setHistory, failureExpectedE1rmKg, baselineSetHistory)
  const progressionTrigger = checkSetProgressionTrigger(baselineSetHistory, objectiveProfile, progressionExpectedE1rmKg)

  const lastEntry = setHistory.at(-1)
  const daysSinceLast = lastEntry
    ? (Date.now() - lastEntry.session.sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    : null
  const reacclimationTier = getReacclimationTier(daysSinceLast)

  const baselineEntry = baselineSetHistory.at(-1)
  const baselineWeightKg = baselineEntry && isFiniteNumber(baselineEntry.set.weightKg)
    ? snapWeight(baselineEntry.set.weightKg)
    : null
  const baselineReps = clampRepsToRange(
    baselineEntry?.set?.reps ?? objectiveProfile.center,
    objectiveProfile
  )

  const normalizedBodyweightMode = normalizeBodyweightProgressionMode(bodyweightProgressionMode)
  const bodyweightHasExternalLoadHistory = equipment === 'Bodyweight'
    && setHistory.some(entry => hasExternalBodyweightLoad(entry?.set?.weightKg))
  const isBodyweightOnly = equipment === 'Bodyweight'
    && setHistory.length > 0
    && normalizedBodyweightMode !== 'load'
    && (
      normalizedBodyweightMode === 'reps' ||
      !bodyweightHasExternalLoadHistory
    )
  const isLoadedBodyweight = equipment === 'Bodyweight' && !isBodyweightOnly
  const bodyweightLoadNeedsFirstIncrement = equipment === 'Bodyweight' &&
    normalizedBodyweightMode === 'load' &&
    setHistory.length > 0 &&
    !bodyweightHasExternalLoadHistory

  let planModeTargetReps = null
  let planModeTargetWeightKg = null

  if (planRange && !isBodyweightOnly) {
    if (baselineSetHistory.length > 0 && isFiniteNumber(expectedE1rmKg) && expectedE1rmKg > 0) {
      const recentReps = baselineSetHistory
        .slice(-GOAL_INFERENCE_LIMIT)
        .map(e => e.set.reps)
        .filter(r => isFiniteNumber(r) && r > 0)
      const historicalMedianReps = median(recentReps)
      planModeTargetReps = isFiniteNumber(historicalMedianReps)
        ? clamp(Math.round(historicalMedianReps), planRange.low, planRange.high)
        : Math.round((planRange.low + planRange.high) / 2)
      const bwKg = isLoadedBodyweight
        ? (isFiniteNumber(userBodyweightKg) && userBodyweightKg > 0 ? userBodyweightKg : DEFAULT_BODYWEIGHT_KG)
        : null
      const rawWeight = bwKg !== null
        ? weightForAddedLoadOrm(expectedE1rmKg, planModeTargetReps, bwKg)
        : weightForOrm(expectedE1rmKg, planModeTargetReps)
      planModeTargetWeightKg = isFiniteNumber(rawWeight) && rawWeight > 0
        ? snapWeight(rawWeight)
        : null
      if (bodyweightLoadNeedsFirstIncrement && isFiniteNumber(planModeTargetWeightKg) && planModeTargetWeightKg > 0) {
        planModeTargetWeightKg = Math.min(planModeTargetWeightKg, snapWeight(incrementKg))
      }
    } else if (baselineSetHistory.length === 0) {
      planModeTargetReps = Math.round((planRange.low + planRange.high) / 2)
    }
  } else if (planRange && isBodyweightOnly) {
    const recentReps = baselineSetHistory
      .slice(-GOAL_INFERENCE_LIMIT)
      .map(e => e.set.reps)
      .filter(r => isFiniteNumber(r) && r > 0)
    const historicalMedianReps = median(recentReps)
    planModeTargetReps = isFiniteNumber(historicalMedianReps)
      ? clamp(Math.round(historicalMedianReps), planRange.low, planRange.high)
      : Math.round((planRange.low + planRange.high) / 2)
  }

  const objectiveLabel = formatObjectiveLabel(objectiveProfile?.objective)
  const repRangeText = objectiveProfile ? formatRepRange(objectiveProfile) : ''

  return {
    objectiveProfile,
    equipment,
    expectedE1rmKg,
    failures,
    progressionTrigger,
    reacclimationTier,
    daysSinceLast,
    baselineWeightKg,
    baselineReps,
    planModeTargetReps,
    planModeTargetWeightKg,
    incrementKg,
    snapWeight,
    confidence: buildSetConfidence(setHistory),
    isBodyweightOnly,
    isLoadedBodyweight,
    bodyweightProgressionMode: normalizedBodyweightMode,
    bodyweightHasExternalLoadHistory,
    bodyweightLoadNeedsFirstIncrement,
    isFallbackFromPrior: Boolean(isFallbackFromPrior),
    planPeriodizationStyle: normalizedPlanStyle,
    planIntensityTag: normalizedIntensityTag,
    planProgressionBias: normalizedProgressionBias,
    planRange,
    objectiveLabel,
    repRangeText,
    setHistory,
    baselineSetHistory,
    exerciseName,
    userGender,
    userBodyweightKg,
  }
}

// ─── Weight reduction helper ──────────────────────────────────────────────────

function safeReduceWeight(weightKg, pct, incrementKg, snapWeight) {
  if (!isFiniteNumber(weightKg)) return null
  if (weightKg < 0) {
    // Assisted bodyweight: deload = more assistance = more negative by one step
    const fallback = snapWeight(weightKg - incrementKg)
    return isFiniteNumber(fallback) && fallback < weightKg - SAME_LOAD_TOLERANCE_KG / 2 ? fallback : null
  }
  if (weightKg === 0) return null
  const reduced = snapWeight(weightKg * (1 - pct))
  if (isFiniteNumber(reduced) && reduced < weightKg - SAME_LOAD_TOLERANCE_KG / 2) return reduced
  const fallback = snapWeight(weightKg - incrementKg)
  return isFiniteNumber(fallback) && fallback > 0 && fallback < weightKg - SAME_LOAD_TOLERANCE_KG / 2 ? fallback : null
}

function snapToWeightIncrease(startWeightKg, pct, incrementKg, snapWeight) {
  if (!isFiniteNumber(startWeightKg)) return null
  const byPct = snapWeight(startWeightKg * (1 + pct))
  if (isFiniteNumber(byPct) && byPct > startWeightKg + SAME_LOAD_TOLERANCE_KG / 2) return byPct
  const byStep = snapWeight(startWeightKg + incrementKg)
  if (isFiniteNumber(byStep) && byStep > startWeightKg + SAME_LOAD_TOLERANCE_KG / 2) return byStep
  return null
}

// ─── Bodyweight suggestion ────────────────────────────────────────────────────

function buildBodyweightSuggestion(analysis) {
  const {
    objectiveProfile,
    reacclimationTier,
    confidence,
    baselineReps,
    planRange,
    planModeTargetReps,
    objectiveLabel,
    repRangeText,
    setHistory,
    baselineSetHistory,
    planProgressionBias,
  } = analysis

  const allRepWindow = baselineSetHistory.slice(-FAILURE_WINDOW)
  const priorRepWindow = allRepWindow.slice(0, -FAILURE_COUNT_THRESHOLD)
  const expectedReps = median(
    (priorRepWindow.length > 0 ? priorRepWindow : allRepWindow)
      .map(e => e.set.reps).filter(r => isFiniteNumber(r) && r > 0)
  )
  const failures = countBodyweightRepFailures(setHistory, expectedReps, baselineSetHistory)
  const progressionTrigger = checkSetProgressionTrigger(baselineSetHistory, objectiveProfile, null)
  const targetReps = planRange && isFiniteNumber(planModeTargetReps)
    ? planModeTargetReps
    : baselineReps

  if (reacclimationTier === 'reduce_two') {
    return {
      action: 'maintain', weightKg: null, reps: objectiveProfile.lowerHalfTarget,
      planMode: 'reacclimate_reduce_two',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — it has been more than 4 weeks, so ease back in at the lower end of the range.`,
      confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
    }
  }

  if (reacclimationTier === 'reduce_one') {
    return {
      action: 'maintain', weightKg: null, reps: objectiveProfile.lowerHalfTarget,
      planMode: 'reacclimate_reduce_one',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — after more than 2 weeks away, start back at the lower end of the range.`,
      confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
    }
  }

  if (!failures.postDeloadGuard && failures.count >= getPlanFailureThreshold(planProgressionBias)) {
    return {
      action: 'deload', weightKg: null, reps: objectiveProfile.lowerHalfTarget,
      planMode: 'recovery_week',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — ${failures.count} of the last ${failures.total} sessions fell below your rep baseline, so ease back to the lower end of the range.`,
      confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
    }
  }

  if (reacclimationTier === 'hold') {
    return {
      action: 'maintain', weightKg: null, reps: targetReps,
      planMode: 'reacclimate_hold',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — after a short break, match your last target before progressing.`,
      confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
    }
  }

  if (planProgressionBias === 'maintenance') {
    return {
      action: 'maintain', weightKg: null, reps: targetReps,
      planMode: 'maintenance',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — this plan is set to maintenance, so hold the current target and keep reps clean.`,
      confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
    }
  }

  if (progressionTrigger.triggered) {
    return {
      action: 'increase_reps', weightKg: null,
      reps: Math.min(objectiveProfile.upper + 2, targetReps + 1),
      planMode: 'increase_reps',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — you have been consistently at the top of the range, so add a rep and keep building.`,
      confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
    }
  }

  if (
    planRange &&
    planProgressionBias &&
    planProgressionBias !== 'maintenance' &&
    targetReps < objectiveProfile.upper &&
    hasTwoCleanPlanTargetHits(baselineSetHistory, targetReps)
  ) {
    return {
      action: 'increase_reps',
      weightKg: null,
      reps: Math.min(objectiveProfile.upper, targetReps + 1),
      planMode: 'increase_reps',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — you have matched your plan target for 2 sessions, so add a rep within the range.`,
      confidence,
      isBodyweightOnly: true,
      objectiveLabel,
      repRangeText,
    }
  }

  const suggestedReps = planRange
    ? targetReps
    : Math.min(objectiveProfile.upper, targetReps + (targetReps < objectiveProfile.upper ? 1 : 0))
  const action = suggestedReps > baselineReps ? 'increase_reps' : 'maintain'

  return {
    action, weightKg: null, reps: suggestedReps,
    planMode: action,
    reasoning: `${objectiveLabel} focus (${repRangeText}) — ${
      action === 'increase_reps'
        ? 'add a rep within the range before progressing further.'
        : 'repeat your current target and keep accumulating quality reps.'
    }`,
    confidence, isBodyweightOnly: true, objectiveLabel, repRangeText,
  }
}

// ─── Per-set suggestion ───────────────────────────────────────────────────────

function buildPerSetSuggestion(setIndex, analysis) {
  const {
    objectiveProfile,
    equipment,
    expectedE1rmKg,
    failures,
    progressionTrigger,
    reacclimationTier,
    baselineWeightKg,
    baselineReps,
    planModeTargetReps,
    planModeTargetWeightKg,
    incrementKg,
    snapWeight,
    confidence,
    isBodyweightOnly,
    bodyweightLoadNeedsFirstIncrement,
    planRange,
    objectiveLabel,
    repRangeText,
    setHistory,
    planProgressionBias,
  } = analysis

  if (isBodyweightOnly) return buildBodyweightSuggestion(analysis)

  const isPlanMode = planRange !== null

  if (setHistory.length === 0) {
    const standardSuggestion = buildFirstTimeStandardSuggestion(analysis, equipment)
    if (standardSuggestion) return standardSuggestion

    return {
      action: 'first_time', weightKg: null, reps: planModeTargetReps ?? null,
      planMode: 'none', reasoning: '', confidence: 'low',
      isBodyweightOnly: false, objectiveLabel, repRangeText,
    }
  }

  const startWeightKg = isPlanMode && planModeTargetWeightKg !== null
    ? planModeTargetWeightKg
    : baselineWeightKg
  const targetReps = isPlanMode && isFiniteNumber(planModeTargetReps)
    ? planModeTargetReps
    : baselineReps

  // Priority 1: reacclimation reduce_two (28+ days)
  if (reacclimationTier === 'reduce_two') {
    return {
      action: 'maintain',
      weightKg: safeReduceWeight(startWeightKg, 0.10, incrementKg, snapWeight),
      reps: objectiveProfile.lowerHalfTarget,
      planMode: 'reacclimate_reduce_two',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — it has been more than 4 weeks, so ease back in with 10% less weight and work from the lower end of the range.`,
      confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
    }
  }

  // Priority 2: reacclimation reduce_one (15–27 days)
  if (reacclimationTier === 'reduce_one') {
    return {
      action: 'maintain',
      weightKg: safeReduceWeight(startWeightKg, 0.05, incrementKg, snapWeight),
      reps: objectiveProfile.lowerHalfTarget,
      planMode: 'reacclimate_reduce_one',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — after more than 2 weeks away, start 5% lighter and rebuild from the lower end of the range.`,
      confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
    }
  }

  // Priority 3: failure deload
  if (!failures.postDeloadGuard && failures.count >= getPlanFailureThreshold(planProgressionBias)) {
    return {
      action: 'deload',
      weightKg: safeReduceWeight(startWeightKg, DELOAD_WEIGHT_PCT, incrementKg, snapWeight),
      reps: objectiveProfile.lowerHalfTarget,
      planMode: 'recovery_week',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — ${failures.count} of the last ${failures.total} sessions fell short of your expected level, so take a step back and rebuild from the lower end of the range.`,
      confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
    }
  }

  // Priority 4: reacclimation hold (8–14 days)
  if (reacclimationTier === 'hold') {
    return {
      action: 'maintain', weightKg: startWeightKg, reps: targetReps,
      planMode: 'reacclimate_hold',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — after a short break, match your last successful target before progressing again.`,
      confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
    }
  }

  if (planProgressionBias === 'maintenance') {
    return {
      action: 'maintain', weightKg: startWeightKg, reps: targetReps,
      planMode: 'maintenance',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — this plan is set to maintenance, so hold the current target unless you manually choose to advance.`,
      confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
    }
  }

  if (bodyweightLoadNeedsFirstIncrement) {
    const firstLoad = isFiniteNumber(planModeTargetWeightKg) && planModeTargetWeightKg > 0
      ? planModeTargetWeightKg
      : snapWeight(incrementKg)
    return {
      action: 'increase_weight',
      weightKg: firstLoad,
      reps: isPlanMode ? targetReps : objectiveProfile.lowerHalfTarget,
      planMode: 'increase_weight',
      skipE1rmFloor: true,
      reasoning: `${objectiveLabel} focus (${repRangeText}) — switch to added load with a conservative first step, then build from there.`,
      confidence,
      isBodyweightOnly: false,
      objectiveLabel,
      repRangeText,
    }
  }

  // Priority 5: progression
  if (progressionTrigger.triggered) {
    const weight = snapToWeightIncrease(startWeightKg, WEIGHT_INCREASE_PCT, incrementKg, snapWeight)
    if (isFiniteNumber(weight)) {
      const isSingleRepTarget = objectiveProfile.lower === objectiveProfile.upper
      const reason = progressionTrigger.reason === 'rep_ceiling'
        ? isSingleRepTarget
          ? 'you have hit your rep target for 2 sessions in a row, so add weight.'
          : 'you have hit the top of the range for 2 sessions in a row, so add weight and reset to the lower end.'
        : isSingleRepTarget
          ? 'your estimated 1RM has been consistently above your baseline for 2 sessions, so add weight.'
          : 'your estimated 1RM has been consistently above your baseline for 2 sessions, so add weight and work from the lower end.'
      return {
        action: 'increase_weight', weightKg: weight, reps: objectiveProfile.lowerHalfTarget,
        planMode: 'increase_weight',
        reasoning: `${objectiveLabel} focus (${repRangeText}) — ${reason}`,
        confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
      }
    }
  }

  if (
    isPlanMode &&
    planProgressionBias === 'load_first' &&
    hasTwoCleanPlanTargetHits(analysis.baselineSetHistory, targetReps)
  ) {
    const weight = snapToWeightIncrease(startWeightKg, WEIGHT_INCREASE_PCT, incrementKg, snapWeight)
    if (isFiniteNumber(weight)) {
      return {
        action: 'increase_weight',
        weightKg: weight,
        reps: targetReps,
        planMode: 'increase_weight',
        reasoning: `${objectiveLabel} focus (${repRangeText}) — you have matched your plan target for 2 sessions, so add weight and keep the reps steady.`,
        confidence,
        isBodyweightOnly: false,
        objectiveLabel,
        repRangeText,
      }
    }
  }

  // Priority 6: maintain / increase reps
  const shouldAddPlanRep = isPlanMode
    && planProgressionBias === 'reps_first'
    && targetReps < objectiveProfile.upper
  const suggestedReps = shouldAddPlanRep
    ? Math.min(objectiveProfile.upper, targetReps + 1)
    : isPlanMode
      ? targetReps
      : (targetReps < objectiveProfile.upper
          ? Math.min(objectiveProfile.upper, targetReps + 1)
          : targetReps)
  const action = (shouldAddPlanRep || (!isPlanMode && suggestedReps > baselineReps)) ? 'increase_reps' : 'maintain'

  // E1RM ceiling guard — only applies when action is 'maintain'.
  // 'increase_reps' is intentional double-progression and is deliberately exempt.
  //
  // If the suggested (weight × reps) pair implies an e1RM above the established
  // baseline median (expectedE1rmKg), the label 'maintain' is contradictory —
  // it would ask the user to exceed a level they haven't yet demonstrated.
  // Drop one rep to bring the implied e1RM back within the baseline, provided
  // the reduced rep count remains inside the objective range's lower bound.
  let finalReps = suggestedReps
  let finalAction = action
  let ceilingGuardFired = false

  if (
    finalAction === 'maintain' &&
    isFiniteNumber(expectedE1rmKg) && expectedE1rmKg > 0 &&
    isFiniteNumber(startWeightKg) && startWeightKg > 0
  ) {
    const impliedE1rm = calcOrmKg(startWeightKg, finalReps)
    if (isFiniteNumber(impliedE1rm) && impliedE1rm > expectedE1rmKg) {
      const reducedReps = finalReps - 1
      if (reducedReps >= objectiveProfile.lower && reducedReps > 0) {
        finalReps = reducedReps
        ceilingGuardFired = true  // finalAction stays 'maintain'; reps are pulled back to demonstrated level
      }
      // If reducedReps would fall below the range floor the weight itself is already
      // above baseline — leave as-is and let the confidence / e1rm-floor system
      // surface it rather than producing an out-of-range rep count.
    }
  }

  return {
    action: finalAction, weightKg: startWeightKg, reps: finalReps,
    // When the ceiling guard fires it sets skipE1rmFloor so applyPerSetE1rmFloor cannot
    // undo the reduction: the floor's rep-increase loop would otherwise restore reps to
    // the original (above-baseline) value, defeating the guard entirely.
    skipE1rmFloor: ceilingGuardFired,
    ceilingGuardFired,
    planMode: finalAction === 'increase_reps' ? 'increase_reps' : 'maintain',
    reasoning: `${objectiveLabel} focus (${repRangeText}) — ${
      finalAction === 'increase_reps'
        ? 'add a rep within the range before bumping the load.'
        : 'repeat your current target and keep accumulating quality reps.'
    }`,
    confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
  }
}

function isCurrentSessionBodyweightOnly(equipment, completedSet) {
  return equipment === 'Bodyweight' && (
    !isFiniteNumber(completedSet?.weightKg) ||
    Math.abs(completedSet.weightKg) < SAME_LOAD_TOLERANCE_KG
  )
}

function buildCurrentSessionFallbackSuggestion(previousCompletedSet, analysis, equipment) {
  if (
    !previousCompletedSet ||
    !isFiniteNumber(previousCompletedSet.reps) ||
    previousCompletedSet.reps <= 0
  ) {
    return null
  }

  const {
    confidence,
    objectiveLabel,
    repRangeText,
  } = analysis
  const isBodyweightOnly = isCurrentSessionBodyweightOnly(equipment, previousCompletedSet)

  if (isBodyweightOnly) {
    return {
      action: 'maintain',
      weightKg: null,
      reps: previousCompletedSet.reps,
      planMode: 'maintain',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — no prior history for this set yet, so repeat your previous completed set while the workout builds a baseline.`,
      confidence,
      isBodyweightOnly: true,
      objectiveLabel,
      repRangeText,
    }
  }

  if (
    !isFiniteNumber(previousCompletedSet.weightKg) ||
    (equipment !== 'Bodyweight' && previousCompletedSet.weightKg < 0)
  ) {
    return null
  }

  return {
    action: 'maintain',
    weightKg: previousCompletedSet.weightKg,
    reps: previousCompletedSet.reps,
    planMode: 'maintain',
    reasoning: `${objectiveLabel} focus (${repRangeText}) — no prior history for this set yet, so repeat your previous completed set while the workout builds a baseline.`,
    confidence,
    isBodyweightOnly: false,
    objectiveLabel,
    repRangeText,
  }
}

// ─── Fatigue cascade (within-session) ────────────────────────────────────────

function applyE1rmFatigueCascade(
  suggestion,
  previousPlannedE1rmKg,
  previousActualE1rmKg,
  objectiveProfile,
  snapWeight,
  bodyweightKg = null,
) {
  if (
    suggestion.action === 'deload' ||
    suggestion.action === 'first_time' ||
    !isFiniteNumber(previousPlannedE1rmKg) || previousPlannedE1rmKg <= 0 ||
    !isFiniteNumber(previousActualE1rmKg)
  ) {
    return { ...suggestion, fatigueAdjustmentPct: 0 }
  }

  const rawFatiguePct = Math.max(
    0,
    (previousPlannedE1rmKg - previousActualE1rmKg) / previousPlannedE1rmKg
  )
  const fatiguePct = Math.min(rawFatiguePct, FATIGUE_MAX_PCT)

  if (fatiguePct <= 0) return { ...suggestion, fatigueAdjustmentPct: 0 }

  if (suggestion.isBodyweightOnly) {
    if (!isFiniteNumber(suggestion.reps)) return { ...suggestion, fatigueAdjustmentPct: 0 }
    const newReps = Math.max(
      objectiveProfile.lower,
      Math.floor(suggestion.reps * (1 - fatiguePct))
    )
    return { ...suggestion, reps: newReps, fatigueAdjustmentPct: newReps !== suggestion.reps ? fatiguePct : 0 }
  }

  if (!isFiniteNumber(suggestion.weightKg) || !isFiniteNumber(suggestion.reps)) {
    return { ...suggestion, fatigueAdjustmentPct: 0 }
  }

  const plannedE1rm = isFiniteNumber(bodyweightKg) && bodyweightKg > 0
    ? calcAddedLoadE1rmKg(suggestion.weightKg, suggestion.reps, bodyweightKg)
    : calcOrmKg(suggestion.weightKg, suggestion.reps)
  if (!isFiniteNumber(plannedE1rm) || plannedE1rm <= 0) {
    return { ...suggestion, fatigueAdjustmentPct: 0 }
  }

  const adjustedE1rm = plannedE1rm * (1 - fatiguePct)
  const isLoadedBw = isFiniteNumber(bodyweightKg) && bodyweightKg > 0
  const rawWeight = isLoadedBw
    ? weightForAddedLoadOrm(adjustedE1rm, suggestion.reps, bodyweightKg)
    : weightForOrm(adjustedE1rm, suggestion.reps)
  const newWeightKg = isFiniteNumber(rawWeight) && (isLoadedBw || rawWeight > 0)
    ? snapWeight(rawWeight)
    : suggestion.weightKg

  return { ...suggestion, weightKg: newWeightKg, fatigueAdjustmentPct: newWeightKg !== suggestion.weightKg ? fatiguePct : 0 }
}

// ─── Cross-exercise pre-fatigue (within-session) ─────────────────────────────

function countWorkingSets(doneSets) {
  if (!doneSets?.length) return 0
  const parsedSets = doneSets.filter(s =>
    s.reps > 0 &&
    s.setType !== 'warmup' &&
    s.setType !== 'dropset'
  )
  if (!parsedSets.length) return 0

  const isBodyweight = parsedSets.every(s => s.weight <= 0)
  if (isBodyweight) {
    const peakReps = Math.max(...parsedSets.map(s => s.reps))
    return parsedSets.filter(s => s.reps >= peakReps * WARMUP_E1RM_THRESHOLD).length
  }

  const e1rms = parsedSets.map(s => calcOrmKg(s.weight, s.reps))
  const validE1rms = e1rms.filter(e => isFiniteNumber(e) && e > 0)
  if (!validE1rms.length) return parsedSets.length
  const peak = Math.max(...validE1rms)
  return parsedSets.filter((_, i) => !isFiniteNumber(e1rms[i]) || e1rms[i] >= peak * WARMUP_E1RM_THRESHOLD).length
}

function computeSessionPreFatiguePct(priorExercises, currentPrimaryMuscles, currentSecondaryMuscles) {
  if (!priorExercises?.length) return 0
  let total = 0
  for (let i = 0; i < priorExercises.length; i++) {
    const prior = priorExercises[i]
    const workingSets = countWorkingSets(prior.doneSets)
    if (!workingSets) continue
    const overlap = computeMuscleOverlapWeight(
      prior.primaryMuscles, prior.secondaryMuscles,
      currentPrimaryMuscles, currentSecondaryMuscles
    )
    if (overlap <= 0) continue
    total += workingSets * overlap * CROSS_EXERCISE_PER_SET_RATE * Math.pow(CROSS_EXERCISE_DECAY, i)
  }
  return Math.min(total, CROSS_EXERCISE_PRE_FATIGUE_MAX_PCT)
}

function applyCrossExercisePreFatigue(suggestion, preFatiguePct, objectiveProfile, snapWeight, bodyweightKg = null) {
  if (
    suggestion.action === 'deload' ||
    suggestion.action === 'first_time' ||
    !isFiniteNumber(preFatiguePct) || preFatiguePct <= 0
  ) return { ...suggestion, crossExerciseFatiguePct: 0 }

  if (suggestion.isBodyweightOnly) {
    if (!isFiniteNumber(suggestion.reps)) return { ...suggestion, crossExerciseFatiguePct: 0 }
    const newReps = Math.max(objectiveProfile.lower, Math.round(suggestion.reps * (1 - preFatiguePct)))
    return { ...suggestion, reps: newReps, crossExerciseFatiguePct: newReps !== suggestion.reps ? preFatiguePct : 0 }
  }

  if (!isFiniteNumber(suggestion.weightKg) || !isFiniteNumber(suggestion.reps))
    return { ...suggestion, crossExerciseFatiguePct: 0 }

  const plannedE1rm = isFiniteNumber(bodyweightKg) && bodyweightKg > 0
    ? calcAddedLoadE1rmKg(suggestion.weightKg, suggestion.reps, bodyweightKg)
    : calcOrmKg(suggestion.weightKg, suggestion.reps)
  if (!isFiniteNumber(plannedE1rm) || plannedE1rm <= 0)
    return { ...suggestion, crossExerciseFatiguePct: 0 }

  const adjustedE1rm = plannedE1rm * (1 - preFatiguePct)
  const isLoadedBw = isFiniteNumber(bodyweightKg) && bodyweightKg > 0
  const rawWeight = isLoadedBw
    ? weightForAddedLoadOrm(adjustedE1rm, suggestion.reps, bodyweightKg)
    : weightForOrm(adjustedE1rm, suggestion.reps)
  const newWeightKg = isFiniteNumber(rawWeight) && (isLoadedBw || rawWeight > 0) ? snapWeight(rawWeight) : suggestion.weightKg
  return { ...suggestion, weightKg: newWeightKg, crossExerciseFatiguePct: newWeightKg !== suggestion.weightKg ? preFatiguePct : 0 }
}

// ─── E1RM floor (per-set) ─────────────────────────────────────────────────────

function getAppliedFatigueMultiplier(suggestion) {
  const setFatiguePct = isFiniteNumber(suggestion.fatigueAdjustmentPct)
    ? clamp(suggestion.fatigueAdjustmentPct, 0, FATIGUE_MAX_PCT)
    : 0
  const crossExerciseFatiguePct = isFiniteNumber(suggestion.crossExerciseFatiguePct)
    ? clamp(suggestion.crossExerciseFatiguePct, 0, CROSS_EXERCISE_PRE_FATIGUE_MAX_PCT)
    : 0

  return (1 - setFatiguePct) * (1 - crossExerciseFatiguePct)
}

function applyPerSetE1rmFloor(suggestion, expectedE1rmKg, objectiveProfile, snapWeight, incrementKg, isPlanMode, bodyweightKg = null) {
  if (
    suggestion.action === 'deload' ||
    suggestion.action === 'first_time' ||
    suggestion.isBodyweightOnly ||
    suggestion.skipE1rmFloor ||
    !isFiniteNumber(expectedE1rmKg) || expectedE1rmKg <= 0 ||
    !isFiniteNumber(suggestion.weightKg) ||
    !isFiniteNumber(suggestion.reps) ||
    isPlanMode
  ) {
    return suggestion
  }

  const useBw = isFiniteNumber(bodyweightKg) && bodyweightKg > 0
  const getE1rm = (wKg, r) => useBw
    ? calcAddedLoadE1rmKg(wKg, r, bodyweightKg)
    : calcOrmKg(wKg, r)
  const getWeight = (e1rm, r) => useBw
    ? weightForAddedLoadOrm(e1rm, r, bodyweightKg)
    : weightForOrm(e1rm, r)

  const plannedE1rm = getE1rm(suggestion.weightKg, suggestion.reps)
  const fatigueMultiplier = getAppliedFatigueMultiplier(suggestion)
  const floor = (expectedE1rmKg * fatigueMultiplier) - SAME_LOAD_TOLERANCE_KG
  const floorWasFatigueAdjusted = fatigueMultiplier < 1

  if (isFiniteNumber(plannedE1rm) && plannedE1rm >= floor) return suggestion

  // Try increasing reps within range
  for (let reps = suggestion.reps + 1; reps <= objectiveProfile.upper; reps++) {
    const e1rm = getE1rm(suggestion.weightKg, reps)
    if (isFiniteNumber(e1rm) && e1rm >= floor) {
      return { ...suggestion, reps, e1rmFloorAdjusted: true, e1rmFloorFatigueAdjusted: floorWasFatigueAdjusted }
    }
  }

  const floorWeight = getWeight(floor, suggestion.reps)
  let candidateWeight = isFiniteNumber(floorWeight) && floorWeight > suggestion.weightKg
    ? snapWeight(floorWeight)
    : snapWeight(suggestion.weightKg + incrementKg)

  for (let attempt = 0; attempt < 12; attempt++) {
    if (!isFiniteNumber(candidateWeight) || candidateWeight <= suggestion.weightKg) break
    const e1rm = getE1rm(candidateWeight, suggestion.reps)
    if (isFiniteNumber(e1rm) && e1rm >= floor) {
      return { ...suggestion, weightKg: candidateWeight, e1rmFloorAdjusted: true, e1rmFloorFatigueAdjusted: floorWasFatigueAdjusted }
    }
    const nextWeight = snapWeight(candidateWeight + incrementKg)
    if (!isFiniteNumber(nextWeight) || nextWeight <= candidateWeight) break
    candidateWeight = nextWeight
  }

  return suggestion
}

function getSuggestionE1rmKg(suggestion, bodyweightKg = null) {
  if (
    !suggestion ||
    suggestion.isBodyweightOnly ||
    !isFiniteNumber(suggestion.weightKg) ||
    !isFiniteNumber(suggestion.reps)
  ) {
    return null
  }
  const e1rm = isFiniteNumber(bodyweightKg) && bodyweightKg > 0
    ? calcAddedLoadE1rmKg(suggestion.weightKg, suggestion.reps, bodyweightKg)
    : calcOrmKg(suggestion.weightKg, suggestion.reps)
  return isFiniteNumber(e1rm) && e1rm > 0 ? e1rm : null
}

export function shouldMarkFatigueAdjustedProgression(suggestion, { completedReps = null, completedE1rmKg = null } = {}) {
  if (!suggestion) return false
  const setFatiguePct = Number(suggestion.fatigueAdjustmentPct) || 0
  const crossExerciseFatiguePct = Number(suggestion.crossExerciseFatiguePct) || 0
  if (setFatiguePct <= 0 && crossExerciseFatiguePct <= 0) return false

  if (suggestion.isBodyweightOnly) {
    const unadjustedReps = Number(suggestion.unadjustedSuggestedReps)
    return isFiniteNumber(completedReps) && isFiniteNumber(unadjustedReps) && completedReps < unadjustedReps
  }

  const unadjustedE1rmKg = Number(suggestion.unadjustedSuggestedE1rmKg)
  return (
    isFiniteNumber(completedE1rmKg) &&
    isFiniteNumber(unadjustedE1rmKg) &&
    unadjustedE1rmKg > 0 &&
    completedE1rmKg < unadjustedE1rmKg
  )
}

export function resolveCompletedSetProgressionEvent({
  suggestion = null,
  completedReps = null,
  completedE1rmKg = null,
  scheduledDeload = false,
} = {}) {
  if (scheduledDeload || suggestion?.action === 'deload') return 'deload'
  if (REACCLIMATION_PLAN_MODES.has(suggestion?.planMode)) return 'reacclimate'
  if (shouldMarkFatigueAdjustedProgression(suggestion, { completedReps, completedE1rmKg })) return 'fatigue_adjusted'
  return null
}

// ─── Reasoning builder ────────────────────────────────────────────────────────

function buildCurrentSetReason(setIndex, suggestion, analysis, fatiguePct, crossExerciseFatiguePct = 0) {
  const previousSetNumber = setIndex
  const fallbackNote = analysis.isFallbackFromPrior
    ? ` (Using Set ${setIndex}'s history as a baseline — first time doing this many sets.)`
    : ''
  const fatigueNote = isFiniteNumber(fatiguePct) && fatiguePct > 0
    ? ` Reduced ${Math.round(fatiguePct * 100)}% for carry-over fatigue from Set ${previousSetNumber}.`
    : ''
  const crossFatigueNote = isFiniteNumber(crossExerciseFatiguePct) && crossExerciseFatiguePct > 0
    ? ` Pre-fatigued ${Math.round(crossExerciseFatiguePct * 100)}% from overlapping muscles worked earlier this session.`
    : ''
  const floorNote = suggestion.e1rmFloorAdjusted
    ? suggestion.e1rmFloorFatigueAdjusted
      ? ` Adjusted to keep your fatigue-adjusted target from dropping too far.`
      : ` Adjusted to maintain your expected 1RM for this set.`
    : ''

  if (setIndex === 0 || suggestion.action === 'deload') {
    return `${suggestion.reasoning}${crossFatigueNote}${fallbackNote}${floorNote}`
  }

  return `${suggestion.reasoning}${fatigueNote}${crossFatigueNote}${fallbackNote}${floorNote}`
}

// ─── Confidence signal ────────────────────────────────────────────────────────

function buildConfidenceSignal(analysis, finalSuggestion) {
  const {
    baselineSetHistory,
    setHistory,
    isFallbackFromPrior,
    daysSinceLast,
    failures,
    isLoadedBodyweight,
    bodyweightHasExternalLoadHistory,
    bodyweightProgressionMode,
    equipment,
    planRange,
    expectedE1rmKg,
    baselineWeightKg,
    planModeTargetWeightKg,
  } = analysis

  // ── Axis 1: History Quantity ──────────────────────────────────────────────
  const baselineCount = baselineSetHistory.length
  let axis1Score =
    baselineCount >= 5 ? 1.0 :
    baselineCount >= 3 ? 0.7 :
    baselineCount >= 2 ? 0.45 :
    baselineCount === 1 ? 0.25 :
    0.0
  if (isFallbackFromPrior) axis1Score *= 0.80
  const axis1Reasons = []
  if (baselineCount === 0) {
    axis1Reasons.push('No baseline sessions recorded yet')
  } else if (baselineCount === 1) {
    axis1Reasons.push('Only 1 baseline session — suggestion is a first approximation')
  } else if (baselineCount < 3) {
    axis1Reasons.push(`Only ${baselineCount} baseline sessions — more data needed for reliable suggestions`)
  }
  if (isFallbackFromPrior) {
    axis1Reasons.push('History borrowed from adjacent set position — direct data unavailable')
  }
  const axis1 = { score: axis1Score, reasons: axis1Reasons }

  // ── Axis 2: History Recency ───────────────────────────────────────────────
  const lastBaseline = baselineSetHistory.at(-1)
  const daysSinceLastBaseline = lastBaseline?.session?.sessionDate
    ? (Date.now() - lastBaseline.session.sessionDate.getTime()) / 86_400_000
    : null

  const recencyScore =
    daysSinceLastBaseline === null ? 0.50 :
    daysSinceLastBaseline <= 7  ? 1.00 :
    daysSinceLastBaseline <= 14 ? 0.80 :
    daysSinceLastBaseline <= 21 ? 0.60 :
    daysSinceLastBaseline <= 35 ? 0.40 :
    0.20

  const sessionDates = [...setHistory]
    .map(e => e?.session?.sessionDate)
    .filter(d => d instanceof Date)
    .sort((a, b) => a - b)
  let gapCV = null
  if (sessionDates.length >= 3) {
    const gaps = []
    for (let i = 1; i < sessionDates.length; i++) {
      gaps.push((sessionDates[i] - sessionDates[i - 1]) / 86_400_000)
    }
    const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    gapCV = gapMean > 0 ? stdDev(gaps) / gapMean : 0
  }

  const regularityScore =
    gapCV === null ? 1.0 :
    gapCV <= 0.30 ? 1.0 :
    gapCV <= 0.55 ? 0.85 :
    gapCV <= 0.80 ? 0.70 :
    gapCV <= 1.10 ? 0.55 :
    0.40

  const axis2Score = recencyScore * 0.70 + regularityScore * 0.30
  const axis2Reasons = []
  if (daysSinceLastBaseline !== null && daysSinceLastBaseline > 14) {
    axis2Reasons.push(`Last comparable session was ${Math.round(daysSinceLastBaseline)} days ago`)
  }
  if (gapCV !== null && gapCV > 0.80) {
    axis2Reasons.push('Training schedule has been irregular')
  }
  const axis2 = { score: axis2Score, reasons: axis2Reasons }

  // ── Axis 3: History Representativeness ───────────────────────────────────
  const excludedRatio =
    (setHistory.length - baselineSetHistory.length) / Math.max(setHistory.length, 1)

  // Detect all-excluded fallback: eligible count is zero but setHistory is not
  // Uses the same isBaselineEligibleEntry filter — NOT BASELINE_EXCLUDED_PROGRESSION_EVENTS.has()
  // directly — because fatigue_adjusted entries with a valid estimatedFreshOrmKg are
  // eligible and would be incorrectly flagged otherwise.
  const eligibleCount = setHistory.filter(isBaselineEligibleEntry).length
  const allExcludedFallback = eligibleCount === 0 && setHistory.length > 0

  const excludedScore =
    allExcludedFallback   ? 0.10 :
    excludedRatio <= 0.20 ? 1.00 :
    excludedRatio <= 0.40 ? 0.80 :
    excludedRatio <= 0.60 ? 0.60 :
    excludedRatio <= 0.80 ? 0.40 :
    0.20

  const recentTwoE1rms = baselineSetHistory.slice(-2)
    .map(getCapabilityE1rmKg)
    .filter(v => isFiniteNumber(v))
  const recentAvg = recentTwoE1rms.length >= 1
    ? recentTwoE1rms.reduce((a, b) => a + b, 0) / recentTwoE1rms.length
    : null
  const drift =
    recentAvg !== null && isFiniteNumber(expectedE1rmKg) && expectedE1rmKg > 0
      ? (recentAvg - expectedE1rmKg) / expectedE1rmKg
      : 0
  const driftMagnitude = Math.abs(drift)

  const driftScore =
    driftMagnitude <= 0.03 ? 1.0 :
    driftMagnitude <= 0.06 ? 0.85 :
    driftMagnitude <= 0.10 ? 0.70 :
    driftMagnitude <= 0.15 ? 0.50 :
    0.30

  const axis3Score = excludedScore * 0.60 + driftScore * 0.40
  const axis3Reasons = []
  if (allExcludedFallback) {
    axis3Reasons.push('All recent sessions were exceptional — baseline using unfiltered history')
  } else if (excludedRatio > 0.50) {
    axis3Reasons.push('Most recent sessions excluded from baseline (deload/reacclimate)')
  }
  if (drift > 0.06) {
    axis3Reasons.push('Recent performance significantly above baseline — suggestion may be conservative')
  } else if (drift < -0.06) {
    axis3Reasons.push('Recent performance trending below baseline')
  }
  const axis3 = { score: axis3Score, reasons: axis3Reasons }

  // ── Axis 4: Statistical Reliability ──────────────────────────────────────
  const statWindow = baselineSetHistory.slice(-FAILURE_WINDOW)
  const e1rmValues = statWindow.map(getCapabilityE1rmKg).filter(v => isFiniteNumber(v))
  const repValues  = statWindow.map(e => e?.set?.reps).filter(r => isFiniteNumber(r))

  const e1rmMean = e1rmValues.length >= 2
    ? e1rmValues.reduce((a, b) => a + b, 0) / e1rmValues.length
    : 0
  const e1rmCV = e1rmValues.length >= 2 && e1rmMean > 0
    ? stdDev(e1rmValues) / e1rmMean
    : 0

  const cvScore =
    e1rmCV <= 0.030 ? 1.00 :
    e1rmCV <= 0.055 ? 0.85 :
    e1rmCV <= 0.080 ? 0.70 :
    e1rmCV <= 0.120 ? 0.55 :
    0.35

  const repSpread = repValues.length >= 2
    ? Math.max(...repValues) - Math.min(...repValues)
    : 0
  const repSpreadScore =
    repValues.length < 2 ? 1.0 :
    repSpread <= 2 ? 1.0 :
    repSpread <= 4 ? 0.85 :
    repSpread <= 6 ? 0.70 :
    repSpread <= 8 ? 0.55 :
    0.35

  const extremeCount = repValues.filter(r => r <= 2 || r >= ESTIMATED_ORM_REP_CAP).length
  const extremeProportion = repValues.length > 0 ? extremeCount / repValues.length : 0
  const extremeScore =
    extremeProportion <= 0.20 ? 1.0 :
    extremeProportion <= 0.40 ? 0.80 :
    extremeProportion <= 0.60 ? 0.60 :
    0.40

  const axis4Score = cvScore * 0.50 + repSpreadScore * 0.30 + extremeScore * 0.20
  const axis4Reasons = []
  if (e1rmCV > 0.08) {
    axis4Reasons.push('Highly variable performance across recent sessions')
  }
  if (repSpread > 6) {
    axis4Reasons.push('Sessions span very different rep ranges — e1RM estimates less comparable')
  }
  if (extremeProportion > 0.40) {
    axis4Reasons.push('Many sessions at extreme rep counts where the e1RM formula is less accurate')
  }
  const axis4 = { score: axis4Score, reasons: axis4Reasons }

  // ── Axis 5: Suggestion Integrity ─────────────────────────────────────────
  const floorFired   = finalSuggestion.e1rmFloorAdjusted === true
  const ceilingFired = finalSuggestion.ceilingGuardFired === true
  const reacclimating = REACCLIMATION_PLAN_MODES.has(finalSuggestion.planMode)

  // Use abs(baselineWeightKg) to handle assisted bodyweight (negative loads).
  // The SAME_LOAD_TOLERANCE_KG guard is applied to the absolute value so that
  // assisted exercises (baselineWeightKg < 0) are not skipped entirely.
  const absBaselineKg = Math.abs(baselineWeightKg)
  const deviation =
    isFiniteNumber(finalSuggestion.weightKg) &&
    isFiniteNumber(baselineWeightKg) &&
    absBaselineKg > SAME_LOAD_TOLERANCE_KG
      ? Math.abs(finalSuggestion.weightKg - baselineWeightKg) / absBaselineKg
      : 0

  let axis5Score = 1.0
  if (floorFired)    axis5Score *= 0.75
  if (ceilingFired)  axis5Score *= 0.75
  if (reacclimating) axis5Score *= 0.70
  const axis5DeviationPenalty = Math.min(deviation / 0.10 * 0.15, 0.30)
  axis5Score = Math.max(axis5Score * (1 - axis5DeviationPenalty), 0.10)

  const axis5Reasons = []
  if (floorFired)    axis5Reasons.push('Suggestion required upward correction to meet the baseline floor')
  if (ceilingFired)  axis5Reasons.push('Suggestion required downward correction to avoid overshooting baseline')
  if (reacclimating) axis5Reasons.push('Reacclimation estimate applied — not a calibrated prediction')
  if (deviation > 0.12) axis5Reasons.push('Suggested load differs significantly from last recorded session')
  const axis5 = { score: axis5Score, reasons: axis5Reasons }

  // ── Axis 6: Current State Knowledge ──────────────────────────────────────
  const staleDays = daysSinceLast ?? 0

  const staleScore =
    staleDays <= 4  ? 1.00 :
    staleDays <= 7  ? 0.90 :
    staleDays <= 10 ? 0.80 :
    staleDays <= 14 ? 0.70 :
    staleDays <= 21 ? 0.55 :
    0.35

  const failureRate = failures.total > 0 ? failures.count / failures.total : 0
  const failureScore =
    failureRate === 0   ? 1.00 :
    failureRate <= 0.20 ? 0.85 :
    failureRate <= 0.40 ? 0.70 :
    failureRate <= 0.60 ? 0.50 :
    0.30

  const maxFatiguePct = Math.max(
    finalSuggestion.crossExerciseFatiguePct ?? 0,
    finalSuggestion.fatigueAdjustmentPct    ?? 0
  )
  const normalisedFatigue = Math.min(maxFatiguePct / FATIGUE_MAX_PCT, 1)
  const fatigueScore = 1.0 - normalisedFatigue * 0.25

  const axis6Score = staleScore * 0.40 + failureScore * 0.40 + fatigueScore * 0.20
  const axis6Reasons = []
  if (staleDays > 10) {
    axis6Reasons.push(`Last session was ${Math.round(staleDays)} days ago — current state may differ from history`)
  }
  if (failureRate > 0.33) {
    axis6Reasons.push('Multiple recent sessions fell short of the target level')
  }
  if (normalisedFatigue > 0.60) {
    axis6Reasons.push('Suggestion significantly adjusted for accumulated in-session fatigue')
  }
  const axis6 = { score: axis6Score, reasons: axis6Reasons }

  // ── Axis 7: Formula / Model Fit ───────────────────────────────────────────
  const equipmentPenalty = EQUIPMENT_VARIABILITY[equipment] ?? 0.18
  const loadedBwPenalty  = isLoadedBodyweight ? 0.08 : 0
  const mixedBwPenalty   =
    equipment === 'Bodyweight' &&
    bodyweightHasExternalLoadHistory &&
    bodyweightProgressionMode === 'auto'
      ? 0.12
      : 0

  const axis7Score = Math.max(1.0 - equipmentPenalty - loadedBwPenalty - mixedBwPenalty, 0.10)
  const axis7Reasons = []
  if (equipmentPenalty >= 0.18) {
    axis7Reasons.push('Cable/machine/bodyweight equipment has higher set-to-set variability')
  }
  if (loadedBwPenalty > 0) {
    axis7Reasons.push('Loaded bodyweight e1RM uses a more complex calculation')
  }
  if (mixedBwPenalty > 0) {
    axis7Reasons.push('History mixes loaded and unloaded sessions — data is split across two modes')
  }
  const axis7 = { score: axis7Score, reasons: axis7Reasons }

  // ── Axis 8: Plan Regime Fit ───────────────────────────────────────────────
  let axis8Score = 1.0
  const axis8Reasons = []

  if (planRange) {
    const historicalReps = baselineSetHistory
      .map(e => e?.set?.reps)
      .filter(r => isFiniteNumber(r) && r > 0)

    const inRangeCount = historicalReps.filter(
      r => r >= planRange.low && r <= planRange.high
    ).length

    const overlapRatio = historicalReps.length > 0
      ? inRangeCount / historicalReps.length
      : 0

    const overlapScore =
      historicalReps.length === 0 ? 1.0 :
      overlapRatio >= 0.80 ? 1.0 :
      overlapRatio >= 0.60 ? 0.85 :
      overlapRatio >= 0.40 ? 0.70 :
      overlapRatio >= 0.20 ? 0.50 :
      0.30

    const planWeightDeviation =
      isFiniteNumber(planModeTargetWeightKg) &&
      isFiniteNumber(baselineWeightKg) &&
      baselineWeightKg > 0
        ? Math.abs(planModeTargetWeightKg - baselineWeightKg) / baselineWeightKg
        : 0

    const deviationScore =
      planWeightDeviation <= 0.05 ? 1.0 :
      planWeightDeviation <= 0.10 ? 0.85 :
      planWeightDeviation <= 0.15 ? 0.70 :
      planWeightDeviation <= 0.25 ? 0.55 :
      0.35

    axis8Score = overlapScore * 0.60 + deviationScore * 0.40

    if (historicalReps.length > 0 && overlapRatio < 0.40) {
      axis8Reasons.push("Training history is mostly outside the plan's rep range")
    }
    if (planWeightDeviation > 0.15) {
      axis8Reasons.push('Plan weight target differs significantly from historical baseline')
    }
  }

  const axis8 = { score: axis8Score, reasons: axis8Reasons }

  // ── Axis 9: Exercise Inherent Variability ─────────────────────────────────
  const predictionNoise     = PREDICTION_NOISE[equipment] ?? 0.15
  const bwFluctuationPenalty = equipment === 'Bodyweight' ? 0.08 : 0

  const axis9Score = Math.max(1.0 - predictionNoise - bwFluctuationPenalty, 0.20)
  const axis9Reasons = []
  if (predictionNoise >= 0.15) {
    axis9Reasons.push('This exercise type tends to have higher session-to-session variation')
  }
  if (bwFluctuationPenalty > 0) {
    axis9Reasons.push('Bodyweight exercises are sensitive to body-composition changes')
  }
  const axis9 = { score: axis9Score, reasons: axis9Reasons }

  // ── Combination Formula ───────────────────────────────────────────────────
  const criticalScore  = Math.min(axis1.score, axis7.score)
  const importantScore = weightedMean([
    [axis2.score, 0.25],
    [axis3.score, 0.25],
    [axis4.score, 0.25],
    [axis5.score, 0.25],
  ])
  const contextualScore = weightedMean([
    [axis6.score, 0.50],
    [axis8.score, 0.30],
    [axis9.score, 0.20],
  ])

  let rawScore =
    criticalScore   * 0.40 +
    importantScore  * 0.40 +
    contextualScore * 0.20

  // Hard veto: zero history cannot be rescued by other axes.
  // Without this, axis1=0 + all others=1.0 → rawScore=0.60 ('medium') which is wrong.
  if (axis1.score === 0) rawScore = Math.min(rawScore, 0.30)

  const score = Math.round(clamp(rawScore, 0, 1) * 100) / 100

  const level =
    score >= 0.875 ? 'very_high' :
    score >= 0.70  ? 'high' :
    score >= 0.45  ? 'medium' :
    'low'

  // ── topReasons ────────────────────────────────────────────────────────────
  const EFFECTIVE_WEIGHT = {
    historyQuantity:           0.40,
    formulaModelFit:           0.40,
    historyRecency:            0.10,
    historyRepresentativeness: 0.10,
    statisticalReliability:    0.10,
    suggestionIntegrity:       0.10,
    currentStateKnowledge:     0.10,
    planRegimeFit:             0.06,
    exerciseVariability:       0.04,
  }

  const axisEntries = [
    ['historyQuantity',           axis1],
    ['historyRecency',            axis2],
    ['historyRepresentativeness', axis3],
    ['statisticalReliability',    axis4],
    ['suggestionIntegrity',       axis5],
    ['currentStateKnowledge',     axis6],
    ['formulaModelFit',           axis7],
    ['planRegimeFit',             axis8],
    ['exerciseVariability',       axis9],
  ]

  const allPenalties = []
  for (const [name, axisObj] of axisEntries) {
    const effectiveWeight = EFFECTIVE_WEIGHT[name]
    for (const reason of axisObj.reasons) {
      allPenalties.push({
        text: reason,
        penalty: (1.0 - axisObj.score) * effectiveWeight,
      })
    }
  }

  allPenalties.sort((a, b) => b.penalty - a.penalty)
  const seen = new Set()
  const topReasons = []
  for (const { text } of allPenalties) {
    if (!seen.has(text)) {
      seen.add(text)
      topReasons.push(text)
      if (topReasons.length === 3) break
    }
  }

  return {
    level,
    score,
    topReasons,
    axes: {
      historyQuantity:           axis1,
      historyRecency:            axis2,
      historyRepresentativeness: axis3,
      statisticalReliability:    axis4,
      suggestionIntegrity:       axis5,
      currentStateKnowledge:     axis6,
      formulaModelFit:           axis7,
      planRegimeFit:             axis8,
      exerciseVariability:       axis9,
    },
  }
}

// ─── Main: buildCurrentSetSuggestion ─────────────────────────────────────────

export function buildCurrentSetSuggestion({
  sessions = [],
  currentSets = [],
  equipment,
  unitPreference = 'kg',
  planTargetReps = null,
  planRepRange = '',
  userBodyweightKg = null,
  priorExercises = [],
  currentPrimaryMuscles = [],
  currentSecondaryMuscles = [],
  customIncrementKg = null,
  customStartingWeightKg = null,
  planPeriodizationStyle = null,
  planIntensityTag = null,
  planProgressionBias = null,
  bodyweightProgressionMode = 'auto',
  exerciseName = null,
  userGender = null,
  bilateral = false,
}) {
  if (!currentSets.length) return null

  const activeSetIndex = currentSets.findIndex(set => !set.done && set.setType !== 'dropset' && set.setType !== 'warmup')
  if (activeSetIndex === -1) return null

  const planRange = parsePlanRange(planRepRange, planTargetReps)

  let previousPlannedE1rmKg = null
  let previousActualE1rmKg = null
  let previousPlannedReps = null
  let previousActualReps = null
  let previousCompletedSet = null
  const crossPct = computeSessionPreFatiguePct(priorExercises, currentPrimaryMuscles, currentSecondaryMuscles)
  let effectiveCrossPct = crossPct
  // Capture Set 1's actual suggestion (after all adjustments) to use as the
  // baseline for cross-exercise fatigue correction at setIndex=1.
  let set1SuggestedE1rmKg = null
  let set1SuggestedReps = null

  let workingSetPos = 0 // counts only working sets processed so far (no drops)
  for (let setIndex = 0; setIndex <= activeSetIndex; setIndex++) {
    if (currentSets[setIndex]?.setType === 'dropset') continue
    if (currentSets[setIndex]?.setType === 'warmup') continue
    let setHistory = getSetHistoryByIndex(sessions, workingSetPos)
    let isFallbackFromPrior = false

    if (setHistory.length === 0 && workingSetPos > 0) {
      const priorSetHistory = getSetHistoryByIndex(sessions, workingSetPos - 1)
      if (priorSetHistory.length > 0) {
        setHistory = priorSetHistory
        isFallbackFromPrior = true
      }
    }

    const resolvedBodyweightMode = inferBodyweightProgressionMode({
      equipment,
      requestedMode: bodyweightProgressionMode,
      currentSet: currentSets[setIndex],
      previousCurrentSets: currentSets.slice(0, setIndex),
      setHistory,
      unitPreference,
    })

    const analysis = analyzeSetHistory(
      setHistory, workingSetPos, equipment, unitPreference,
      planRange, userBodyweightKg, isFallbackFromPrior, customIncrementKg, customStartingWeightKg,
      planPeriodizationStyle, planIntensityTag, planProgressionBias, resolvedBodyweightMode,
      exerciseName, userGender,
      bilateral
    )

    // For loaded bodyweight (weighted pull-ups, dips with belt) the stored
    // estimatedOrmKg is added-load-equivalent, not raw external-load e1RM.
    // All e1RM computations in this loop must use the bodyweight-aware helpers.
    const loadedBwKg = analysis.isLoadedBodyweight
      ? (isFiniteNumber(userBodyweightKg) && userBodyweightKg > 0 ? userBodyweightKg : DEFAULT_BODYWEIGHT_KG)
      : null

    let rawSuggestion = buildPerSetSuggestion(workingSetPos, analysis)
    if (rawSuggestion.action === 'first_time') {
      rawSuggestion = buildCurrentSessionFallbackSuggestion(previousCompletedSet, analysis, equipment) ?? rawSuggestion
    }

    let adjusted = rawSuggestion
    let fatiguePct = 0

    if (workingSetPos > 0) {
      // After Set 1 is done, use its actual performance to correct the cross-exercise
      // fatigue estimate. If you beat the adjusted suggestion, the original estimate
      // was too aggressive — recalculate from the model inverse. Only fires once
      // (workingSetPos === 1) and only when ratio > 1; underperformance is handled by
      // the within-exercise cascade below.
      if (workingSetPos === 1 && crossPct > 0) {
        if (rawSuggestion.isBodyweightOnly) {
          if (isFiniteNumber(set1SuggestedReps) && set1SuggestedReps > 0 && isFiniteNumber(previousActualReps)) {
            const ratio = previousActualReps / set1SuggestedReps
            if (ratio > 1) effectiveCrossPct = Math.max(0, 1 - ratio * (1 - crossPct))
          }
        } else {
          if (isFiniteNumber(set1SuggestedE1rmKg) && set1SuggestedE1rmKg > 0 && isFiniteNumber(previousActualE1rmKg)) {
            const ratio = previousActualE1rmKg / set1SuggestedE1rmKg
            if (ratio > 1) effectiveCrossPct = Math.max(0, 1 - ratio * (1 - crossPct))
          }
        }
      }

      if (rawSuggestion.isBodyweightOnly) {
        const rawFatigue = isFiniteNumber(previousPlannedReps) && previousPlannedReps > 0 && isFiniteNumber(previousActualReps)
          ? Math.max(0, (previousPlannedReps - previousActualReps) / previousPlannedReps)
          : 0
        fatiguePct = Math.min(rawFatigue, FATIGUE_MAX_PCT)
        if (fatiguePct > 0 && isFiniteNumber(rawSuggestion.reps) && rawSuggestion.action !== 'deload') {
          const newReps = Math.max(
            analysis.objectiveProfile.lower,
            Math.floor(rawSuggestion.reps * (1 - fatiguePct))
          )
          if (newReps !== rawSuggestion.reps) {
            adjusted = { ...rawSuggestion, reps: newReps, fatigueAdjustmentPct: fatiguePct }
          } else {
            fatiguePct = 0
            adjusted = { ...rawSuggestion, fatigueAdjustmentPct: 0 }
          }
        } else {
          adjusted = { ...rawSuggestion, fatigueAdjustmentPct: 0 }
        }
      } else {
        adjusted = applyE1rmFatigueCascade(
          rawSuggestion,
          previousPlannedE1rmKg,
          previousActualE1rmKg,
          analysis.objectiveProfile,
          analysis.snapWeight,
          loadedBwKg
        )
        fatiguePct = adjusted.fatigueAdjustmentPct ?? 0
      }
      adjusted = effectiveCrossPct > 0
        ? applyCrossExercisePreFatigue(adjusted, effectiveCrossPct, analysis.objectiveProfile, analysis.snapWeight, loadedBwKg)
        : { ...adjusted, crossExerciseFatiguePct: 0 }
    } else {
      adjusted = effectiveCrossPct > 0
        ? { ...applyCrossExercisePreFatigue(rawSuggestion, effectiveCrossPct, analysis.objectiveProfile, analysis.snapWeight, loadedBwKg), fatigueAdjustmentPct: 0 }
        : { ...rawSuggestion, fatigueAdjustmentPct: 0, crossExerciseFatiguePct: 0 }
    }

    const final = applyPerSetE1rmFloor(
      adjusted,
      analysis.expectedE1rmKg,
      analysis.objectiveProfile,
      analysis.snapWeight,
      analysis.incrementKg,
      planRange !== null,
      loadedBwKg
    )

    // Capture what was actually suggested on Set 1 (after all adjustments including
    // cross-exercise fatigue) so workingSetPos=1 can compare actual vs adjusted suggestion,
    // not actual vs historical baseline.
    if (workingSetPos === 0) {
      if (final.isBodyweightOnly) {
        set1SuggestedReps = isFiniteNumber(final.reps) ? final.reps : null
      } else if (isFiniteNumber(final.weightKg) && isFiniteNumber(final.reps)) {
        set1SuggestedE1rmKg = getSuggestionE1rmKg(final, loadedBwKg)
      }
    }

    // Update planned values for next set's fatigue calculation
    if (final.isBodyweightOnly) {
      previousPlannedReps = final.reps
      previousPlannedE1rmKg = null
    } else if (isFiniteNumber(final.weightKg) && isFiniteNumber(final.reps)) {
      previousPlannedE1rmKg = isFiniteNumber(analysis.expectedE1rmKg) && analysis.expectedE1rmKg > 0
        ? analysis.expectedE1rmKg
        : getSuggestionE1rmKg(final, loadedBwKg)
      previousPlannedReps = null
    } else {
      previousPlannedE1rmKg = null
      previousPlannedReps = null
    }

    if (setIndex < activeSetIndex) {
      const completedSet = parseLoggedStrengthSet(currentSets[setIndex], unitPreference)
      previousCompletedSet = completedSet
      if (isCurrentSessionBodyweightOnly(equipment, completedSet)) {
        previousActualReps = completedSet.reps
        previousActualE1rmKg = null
      } else if (isFiniteNumber(completedSet.weightKg) && isFiniteNumber(completedSet.reps) && completedSet.reps > 0) {
        previousActualE1rmKg = loadedBwKg !== null
          ? calcAddedLoadE1rmKg(completedSet.weightKg, completedSet.reps, loadedBwKg)
          : calcOrmKg(completedSet.weightKg, completedSet.reps)
        previousActualReps = null
      }
    }

    if (setIndex === activeSetIndex) {
      if (
        final.action === 'first_time' &&
        (!isFiniteNumber(final.weightKg) || !isFiniteNumber(final.reps))
      ) {
        return null
      }
      const unadjustedSuggestedE1rmKg = getSuggestionE1rmKg(rawSuggestion, loadedBwKg)
      const confidenceSignal = buildConfidenceSignal(analysis, final)

      return {
        activeSetIndex,
        setNumber: workingSetPos + 1,
        action: final.action,
        suggestedWeightKg: final.isBodyweightOnly ? 0 : final.weightKg,
        suggestedReps: final.reps,
        unadjustedSuggestedWeightKg: rawSuggestion.isBodyweightOnly ? 0 : rawSuggestion.weightKg,
        unadjustedSuggestedReps: rawSuggestion.reps,
        unadjustedSuggestedE1rmKg,
        planMode: final.planMode,
        reasoning: buildCurrentSetReason(workingSetPos, final, analysis, fatiguePct, final.crossExerciseFatiguePct ?? 0),
        confidence: analysis.confidence,
        isBodyweightOnly: final.isBodyweightOnly,
        fatigueAdjustmentPct: final.fatigueAdjustmentPct ?? 0,
        crossExerciseFatiguePct: final.crossExerciseFatiguePct ?? 0,
        confidenceSignal,
      }
    }

    workingSetPos++
  }

  return null
}

// ─── analyzeExerciseHistory (backward-compat export for ExerciseDetail) ───────

export function analyzeExerciseHistory(
  sessions,
  equipment,
  unitPreference = 'kg',
  userBodyweightKg = null,
  userGender = null,
  exerciseName = null
) {
  const setHistory = getSetHistoryByIndex(sessions, 0)
  if (!setHistory.length) {
    const analysis = analyzeSetHistory(
      setHistory, 0, equipment, unitPreference, null, userBodyweightKg, false,
      null, null, null, null, null, 'auto', exerciseName, userGender
    )
    const suggestion = buildPerSetSuggestion(0, analysis)
    return {
      action: suggestion.action,
      suggestedWeightKg: suggestion.weightKg,
      suggestedReps: suggestion.reps,
      reasoning: suggestion.reasoning,
      confidence: suggestion.confidence,
    }
  }
  const analysis = analyzeSetHistory(
    setHistory, 0, equipment, unitPreference, null, userBodyweightKg, false,
    null, null, null, null, null, 'auto', exerciseName, userGender
  )
  const suggestion = buildPerSetSuggestion(0, analysis)
  return {
    action: suggestion.action,
    suggestedWeightKg: suggestion.weightKg,
    suggestedReps: suggestion.reps,
    reasoning: suggestion.reasoning,
    confidence: suggestion.confidence,
    objective: analysis.objectiveProfile?.objective ?? null,
    repRange: analysis.objectiveProfile ?? null,
    isBodyweightOnly: analysis.isBodyweightOnly,
    objectiveLabel: analysis.objectiveLabel,
    repRangeText: analysis.repRangeText,
    planMode: suggestion.planMode,
  }
}
