import { VALIDATION_LIMITS, trimToMax } from './inputValidation'
import { MAX_REPS } from './liftMath'
import { repairDropSetGroups, repairSupersetExerciseGroups } from './workoutSets'

const MAX_DRAFT_EXERCISES = 100
const MAX_DRAFT_SETS_PER_EXERCISE = 100
const MAX_DRAFT_NOTE_ENTRIES = 80
const MAX_TEMPLATE_IDS = 100
const MAX_ID_LENGTH = 120

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function safeString(value, maxLength = MAX_ID_LENGTH) {
  return trimToMax(String(value ?? ''), maxLength)
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeTimestamp(value, fallback = Date.now()) {
  const numeric = finiteNumber(value, fallback)
  const now = Date.now()
  const earliest = now - 7 * 24 * 60 * 60 * 1000
  const latest = now + 60 * 60 * 1000
  return clamp(numeric, earliest, latest)
}

const VALID_SET_TYPES = new Set(['normal', 'warmup', 'dropset', 'superset'])
const VALID_PROGRESSION_EVENTS = new Set(['deload', 'reacclimate', 'fatigue_adjusted'])

function sanitizeProgressionEvent(value) {
  const event = String(value ?? '')
  return VALID_PROGRESSION_EVENTS.has(event) ? event : null
}

function sanitizeStrengthSet(set = {}) {
  const repsText = String(set.reps ?? '')
  const parsedReps = Number.parseInt(repsText, 10)
  const weightText = String(set.weight ?? '')
  const parsedRest = set.restBeforeSeconds ?? set.rest_before_seconds
  const restNumber = parsedRest === null || parsedRest === undefined ? null : finiteNumber(parsedRest, null)

  const rawSetType = String(set.is_warmup ? 'warmup' : (set.setType ?? set.set_type ?? 'normal'))
  const setType = VALID_SET_TYPES.has(rawSetType) ? rawSetType : 'normal'

  const rawGroupIndex = set.setGroupIndex ?? set.set_group_index ?? null
  const parsedGroupIndex = rawGroupIndex !== null ? Math.round(finiteNumber(rawGroupIndex, -1)) : null
  const setGroupIndex = parsedGroupIndex !== null && parsedGroupIndex >= 0 ? parsedGroupIndex : null

  return {
    reps: Number.isInteger(parsedReps) && parsedReps >= 1 ? String(Math.min(parsedReps, MAX_REPS)) : '',
    weight: weightText.length <= 16 ? weightText : '',
    done: Boolean(set.done),
    completedAt: set.completedAt || set.completed_at || null,
    restBeforeSeconds: restNumber === null
      ? null
      : clamp(Math.round(restNumber), VALIDATION_LIMITS.restSecondsMin, VALIDATION_LIMITS.restSecondsMax),
    progressionEvent: sanitizeProgressionEvent(set.progressionEvent ?? set.progression_event),
    setType,
    setGroupIndex,
  }
}

function sanitizeCardioSet(set = {}) {
  const duration = Math.round(finiteNumber(set.duration ?? set.durationSeconds ?? set.duration_seconds, 0))
  return {
    duration: clamp(duration, 0, VALIDATION_LIMITS.cardioDurationMaxSeconds),
    done: Boolean(set.done),
    completedAt: set.completedAt || set.completed_at || null,
  }
}

function sanitizeWorkoutExercise(exercise = {}) {
  const category = safeString(exercise.category, 80)
  const isCardio = category === 'Cardio'
  const sets = Array.isArray(exercise.sets) ? exercise.sets.slice(0, MAX_DRAFT_SETS_PER_EXERCISE) : []
  const sanitizedSets = sets.length
    ? sets.map(set => isCardio ? sanitizeCardioSet(set) : sanitizeStrengthSet(set))
    : [isCardio ? sanitizeCardioSet() : sanitizeStrengthSet()]
  const repairedSets = isCardio ? sanitizedSets : repairDropSetGroups(sanitizedSets)

  return {
    id: exercise.id === null || exercise.id === undefined ? null : safeString(exercise.id, MAX_ID_LENGTH),
    name: safeString(exercise.name, VALIDATION_LIMITS.customExerciseNameMaxLength),
    category,
    equipment: safeString(exercise.equipment, 80),
    unit: exercise.unit === 'lbs' ? 'lbs' : 'kg',
    supersetGroupId: safeString(exercise.supersetGroupId, MAX_ID_LENGTH) || null,
    restSeconds: clamp(
      Math.round(finiteNumber(exercise.restSeconds ?? exercise.default_rest_seconds, 90)),
      VALIDATION_LIMITS.restSecondsMin,
      VALIDATION_LIMITS.restSecondsMax
    ),
    primary_muscles: Array.isArray(exercise.primary_muscles)
      ? exercise.primary_muscles.slice(0, 20).map(muscle => safeString(muscle, 80)).filter(Boolean)
      : [],
    secondary_muscles: Array.isArray(exercise.secondary_muscles)
      ? exercise.secondary_muscles.slice(0, 20).map(muscle => safeString(muscle, 80)).filter(Boolean)
      : [],
    planSource: exercise.planSource === 'training_plan' ? 'training_plan' : '',
    planId: safeString(exercise.planId, MAX_ID_LENGTH),
    planName: safeString(exercise.planName, VALIDATION_LIMITS.trainingPlanNameMaxLength),
    planDayId: safeString(exercise.planDayId, 40),
    planDayName: safeString(exercise.planDayName, 80),
    planWeek: Number.isFinite(Number(exercise.planWeek))
      ? clamp(Math.round(Number(exercise.planWeek)), 1, 52)
      : 1,
    planGoal: safeString(exercise.planGoal, 40),
    planTargetReps: Number.isFinite(Number(exercise.planTargetReps))
      ? clamp(Math.round(Number(exercise.planTargetReps)), 1, MAX_REPS)
      : null,
    planRepRange: safeString(exercise.planRepRange, 20),
    planPeriodizationStyle: safeString(exercise.planPeriodizationStyle, 40),
    planIntensityTag: safeString(exercise.planIntensityTag, 40),
    planProgressionBias: safeString(exercise.planProgressionBias, 40),
    planDeloadWeek: Boolean(exercise.planDeloadWeek),
    planDeloadReason: safeString(exercise.planDeloadReason, 40),
    sets: repairedSets,
  }
}

export function sanitizeExerciseNotes(notes) {
  if (!isPlainObject(notes)) return {}
  const entries = Object.entries(notes).slice(0, MAX_DRAFT_NOTE_ENTRIES)
  return Object.fromEntries(entries
    .map(([key, value]) => [
      safeString(key, MAX_ID_LENGTH),
      safeString(value, VALIDATION_LIMITS.exerciseNoteMaxLength),
    ])
    .filter(([key]) => Boolean(key)))
}

export function sanitizeNotesOpen(notesOpen) {
  if (!isPlainObject(notesOpen)) return {}
  const entries = Object.entries(notesOpen).slice(0, MAX_DRAFT_NOTE_ENTRIES)
  return Object.fromEntries(entries
    .map(([key, value]) => [safeString(key, MAX_ID_LENGTH), Boolean(value)])
    .filter(([key]) => Boolean(key)))
}

export function sanitizeRestTimer(restTimer) {
  if (!isPlainObject(restTimer)) return null
  const endTime = finiteNumber(restTimer.endTime, 0)
  if (!endTime || endTime <= Date.now()) return null
  const total = clamp(
    Math.round(finiteNumber(restTimer.total, VALIDATION_LIMITS.restSecondsMax)),
    VALIDATION_LIMITS.restSecondsMin,
    VALIDATION_LIMITS.restSecondsMax
  )

  return {
    endTime,
    total,
    exerciseName: safeString(restTimer.exerciseName, VALIDATION_LIMITS.customExerciseNameMaxLength),
    completed: Boolean(restTimer.completed),
  }
}

export function sanitizeWorkoutDraft(rawDraft, expectedVersion) {
  if (!isPlainObject(rawDraft) || rawDraft.version !== expectedVersion) return null

  const workoutExercises = Array.isArray(rawDraft.workoutExercises)
    ? repairSupersetExerciseGroups(rawDraft.workoutExercises.slice(0, MAX_DRAFT_EXERCISES).map(sanitizeWorkoutExercise))
    : []

  return {
    version: expectedVersion,
    savedAt: sanitizeTimestamp(rawDraft.savedAt),
    sessionId: rawDraft.sessionId ? safeString(rawDraft.sessionId, MAX_ID_LENGTH) : null,
    startedAt: sanitizeTimestamp(rawDraft.startedAt),
    workoutExercises,
    exerciseNotes: sanitizeExerciseNotes(rawDraft.exerciseNotes),
    notesOpen: sanitizeNotesOpen(rawDraft.notesOpen),
    restTimer: sanitizeRestTimer(rawDraft.restTimer),
    defaultUnit: rawDraft.defaultUnit === 'lbs' ? 'lbs' : 'kg',
    defaultRest: clamp(
      Math.round(finiteNumber(rawDraft.defaultRest, 90)),
      VALIDATION_LIMITS.restSecondsMin,
      VALIDATION_LIMITS.restSecondsMax
    ),
    roomId: rawDraft.roomId ? safeString(rawDraft.roomId, MAX_ID_LENGTH) : undefined,
    sourcePlanId: rawDraft.sourcePlanId ? safeString(rawDraft.sourcePlanId, MAX_ID_LENGTH) : null,
    sourcePlanDayId: rawDraft.sourcePlanDayId ? safeString(rawDraft.sourcePlanDayId, 40) : null,
    sourcePlanWeek: Number.isFinite(Number(rawDraft.sourcePlanWeek))
      ? clamp(Math.round(Number(rawDraft.sourcePlanWeek)), 1, 52)
      : null,
    sourcePlanDeloadWeek: Boolean(rawDraft.sourcePlanDeloadWeek),
  }
}

export function sanitizeHiddenTemplateIds(value, validIds = []) {
  const validIdSet = new Set(validIds.map(id => String(id)))
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .slice(0, MAX_TEMPLATE_IDS)
    .map(id => safeString(id, MAX_ID_LENGTH))
    .filter(id => validIdSet.size === 0 || validIdSet.has(id)))]
}
