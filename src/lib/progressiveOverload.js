import { toKg } from './liftMath'
import { computeMuscleOverlapWeight } from './muscleWorkload'
import { ESTIMATED_ORM_REP_CAP, calculateORM } from './orm'
import { PLATE_EQUIPMENT, snapToPlates } from './plateUtils'
import { weightForOrm, anchorsOrNull, getAnchors } from './strengthStandards'

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_SESSION_LIMIT = 8
const HISTORY_SETS_PER_SESSION_ESTIMATE = 25
const GOAL_INFERENCE_LIMIT = 3
const FAILURE_WINDOW = 5
const FAILURE_COUNT_THRESHOLD = 3
const FAILURE_E1RM_DROP_PCT = 0.07
const PROGRESSION_E1RM_UP_PCT = 0.03
const WEIGHT_INCREASE_PCT = 0.025
const DELOAD_WEIGHT_PCT = 0.05
const FATIGUE_MAX_PCT = 0.05
const CROSS_EXERCISE_PER_SET_RATE = 0.01
const CROSS_EXERCISE_DECAY = 0.60
const CROSS_EXERCISE_PRE_FATIGUE_MAX_PCT = 0.08
const WARMUP_E1RM_THRESHOLD = 0.80
const REACCLIMATION_HOLD_DAYS = 8
const REACCLIMATION_REDUCE_ONE_DAYS = 15
const REACCLIMATION_REDUCE_TWO_DAYS = 28
const SAME_LOAD_TOLERANCE_KG = 0.25
const LBS_TO_KG = 0.453592
const FALLBACK_BODYWEIGHT_KG = 180 * LBS_TO_KG
const PLAN_PERIODIZATION_STYLES = new Set(['double_progression', 'linear', 'undulating', 'maintenance', 'deload_aware'])
const PLAN_INTENSITY_TAGS = new Set(['standard', 'heavy', 'volume', 'light', 'maintenance'])
const PLAN_PROGRESSION_BIASES = new Set(['reps_first', 'load_first', 'maintenance', 'deload_aware'])

export const WEIGHT_INCREMENTS_KG = {
  'Barbell': 2.5,
  'EZ Bar': 2.5,
  'Smith Machine': 2.5,
  'Plate Loaded': 2.5,
  'Dumbbell': 5.0,
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

export function getWeightIncrement(equipment, unitPreference = 'kg') {
  if (unitPreference === 'lbs') {
    const lbs = WEIGHT_INCREMENTS_LBS[equipment] ?? 5
    return toKg(lbs, 'lbs')
  }
  return WEIGHT_INCREMENTS_KG[equipment] ?? 2.5
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

function getPlanFailureThreshold(progressionBias) {
  return progressionBias === 'deload_aware' ? Math.max(2, FAILURE_COUNT_THRESHOLD - 1) : FAILURE_COUNT_THRESHOLD
}

function calcOrmKg(weightKg, reps) {
  if (!reps || reps <= 0) return 0
  if (reps > ESTIMATED_ORM_REP_CAP) return null
  if (reps === 1) return weightKg
  return calculateORM(weightKg, reps)
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

  const lower = clamp(roundedCenter - 3, 12, 20)
  const upper = clamp(roundedCenter + 3, lower, 20)
  return {
    objective: 'endurance',
    center: roundedCenter,
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

// ─── DB row → set object ──────────────────────────────────────────────────────

function buildSessionSet(record) {
  const unit = record.unit || 'kg'
  const weight = record.weight === null || record.weight === undefined ? null : Number(record.weight)
  const reps = record.reps === null || record.reps === undefined ? null : Number(record.reps)
  const weightKg = weight === null ? null : toKg(weight, unit)
  const storedOrm = record.estimated_1rm === null || record.estimated_1rm === undefined
    ? null
    : toKg(Number(record.estimated_1rm), unit)
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
    estimatedOrmKg,
    duration_seconds: record.duration_seconds === null || record.duration_seconds === undefined ? null : Number(record.duration_seconds),
    set_number: Number(record.set_number) || 1,
    completed_at: completedAt,
    rest_before_seconds: isFiniteNumber(restBeforeSeconds) ? restBeforeSeconds : null,
    progressionEvent: record.progression_event ?? null,
    isWarmup: record.is_warmup ?? false,
  }
}

// ─── fetchRecentSessions ──────────────────────────────────────────────────────

export async function fetchRecentSessions(userId, exerciseIds, supabase, currentSessionId = null) {
  if (!exerciseIds.length || !userId) return {}
  await getAnchors()

  // Roundtrip 1: lightweight — identify the last HISTORY_SESSION_LIMIT session IDs
  // per exercise. Only 3 narrow columns; no JOIN needed.
  let indexQuery = supabase
    .from('workout_sets')
    .select('exercise_id, session_id, created_at')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: false })
    .limit(exerciseIds.length * HISTORY_SESSION_LIMIT * HISTORY_SETS_PER_SESSION_ESTIMATE)

  if (currentSessionId) {
    indexQuery = indexQuery.neq('session_id', currentSessionId)
  }

  const { data: indexData, error: indexError } = await indexQuery
  if (indexError || !indexData?.length) return {}

  // Client-side dedup: rows are DESC so first unique session_id per exercise = most recent.
  const sessionIdsByExercise = {}
  for (const row of indexData) {
    const { exercise_id: exerciseId, session_id: sessionId } = row
    if (!sessionIdsByExercise[exerciseId]) sessionIdsByExercise[exerciseId] = new Set()
    if (sessionIdsByExercise[exerciseId].size < HISTORY_SESSION_LIMIT) {
      sessionIdsByExercise[exerciseId].add(sessionId)
    }
  }

  const allSessionIds = [...new Set(Object.values(sessionIdsByExercise).flatMap(s => [...s]))]
  if (!allSessionIds.length) return {}

  // Roundtrip 2: full set data for exactly those sessions — no row-count guessing.
  const { data, error } = await supabase
    .from('workout_sets')
    .select(`
      exercise_id,
      weight,
      reps,
      unit,
      estimated_1rm,
      set_number,
      duration_seconds,
      completed_at,
      rest_before_seconds,
      created_at,
      session_id,
      progression_event,
      is_warmup,
      workout_sessions!inner(started_at)
    `)
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .in('session_id', allSessionIds)

  if (error || !data?.length) return {}

  const groupedByExercise = {}

  for (const row of data) {
    const exerciseId = row.exercise_id
    const sessionId = row.session_id
    if (!groupedByExercise[exerciseId]) groupedByExercise[exerciseId] = new Map()
    if (!groupedByExercise[exerciseId].has(sessionId)) {
      groupedByExercise[exerciseId].set(sessionId, {
        sessionId,
        sessionDate: new Date(row.workout_sessions.started_at),
        sets: [],
      })
    }
    groupedByExercise[exerciseId].get(sessionId).sets.push(buildSessionSet(row))
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

  return sessionsByExercise
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

// ─── Per-set history extraction ───────────────────────────────────────────────

function getSetHistoryByIndex(sessions, setIndex) {
  const targetSetNumber = setIndex + 1
  const result = []

  for (const session of sessions) {
    const allSessionSets = (session.sets || []).filter(s =>
      isFiniteNumber(s.reps) && isFiniteNumber(s.estimatedOrmKg) && s.estimatedOrmKg > 0
    )
    if (!allSessionSets.length) continue

    // Find best e1RM set in this session for warmup exclusion
    let sessionBestOrmKg = 0
    let bestSetNumber = 0
    for (const s of allSessionSets) {
      if (s.estimatedOrmKg > sessionBestOrmKg) {
        sessionBestOrmKg = s.estimatedOrmKg
        bestSetNumber = s.set_number
      }
    }

    const targetSet = allSessionSets.find(s => s.set_number === targetSetNumber)
    if (!targetSet) continue
    if (!isFiniteNumber(targetSet.weightKg) || !isFiniteNumber(targetSet.estimatedOrmKg)) continue
    if (targetSet.isWarmup) continue

    // Warmup exclusion: before the peak set AND e1RM < 80% of session best
    if (
      sessionBestOrmKg > 0 &&
      targetSetNumber < bestSetNumber &&
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
    .filter(e => e.set.progressionEvent !== 'deload' && e.set.progressionEvent !== 'reacclimate')
    .slice(-FAILURE_WINDOW)
    .map(entry => entry.set.estimatedOrmKg)
    .filter(v => isFiniteNumber(v) && v > 0)
  return values.length > 0 ? median(values) : null
}

// ─── Deload boundary ──────────────────────────────────────────────────────────

function findDeloadBoundaryIndex(setHistory) {
  for (let i = setHistory.length - 1; i >= 0; i--) {
    if (setHistory[i].set.progressionEvent === 'deload') return i
  }
  return -1
}

// ─── Failure counting ─────────────────────────────────────────────────────────

function countSetFailures(setHistory, expectedE1rmKg) {
  if (!isFiniteNumber(expectedE1rmKg) || expectedE1rmKg <= 0) {
    return { count: 0, total: 0, postDeloadGuard: false }
  }

  const boundaryIndex = findDeloadBoundaryIndex(setHistory)
  const postDeloadEntries = boundaryIndex === -1
    ? setHistory
    : setHistory.slice(boundaryIndex + 1)

  if (boundaryIndex !== -1 && postDeloadEntries.length < 2) {
    return { count: 0, total: 0, postDeloadGuard: true }
  }

  const window = postDeloadEntries.slice(-FAILURE_WINDOW)
  const threshold = expectedE1rmKg * (1 - FAILURE_E1RM_DROP_PCT)
  let count = 0
  for (const entry of window) {
    if (isFiniteNumber(entry.set.estimatedOrmKg) && entry.set.estimatedOrmKg < threshold) count++
  }

  return { count, total: window.length, postDeloadGuard: false }
}

function countBodyweightRepFailures(setHistory, expectedReps) {
  if (!isFiniteNumber(expectedReps) || expectedReps <= 0) {
    return { count: 0, total: 0, postDeloadGuard: false }
  }

  const boundaryIndex = findDeloadBoundaryIndex(setHistory)
  const postDeloadEntries = boundaryIndex === -1
    ? setHistory
    : setHistory.slice(boundaryIndex + 1)

  if (boundaryIndex !== -1 && postDeloadEntries.length < 2) {
    return { count: 0, total: 0, postDeloadGuard: true }
  }

  const window = postDeloadEntries.slice(-FAILURE_WINDOW)
  const threshold = expectedReps * (1 - FAILURE_E1RM_DROP_PCT)
  let count = 0
  for (const entry of window) {
    if (isFiniteNumber(entry.set.reps) && entry.set.reps < threshold) count++
  }

  return { count, total: window.length, postDeloadGuard: false }
}

// ─── Progression trigger ──────────────────────────────────────────────────────

function checkSetProgressionTrigger(setHistory, objectiveProfile, expectedE1rmKg) {
  if (setHistory.length < 2) return { triggered: false, reason: null }

  const last2 = setHistory.slice(-2)

  const triggerA = last2.every(entry =>
    isFiniteNumber(entry.set.reps) && entry.set.reps >= objectiveProfile.upper
  )
  if (triggerA) return { triggered: true, reason: 'rep_ceiling' }

  if (isFiniteNumber(expectedE1rmKg) && expectedE1rmKg > 0) {
    const e1rmThreshold = expectedE1rmKg * (1 + PROGRESSION_E1RM_UP_PCT)
    const triggerB = last2.every(entry =>
      isFiniteNumber(entry.set.estimatedOrmKg) && entry.set.estimatedOrmKg >= e1rmThreshold
    )
    if (triggerB) return { triggered: true, reason: 'e1rm_above' }
  }

  return { triggered: false, reason: null }
}

// ─── Beginner ORM lookup ──────────────────────────────────────────────────────

function normalizeStrengthGender(gender) {
  const normalized = String(gender || '').toLowerCase()
  if (normalized === 'female') return 'female'
  if (normalized === 'male') return 'male'
  return null
}

function getBeginnerAnchorRatio(exerciseName, userGender) {
  if (!exerciseName) return null
  const gender = normalizeStrengthGender(userGender)

  if (gender) {
    const anchors = anchorsOrNull()?.[gender]?.[exerciseName]
    return anchors && isFiniteNumber(anchors[1]) && anchors[1] > 0 ? anchors[1] : null
  }

  const ratios = ['female', 'male']
    .map(key => anchorsOrNull()?.[key]?.[exerciseName]?.[1])
    .filter(value => isFiniteNumber(value) && value > 0)

  return ratios.length ? Math.min(...ratios) : null
}

function getBeginnerOrmKg(exerciseName, userBodyweightKg, userGender) {
  const beginnerRatio = getBeginnerAnchorRatio(exerciseName, userGender)
  if (!isFiniteNumber(beginnerRatio) || beginnerRatio <= 0) return null

  const bwKg = isFiniteNumber(userBodyweightKg) && userBodyweightKg > 0
    ? userBodyweightKg
    : FALLBACK_BODYWEIGHT_KG
  return bwKg * beginnerRatio
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
  userGender,
  exerciseName,
  isFallbackFromPrior,
  customIncrementKg = null,
  customStartingWeightKg = null,
  planPeriodizationStyle = null,
  planIntensityTag = null,
  planProgressionBias = null,
) {
  const normalizedPlanStyle = normalizePlanPeriodizationStyle(planPeriodizationStyle)
  const normalizedIntensityTag = normalizePlanIntensityTag(planIntensityTag)
  const normalizedProgressionBias = normalizePlanProgressionBias(planProgressionBias, normalizedPlanStyle, normalizedIntensityTag)
  const incrementKg = customIncrementKg ?? getWeightIncrement(equipment, unitPreference)
  const startingWeightKg = customStartingWeightKg ?? 0
  const snapWeight = createWeightSnapper(equipment, unitPreference, incrementKg, customIncrementKg !== null, startingWeightKg)
  const objectiveProfile = inferSetObjectiveProfile(setHistory, planRange)
  const expectedE1rmKg = getSetExpectedE1rmKg(setHistory)
  const failures = countSetFailures(setHistory, expectedE1rmKg)
  const progressionTrigger = checkSetProgressionTrigger(setHistory, objectiveProfile, expectedE1rmKg)

  const lastEntry = setHistory.at(-1)
  const daysSinceLast = lastEntry
    ? (Date.now() - lastEntry.session.sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    : null
  const reacclimationTier = getReacclimationTier(daysSinceLast)

  const baselineWeightKg = lastEntry && isFiniteNumber(lastEntry.set.weightKg)
    ? snapWeight(lastEntry.set.weightKg)
    : null
  const baselineReps = clampRepsToRange(
    lastEntry?.set?.reps ?? objectiveProfile.center,
    objectiveProfile
  )

  const isBodyweightOnly = equipment === 'Bodyweight'
    && setHistory.length > 0
    && setHistory.every(entry =>
      !isFiniteNumber(entry.set.weightKg) || Math.abs(entry.set.weightKg) < SAME_LOAD_TOLERANCE_KG
    )

  let planModeTargetReps = null
  let planModeTargetWeightKg = null
  let beginnerFallback = false

  if (planRange && !isBodyweightOnly) {
    if (setHistory.length > 0 && isFiniteNumber(expectedE1rmKg) && expectedE1rmKg > 0) {
      const recentReps = setHistory
        .slice(-GOAL_INFERENCE_LIMIT)
        .map(e => e.set.reps)
        .filter(r => isFiniteNumber(r) && r > 0)
      const historicalMedianReps = median(recentReps)
      planModeTargetReps = isFiniteNumber(historicalMedianReps)
        ? clamp(Math.round(historicalMedianReps), planRange.low, planRange.high)
        : Math.round((planRange.low + planRange.high) / 2)
      const rawWeight = weightForOrm(expectedE1rmKg, planModeTargetReps)
      planModeTargetWeightKg = isFiniteNumber(rawWeight) && rawWeight > 0
        ? snapWeight(rawWeight)
        : null
    } else if (setHistory.length === 0) {
      planModeTargetReps = Math.round((planRange.low + planRange.high) / 2)
      const beginnerOrmKg = getBeginnerOrmKg(exerciseName, userBodyweightKg, userGender)
      if (isFiniteNumber(beginnerOrmKg) && beginnerOrmKg > 0) {
        const rawWeight = weightForOrm(beginnerOrmKg, planModeTargetReps)
        planModeTargetWeightKg = isFiniteNumber(rawWeight) && rawWeight > 0
          ? snapWeight(rawWeight)
          : null
        beginnerFallback = true
      }
    }
  } else if (planRange && isBodyweightOnly) {
    const recentReps = setHistory
      .slice(-GOAL_INFERENCE_LIMIT)
      .map(e => e.set.reps)
      .filter(r => isFiniteNumber(r) && r > 0)
    const historicalMedianReps = median(recentReps)
    planModeTargetReps = isFiniteNumber(historicalMedianReps)
      ? clamp(Math.round(historicalMedianReps), planRange.low, planRange.high)
      : Math.round((planRange.low + planRange.high) / 2)
  } else if (!planRange && !isBodyweightOnly && setHistory.length === 0) {
    const beginnerOrmKg = getBeginnerOrmKg(exerciseName, userBodyweightKg, userGender)
    if (isFiniteNumber(beginnerOrmKg) && beginnerOrmKg > 0) {
      planModeTargetReps = objectiveProfile.center
      const rawWeight = weightForOrm(beginnerOrmKg, planModeTargetReps)
      planModeTargetWeightKg = isFiniteNumber(rawWeight) && rawWeight > 0
        ? snapWeight(rawWeight)
        : null
      beginnerFallback = true
    }
  }

  const objectiveLabel = formatObjectiveLabel(objectiveProfile?.objective)
  const repRangeText = objectiveProfile ? formatRepRange(objectiveProfile) : ''

  return {
    objectiveProfile,
    expectedE1rmKg,
    failures,
    progressionTrigger,
    reacclimationTier,
    daysSinceLast,
    baselineWeightKg,
    baselineReps,
    planModeTargetReps,
    planModeTargetWeightKg,
    beginnerFallback,
    incrementKg,
    snapWeight,
    confidence: buildSetConfidence(setHistory),
    isBodyweightOnly,
    isFallbackFromPrior: Boolean(isFallbackFromPrior),
    planPeriodizationStyle: normalizedPlanStyle,
    planIntensityTag: normalizedIntensityTag,
    planProgressionBias: normalizedProgressionBias,
    planRange,
    objectiveLabel,
    repRangeText,
    setHistory,
  }
}

// ─── Weight reduction helper ──────────────────────────────────────────────────

function safeReduceWeight(weightKg, pct, incrementKg, snapWeight) {
  if (!isFiniteNumber(weightKg) || weightKg <= 0) return null
  const reduced = snapWeight(weightKg * (1 - pct))
  if (isFiniteNumber(reduced) && reduced < weightKg - SAME_LOAD_TOLERANCE_KG / 2) return reduced
  const fallback = snapWeight(weightKg - incrementKg)
  return isFiniteNumber(fallback) ? fallback : null
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
    planProgressionBias,
  } = analysis

  const expectedReps = median(
    setHistory.slice(-FAILURE_WINDOW).map(e => e.set.reps).filter(r => isFiniteNumber(r) && r > 0)
  )
  const failures = countBodyweightRepFailures(setHistory, expectedReps)
  const progressionTrigger = checkSetProgressionTrigger(setHistory, objectiveProfile, null)
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

  if (!failures.postDeloadGuard && failures.count >= FAILURE_COUNT_THRESHOLD) {
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
    planRange,
    objectiveLabel,
    repRangeText,
    setHistory,
    planProgressionBias,
  } = analysis

  if (isBodyweightOnly) return buildBodyweightSuggestion(analysis)

  const isPlanMode = planRange !== null

  if (setHistory.length === 0) {
    if (planModeTargetWeightKg !== null) {
      return {
        action: 'maintain', weightKg: planModeTargetWeightKg, reps: planModeTargetReps,
        planMode: isPlanMode ? 'plan_beginner' : 'beginner',
        reasoning: `${objectiveLabel} focus (${repRangeText}) — no prior history, so starting with an estimated beginner weight for this rep target.`,
        confidence: 'low', isBodyweightOnly: false, objectiveLabel, repRangeText,
      }
    }
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

  // Priority 5: progression
  if (progressionTrigger.triggered) {
    const weight = isFiniteNumber(startWeightKg)
      ? snapWeight(startWeightKg * (1 + WEIGHT_INCREASE_PCT))
      : null
    const reason = progressionTrigger.reason === 'rep_ceiling'
      ? 'you have hit the top of the range for 2 sessions in a row, so add weight and reset to the lower end.'
      : 'your estimated 1RM has been consistently above your baseline for 2 sessions, so add weight and work from the lower end.'
    return {
      action: 'increase_weight', weightKg: weight, reps: objectiveProfile.lowerHalfTarget,
      planMode: 'increase_weight',
      reasoning: `${objectiveLabel} focus (${repRangeText}) — ${reason}`,
      confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
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

  return {
    action, weightKg: startWeightKg, reps: suggestedReps,
    planMode: action === 'increase_reps' ? 'increase_reps' : 'maintain',
    reasoning: `${objectiveLabel} focus (${repRangeText}) — ${
      action === 'increase_reps'
        ? 'add a rep within the range before bumping the load.'
        : 'repeat your current target and keep accumulating quality reps.'
    }`,
    confidence, isBodyweightOnly: false, objectiveLabel, repRangeText,
  }
}

// ─── Fatigue cascade (within-session) ────────────────────────────────────────

function applyE1rmFatigueCascade(
  suggestion,
  previousPlannedE1rmKg,
  previousActualE1rmKg,
  objectiveProfile,
  snapWeight,
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
    return { ...suggestion, reps: newReps, fatigueAdjustmentPct: fatiguePct }
  }

  if (!isFiniteNumber(suggestion.weightKg) || !isFiniteNumber(suggestion.reps)) {
    return { ...suggestion, fatigueAdjustmentPct: 0 }
  }

  const plannedE1rm = calcOrmKg(suggestion.weightKg, suggestion.reps)
  if (!isFiniteNumber(plannedE1rm) || plannedE1rm <= 0) {
    return { ...suggestion, fatigueAdjustmentPct: 0 }
  }

  const adjustedE1rm = plannedE1rm * (1 - fatiguePct)
  const rawWeight = weightForOrm(adjustedE1rm, suggestion.reps)
  const newWeightKg = isFiniteNumber(rawWeight) && rawWeight > 0
    ? snapWeight(rawWeight)
    : suggestion.weightKg

  return { ...suggestion, weightKg: newWeightKg, fatigueAdjustmentPct: fatiguePct }
}

// ─── Cross-exercise pre-fatigue (within-session) ─────────────────────────────

function countWorkingSets(doneSets) {
  if (!doneSets?.length) return 0
  const parsedSets = doneSets.filter(s => s.reps > 0 && s.setType !== 'warmup')
  if (!parsedSets.length) return 0

  const isBodyweight = parsedSets.every(s => s.weight <= 0)
  if (isBodyweight) {
    const peakReps = Math.max(...parsedSets.map(s => s.reps))
    return parsedSets.filter(s => s.reps >= peakReps * WARMUP_E1RM_THRESHOLD).length
  }

  const e1rms = parsedSets.map(s => s.weight * (1 + s.reps / 30))
  const peak = Math.max(...e1rms)
  return e1rms.filter(e => e >= peak * WARMUP_E1RM_THRESHOLD).length
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

function applyCrossExercisePreFatigue(suggestion, preFatiguePct, objectiveProfile, snapWeight) {
  if (
    suggestion.action === 'deload' ||
    suggestion.action === 'first_time' ||
    !isFiniteNumber(preFatiguePct) || preFatiguePct <= 0
  ) return { ...suggestion, crossExerciseFatiguePct: 0 }

  if (suggestion.isBodyweightOnly) {
    if (!isFiniteNumber(suggestion.reps)) return { ...suggestion, crossExerciseFatiguePct: 0 }
    const newReps = Math.max(objectiveProfile.lower, Math.round(suggestion.reps * (1 - preFatiguePct)))
    return { ...suggestion, reps: newReps, crossExerciseFatiguePct: preFatiguePct }
  }

  if (!isFiniteNumber(suggestion.weightKg) || !isFiniteNumber(suggestion.reps))
    return { ...suggestion, crossExerciseFatiguePct: 0 }

  const plannedE1rm = calcOrmKg(suggestion.weightKg, suggestion.reps)
  if (!isFiniteNumber(plannedE1rm) || plannedE1rm <= 0)
    return { ...suggestion, crossExerciseFatiguePct: 0 }

  const adjustedE1rm = plannedE1rm * (1 - preFatiguePct)
  const rawWeight = weightForOrm(adjustedE1rm, suggestion.reps)
  const newWeightKg = isFiniteNumber(rawWeight) && rawWeight > 0 ? snapWeight(rawWeight) : suggestion.weightKg
  return { ...suggestion, weightKg: newWeightKg, crossExerciseFatiguePct: preFatiguePct }
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

function applyPerSetE1rmFloor(suggestion, expectedE1rmKg, objectiveProfile, snapWeight, incrementKg, isPlanMode) {
  if (
    suggestion.action === 'deload' ||
    suggestion.action === 'first_time' ||
    suggestion.isBodyweightOnly ||
    !isFiniteNumber(expectedE1rmKg) || expectedE1rmKg <= 0 ||
    !isFiniteNumber(suggestion.weightKg) ||
    !isFiniteNumber(suggestion.reps) ||
    isPlanMode
  ) {
    return suggestion
  }

  const plannedE1rm = calcOrmKg(suggestion.weightKg, suggestion.reps)
  const fatigueMultiplier = getAppliedFatigueMultiplier(suggestion)
  const floor = (expectedE1rmKg * fatigueMultiplier) - SAME_LOAD_TOLERANCE_KG
  const floorWasFatigueAdjusted = fatigueMultiplier < 1

  if (isFiniteNumber(plannedE1rm) && plannedE1rm >= floor) return suggestion

  // Try increasing reps within range
  for (let reps = suggestion.reps + 1; reps <= objectiveProfile.upper; reps++) {
    const e1rm = calcOrmKg(suggestion.weightKg, reps)
    if (isFiniteNumber(e1rm) && e1rm >= floor) {
      return { ...suggestion, reps, e1rmFloorAdjusted: true, e1rmFloorFatigueAdjusted: floorWasFatigueAdjusted }
    }
  }

  // Try one weight step up
  const newWeight = snapWeight(suggestion.weightKg + incrementKg)
  if (isFiniteNumber(newWeight) && newWeight > suggestion.weightKg) {
    const e1rm = calcOrmKg(newWeight, suggestion.reps)
    if (isFiniteNumber(e1rm) && e1rm >= floor) {
      return { ...suggestion, weightKg: newWeight, e1rmFloorAdjusted: true, e1rmFloorFatigueAdjusted: floorWasFatigueAdjusted }
    }
  }

  return suggestion
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

// ─── Main: buildCurrentSetSuggestion ─────────────────────────────────────────

export function buildCurrentSetSuggestion({
  sessions = [],
  currentSets = [],
  equipment,
  unitPreference = 'kg',
  planTargetReps = null,
  planRepRange = '',
  userBodyweightKg = null,
  userGender = null,
  exerciseName = null,
  priorExercises = [],
  currentPrimaryMuscles = [],
  currentSecondaryMuscles = [],
  customIncrementKg = null,
  customStartingWeightKg = null,
  planPeriodizationStyle = null,
  planIntensityTag = null,
  planProgressionBias = null,
}) {
  if (!currentSets.length) return null

  const activeSetIndex = currentSets.findIndex(set => !set.done)
  if (activeSetIndex === -1) return null

  const planRange = parsePlanRange(planRepRange, planTargetReps)

  let previousPlannedE1rmKg = null
  let previousActualE1rmKg = null
  let previousPlannedReps = null
  let previousActualReps = null
  const crossPct = computeSessionPreFatiguePct(priorExercises, currentPrimaryMuscles, currentSecondaryMuscles)
  let effectiveCrossPct = crossPct
  // Capture Set 1's actual suggestion (after all adjustments) to use as the
  // baseline for cross-exercise fatigue correction at setIndex=1.
  let set1SuggestedE1rmKg = null
  let set1SuggestedReps = null

  for (let setIndex = 0; setIndex <= activeSetIndex; setIndex++) {
    let setHistory = getSetHistoryByIndex(sessions, setIndex)
    let isFallbackFromPrior = false

    if (setHistory.length === 0 && setIndex > 0) {
      setHistory = getSetHistoryByIndex(sessions, setIndex - 1)
      isFallbackFromPrior = true
    }

    const analysis = analyzeSetHistory(
      setHistory, setIndex, equipment, unitPreference,
      planRange, userBodyweightKg, userGender, exerciseName, isFallbackFromPrior, customIncrementKg, customStartingWeightKg,
      planPeriodizationStyle, planIntensityTag, planProgressionBias
    )

    const rawSuggestion = buildPerSetSuggestion(setIndex, analysis)

    let adjusted = rawSuggestion
    let fatiguePct = 0

    if (setIndex > 0) {
      // After Set 1 is done, use its actual performance to correct the cross-exercise
      // fatigue estimate. If you beat the adjusted suggestion, the original estimate
      // was too aggressive — recalculate from the model inverse. Only fires once
      // (setIndex === 1) and only when ratio > 1; underperformance is handled by
      // the within-exercise cascade below.
      if (setIndex === 1 && crossPct > 0) {
        if (analysis.isBodyweightOnly) {
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

      if (analysis.isBodyweightOnly) {
        const rawFatigue = isFiniteNumber(previousPlannedReps) && previousPlannedReps > 0 && isFiniteNumber(previousActualReps)
          ? Math.max(0, (previousPlannedReps - previousActualReps) / previousPlannedReps)
          : 0
        fatiguePct = Math.min(rawFatigue, FATIGUE_MAX_PCT)
        if (fatiguePct > 0 && isFiniteNumber(rawSuggestion.reps) && rawSuggestion.action !== 'deload') {
          const newReps = Math.max(
            analysis.objectiveProfile.lower,
            Math.floor(rawSuggestion.reps * (1 - fatiguePct))
          )
          adjusted = { ...rawSuggestion, reps: newReps, fatigueAdjustmentPct: fatiguePct }
        } else {
          adjusted = { ...rawSuggestion, fatigueAdjustmentPct: 0 }
        }
      } else {
        adjusted = applyE1rmFatigueCascade(
          rawSuggestion,
          previousPlannedE1rmKg,
          previousActualE1rmKg,
          analysis.objectiveProfile,
          analysis.snapWeight
        )
        fatiguePct = adjusted.fatigueAdjustmentPct ?? 0
      }
      adjusted = effectiveCrossPct > 0
        ? applyCrossExercisePreFatigue(adjusted, effectiveCrossPct, analysis.objectiveProfile, analysis.snapWeight)
        : { ...adjusted, crossExerciseFatiguePct: 0 }
    } else {
      adjusted = effectiveCrossPct > 0
        ? { ...applyCrossExercisePreFatigue(rawSuggestion, effectiveCrossPct, analysis.objectiveProfile, analysis.snapWeight), fatigueAdjustmentPct: 0 }
        : { ...rawSuggestion, fatigueAdjustmentPct: 0, crossExerciseFatiguePct: 0 }
    }

    const final = applyPerSetE1rmFloor(
      adjusted,
      analysis.expectedE1rmKg,
      analysis.objectiveProfile,
      analysis.snapWeight,
      analysis.incrementKg,
      planRange !== null
    )

    // Capture what was actually suggested on Set 1 (after all adjustments including
    // cross-exercise fatigue) so setIndex=1 can compare actual vs adjusted suggestion,
    // not actual vs historical baseline.
    if (setIndex === 0) {
      if (analysis.isBodyweightOnly) {
        set1SuggestedReps = isFiniteNumber(final.reps) ? final.reps : null
      } else if (isFiniteNumber(final.weightKg) && isFiniteNumber(final.reps)) {
        set1SuggestedE1rmKg = calcOrmKg(final.weightKg, final.reps)
      }
    }

    // Update planned values for next set's fatigue calculation
    if (analysis.isBodyweightOnly) {
      previousPlannedReps = final.reps
    } else if (isFiniteNumber(final.weightKg) && isFiniteNumber(final.reps)) {
      previousPlannedE1rmKg = isFiniteNumber(analysis.expectedE1rmKg) && analysis.expectedE1rmKg > 0
        ? analysis.expectedE1rmKg
        : calcOrmKg(final.weightKg, final.reps)
    }

    if (setIndex < activeSetIndex) {
      const completedSet = parseLoggedStrengthSet(currentSets[setIndex], unitPreference)
      if (analysis.isBodyweightOnly) {
        previousActualReps = completedSet.reps
      } else if (isFiniteNumber(completedSet.weightKg) && isFiniteNumber(completedSet.reps) && completedSet.reps > 0) {
        previousActualE1rmKg = calcOrmKg(completedSet.weightKg, completedSet.reps)
      }
    }

    if (setIndex === activeSetIndex) {
      if (final.action === 'first_time') return null

      return {
        activeSetIndex,
        action: final.action,
        suggestedWeightKg: analysis.isBodyweightOnly ? 0 : final.weightKg,
        suggestedReps: final.reps,
        planMode: final.planMode,
        reasoning: buildCurrentSetReason(setIndex, final, analysis, fatiguePct, final.crossExerciseFatiguePct ?? 0),
        confidence: analysis.confidence,
        isBodyweightOnly: analysis.isBodyweightOnly,
        crossExerciseFatiguePct: final.crossExerciseFatiguePct ?? 0,
      }
    }
  }

  return null
}

// ─── analyzeExerciseHistory (backward-compat export for ExerciseDetail) ───────

export function analyzeExerciseHistory(sessions, equipment, unitPreference = 'kg') {
  const setHistory = getSetHistoryByIndex(sessions, 0)
  if (!setHistory.length) {
    return {
      action: 'first_time',
      suggestedWeightKg: null,
      suggestedReps: null,
      reasoning: '',
      confidence: 'low',
    }
  }
  const analysis = analyzeSetHistory(setHistory, 0, equipment, unitPreference, null, null, null, false)
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
