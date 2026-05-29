import { defaultCardioSet, defaultSet, repairDropSetGroups } from './workoutSets'

const VALID_REMOTE_SET_TYPES = new Set(['normal', 'warmup', 'dropset', 'superset'])

function normalizeRemoteSetType(value) {
  const setType = String(value ?? 'normal')
  return VALID_REMOTE_SET_TYPES.has(setType) ? setType : 'normal'
}

function normalizeRemoteGroupIndex(value) {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null
}

function isRemoteDropSet(set) {
  return normalizeRemoteSetType(set?.setType ?? set?.set_type) === 'dropset'
}

function getRemoteGroupIndex(set) {
  return normalizeRemoteGroupIndex(set?.setGroupIndex ?? set?.set_group_index)
}

function buildRemoteStrengthSet(payload) {
  return {
    ...defaultSet(),
    weight: Number(payload.weight) || 0,
    reps: Number(payload.reps) || 0,
    done: true,
    setType: normalizeRemoteSetType(payload.setType ?? payload.set_type),
    setGroupIndex: normalizeRemoteGroupIndex(payload.setGroupIndex ?? payload.set_group_index),
  }
}

function removeRemoteSet(exercise, setIndex, payload) {
  if (setIndex >= exercise.sets.length) return

  const existingSet = exercise.sets[setIndex]
  const setType = normalizeRemoteSetType(payload.setType ?? payload.set_type ?? existingSet?.setType ?? existingSet?.set_type)
  const groupIndex = normalizeRemoteGroupIndex(
    payload.setGroupIndex ?? payload.set_group_index ?? existingSet?.setGroupIndex ?? existingSet?.set_group_index
  )
  const shouldRemoveGroup = exercise.category !== 'Cardio' &&
    groupIndex != null &&
    (payload.removeGroup || setType !== 'dropset')

  if (!shouldRemoveGroup) {
    exercise.sets.splice(setIndex, 1)
    return
  }

  exercise.sets = exercise.sets.filter((set, index) => {
    if (index === setIndex) return false
    return !(isRemoteDropSet(set) && getRemoteGroupIndex(set) === groupIndex)
  })
}

export function buildRemoteWorkouts(events, exerciseLibrary, participants = []) {
  const exerciseLookup = new Map((exerciseLibrary || []).map(exercise => [exercise.id, exercise]))
  const orderedEvents = [...(events || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const participantsById = new Map((participants || []).map(participant => [participant.user_id, participant]))
  const workoutsByUser = new Map()

  const ensureWorkout = (userId) => {
    if (!workoutsByUser.has(userId)) {
      const participant = participantsById.get(userId)
      workoutsByUser.set(userId, {
        userId,
        name: participant?.profile?.full_name || participant?.profile?.username || 'Friend',
        status: 'live',
        exercises: new Map(),
        order: [],
        lastEventAt: null,
      })
    }
    return workoutsByUser.get(userId)
  }

  const ensureExercise = (workout, exerciseId, exerciseName, fallbackUnit = 'kg', fallbackCategory = 'Live battle') => {
    const key = exerciseId ?? exerciseName
    if (!key) return null
    if (!workout.exercises.has(key)) {
      const meta = exerciseId ? exerciseLookup.get(exerciseId) : null
      workout.exercises.set(key, {
        key,
        id: exerciseId ?? null,
        name: exerciseName || meta?.name || 'Exercise',
        category: meta?.category || fallbackCategory,
        unit: fallbackUnit,
        sets: [],
      })
      workout.order.push(key)
    }
    return workout.exercises.get(key)
  }

  for (const event of orderedEvents) {
    const payload = event.payload || {}
    const workout = ensureWorkout(event.user_id)
    workout.lastEventAt = event.created_at

    if (event.event_type === 'workout_finished') {
      workout.status = 'finished'
      continue
    }

    if (event.event_type === 'workout_cancelled') {
      workout.status = 'left'
      continue
    }

    if (event.event_type === 'exercise_added') {
      const ids = payload.exerciseIds || []
      const names = payload.exerciseNames || []
      const categories = payload.exerciseCategories || []
      const count = Math.max(ids.length, names.length)
      for (let i = 0; i < count; i += 1) {
        ensureExercise(workout, ids[i] ?? null, names[i] ?? null, 'kg', categories[i] || 'Live battle')
      }
    }

    if (event.event_type === 'set_completed') {
      const exercise = ensureExercise(workout, payload.exerciseId ?? null, payload.exerciseName ?? null, payload.unit || 'kg', payload.category || 'Live battle')
      if (!exercise) continue
      const setIndex = Math.max(0, (Number(payload.setNumber) || 1) - 1)
      while (exercise.sets.length <= setIndex) {
        exercise.sets.push(exercise.category === 'Cardio' ? defaultCardioSet() : defaultSet())
      }
      exercise.unit = payload.unit || exercise.unit || 'kg'
      exercise.sets[setIndex] = exercise.category === 'Cardio'
        ? {
          duration: Number(payload.durationSeconds ?? payload.duration_seconds) || 0,
          done: true,
        }
        : buildRemoteStrengthSet(payload)
    }

    if (event.event_type === 'set_removed') {
      const exercise = ensureExercise(workout, payload.exerciseId ?? null, payload.exerciseName ?? null, payload.unit || 'kg', payload.category || 'Live battle')
      if (!exercise) continue
      const setIndex = Math.max(0, (Number(payload.setNumber) || 1) - 1)
      removeRemoteSet(exercise, setIndex, payload)
    }
  }

  return [...workoutsByUser.values()]
    .map(workout => ({
      ...workout,
      exercises: workout.order
        .map(key => {
          const exercise = workout.exercises.get(key)
          if (!exercise) return null
          return {
            ...exercise,
            sets: exercise.category === 'Cardio'
              ? exercise.sets
              : repairDropSetGroups(exercise.sets),
          }
        })
        .filter(Boolean),
    }))
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'live') return -1
        if (b.status === 'live') return 1
      }
      return a.name.localeCompare(b.name)
    })
}
