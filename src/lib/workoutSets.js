import { VALIDATION_LIMITS } from './inputValidation'

export const defaultSet = () => ({ reps: '', weight: '', done: false, completedAt: null, restBeforeSeconds: null })
export const defaultCardioSet = () => ({ duration: 0, done: false, completedAt: null })

export function normalizeStrengthSet(set = {}) {
  const rawRest = set.restBeforeSeconds ?? set.rest_before_seconds
  const parsedRest = rawRest === null || rawRest === undefined ? null : Number(rawRest)
  return {
    ...defaultSet(),
    ...set,
    reps: set.reps ?? '',
    weight: set.weight ?? '',
    done: Boolean(set.done),
    completedAt: set.completedAt ?? set.completed_at ?? null,
    restBeforeSeconds: Number.isFinite(parsedRest) ? Math.max(0, parsedRest) : null,
  }
}

export function normalizeCardioSet(set = {}) {
  const parsedDuration = Number(set.duration)
  return {
    ...defaultCardioSet(),
    ...set,
    duration: Number.isFinite(parsedDuration) && parsedDuration >= 0
      ? Math.min(parsedDuration, VALIDATION_LIMITS.cardioDurationMaxSeconds)
      : 0,
    done: Boolean(set.done),
    completedAt: set.completedAt ?? set.completed_at ?? null,
  }
}

export function normalizeWorkoutExercise(exercise) {
  if (!exercise) return exercise
  const normalizeSet = exercise.category === 'Cardio' ? normalizeCardioSet : normalizeStrengthSet
  const normalizedSets = Array.isArray(exercise.sets) && exercise.sets.length > 0
    ? exercise.sets.map(normalizeSet)
    : [normalizeSet()]
  return {
    ...exercise,
    sets: normalizedSets,
  }
}

export function normalizeWorkoutExercises(exercises = []) {
  return exercises.map(normalizeWorkoutExercise)
}

function getRestBeforeSecondsForCompletedSet(sets, setIdx, completedAtMs) {
  for (let index = setIdx - 1; index >= 0; index -= 1) {
    const previousSet = sets[index]
    if (!previousSet?.done || !previousSet?.completedAt) continue
    const previousCompletedAtMs = Date.parse(previousSet.completedAt)
    if (!Number.isFinite(previousCompletedAtMs)) continue
    const diffSeconds = Math.round((completedAtMs - previousCompletedAtMs) / 1000)
    return diffSeconds > 0 ? diffSeconds : null
  }
  return null
}

export function markExerciseSetCompleted(exercise, setIdx, { completedAtMs = Date.now(), deriveRest = true } = {}) {
  const completedAt = new Date(completedAtMs).toISOString()
  const restBeforeSeconds = exercise.category === 'Cardio' || !deriveRest
    ? null
    : getRestBeforeSecondsForCompletedSet(exercise.sets, setIdx, completedAtMs)

  return {
    ...exercise,
    sets: exercise.sets.map((set, index) => {
      if (index !== setIdx) return set
      return exercise.category === 'Cardio'
        ? { ...set, done: true, completedAt }
        : { ...set, done: true, completedAt, restBeforeSeconds }
    }),
  }
}

export function clearExerciseSetCompletion(exercise, setIdx) {
  return {
    ...exercise,
    sets: exercise.sets.map((set, index) => {
      if (index !== setIdx) return set
      return exercise.category === 'Cardio'
        ? { ...set, done: false, completedAt: null }
        : { ...set, done: false, completedAt: null, restBeforeSeconds: null }
    }),
  }
}
