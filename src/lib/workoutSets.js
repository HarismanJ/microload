import { VALIDATION_LIMITS } from './inputValidation'

export const defaultSet = () => ({ reps: '', weight: '', done: false, completedAt: null, restBeforeSeconds: null, setType: 'normal', setGroupIndex: null })
export const defaultCardioSet = () => ({ duration: 0, done: false, completedAt: null })

const CARDIO_CATEGORY = 'Cardio'

function normalizeSupersetGroupId(value) {
  const text = String(value ?? '').trim()
  return text || null
}

function getSupersetLetter(index) {
  let value = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  } while (value >= 0)
  return label
}

function createSupersetGroupId(firstExercise, secondExercise, firstIndex, secondIndex) {
  const firstIsHigher = firstIndex <= secondIndex
  const firstKey = (firstIsHigher ? firstExercise?.id : secondExercise?.id) ?? (firstIsHigher ? firstExercise?.name : secondExercise?.name) ?? Math.min(firstIndex, secondIndex)
  const secondKey = (firstIsHigher ? secondExercise?.id : firstExercise?.id) ?? (firstIsHigher ? secondExercise?.name : firstExercise?.name) ?? Math.max(firstIndex, secondIndex)
  return `superset:${firstKey}:${secondKey}`
}

function isSupersetEligibleExercise(exercise) {
  return exercise && exercise.category !== CARDIO_CATEGORY
}

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
    setType: set.is_warmup ? 'warmup' : (set.setType ?? set.set_type ?? 'normal'),
    setGroupIndex: Number.isInteger(set.setGroupIndex ?? set.set_group_index)
      ? (set.setGroupIndex ?? set.set_group_index)
      : null,
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
    sets: exercise.category === 'Cardio' ? normalizedSets : repairDropSetGroups(normalizedSets),
  }
}

export function normalizeWorkoutExercises(exercises = []) {
  return repairSupersetExerciseGroups(exercises.map(normalizeWorkoutExercise))
}

function isDropSet(set) {
  return (set?.setType ?? set?.set_type) === 'dropset'
}

function getSetType(set) {
  if (set?.is_warmup || set?.setType === 'warmup' || set?.set_type === 'warmup') return 'warmup'
  return set?.setType ?? set?.set_type ?? 'normal'
}

function isStrengthWorkingSet(set) {
  const setType = getSetType(set)
  return setType !== 'dropset' && setType !== 'warmup'
}

function getSetGroupIndex(set) {
  return set?.setGroupIndex ?? set?.set_group_index ?? null
}

function clearSetGroupIndex(set) {
  const next = { ...set, setGroupIndex: null }
  if ('set_group_index' in next) next.set_group_index = null
  return next
}

function convertDropSetToNormal(set) {
  const next = { ...clearSetGroupIndex(set), setType: 'normal' }
  if ('set_type' in next) next.set_type = 'normal'
  return next
}

function convertSupersetSetToNormal(set) {
  const next = { ...set, setType: 'normal' }
  if ('set_type' in next) next.set_type = 'normal'
  return next
}

export function repairDropSetGroups(sets = []) {
  if (!Array.isArray(sets)) return []

  const parentGroupIndexes = new Set()
  const setsWithUniqueParents = sets.map(set => {
    if (isDropSet(set)) return set

    const groupIndex = getSetGroupIndex(set)
    if (groupIndex == null) return set
    if (parentGroupIndexes.has(groupIndex)) return clearSetGroupIndex(set)

    parentGroupIndexes.add(groupIndex)
    return set
  })

  return setsWithUniqueParents.map(set => {
    if (!isDropSet(set)) return set

    const groupIndex = getSetGroupIndex(set)
    return groupIndex != null && parentGroupIndexes.has(groupIndex)
      ? set
      : convertDropSetToNormal(set)
  })
}

function markExerciseAsSuperset(exercise, groupId) {
  return {
    ...exercise,
    supersetGroupId: groupId,
    sets: (exercise.sets || []).map(set => (
      isStrengthWorkingSet(set) ? { ...set, setType: 'superset' } : set
    )),
  }
}

function clearSupersetFromExercise(exercise, groupId = null) {
  const currentGroupId = normalizeSupersetGroupId(exercise?.supersetGroupId)
  if (!exercise || !currentGroupId || (groupId && currentGroupId !== groupId)) return exercise

  return {
    ...exercise,
    supersetGroupId: null,
    sets: (exercise.sets || []).map(set => (
      isStrengthWorkingSet(set) && getSetType(set) === 'superset'
        ? convertSupersetSetToNormal(set)
        : set
    )),
  }
}

export function repairSupersetExerciseGroups(exercises = []) {
  if (!Array.isArray(exercises)) return []

  const groupMembers = new Map()
  exercises.forEach((exercise, index) => {
    const groupId = normalizeSupersetGroupId(exercise?.supersetGroupId)
    if (!groupId || !isSupersetEligibleExercise(exercise)) return
    if (!groupMembers.has(groupId)) groupMembers.set(groupId, [])
    groupMembers.get(groupId).push(index)
  })

  return exercises.map(exercise => {
    const groupId = normalizeSupersetGroupId(exercise?.supersetGroupId)
    if (!groupId) return exercise
    const members = groupMembers.get(groupId) || []
    if (members.length === 2 && isSupersetEligibleExercise(exercise)) {
      return { ...exercise, supersetGroupId: groupId }
    }
    return clearSupersetFromExercise({ ...exercise, supersetGroupId: groupId }, groupId)
  })
}

export function pairExercisesAsSuperset(exercises = [], firstExerciseId, secondExerciseId) {
  if (!Array.isArray(exercises)) return []

  const firstIndex = exercises.findIndex(exercise => exercise?.id === firstExerciseId)
  const secondIndex = exercises.findIndex(exercise => exercise?.id === secondExerciseId)
  const firstExercise = exercises[firstIndex]
  const secondExercise = exercises[secondIndex]

  if (
    firstIndex === -1 ||
    secondIndex === -1 ||
    firstIndex === secondIndex ||
    !isSupersetEligibleExercise(firstExercise) ||
    !isSupersetEligibleExercise(secondExercise)
  ) {
    return exercises
  }

  const groupIdsToClear = new Set([
    normalizeSupersetGroupId(firstExercise.supersetGroupId),
    normalizeSupersetGroupId(secondExercise.supersetGroupId),
  ].filter(Boolean))

  const clearedExercises = groupIdsToClear.size
    ? exercises.map(exercise => (
        groupIdsToClear.has(normalizeSupersetGroupId(exercise?.supersetGroupId))
          ? clearSupersetFromExercise(exercise)
          : exercise
      ))
    : exercises

  const groupId = createSupersetGroupId(firstExercise, secondExercise, firstIndex, secondIndex)
  const pairedExercises = clearedExercises.map((exercise, index) => (
    index === firstIndex || index === secondIndex
      ? markExerciseAsSuperset(exercise, groupId)
      : exercise
  ))

  const higherIndex = Math.min(firstIndex, secondIndex)
  const lowerExerciseId = exercises[Math.max(firstIndex, secondIndex)]?.id
  const currentLowerIndex = pairedExercises.findIndex(exercise => exercise?.id === lowerExerciseId)
  if (currentLowerIndex === -1 || currentLowerIndex === higherIndex + 1) {
    return repairSupersetExerciseGroups(pairedExercises)
  }

  const lowerExercise = pairedExercises[currentLowerIndex]
  const withoutLower = pairedExercises.filter((_, index) => index !== currentLowerIndex)
  const insertIndex = Math.min(higherIndex + 1, withoutLower.length)
  return repairSupersetExerciseGroups([
    ...withoutLower.slice(0, insertIndex),
    lowerExercise,
    ...withoutLower.slice(insertIndex),
  ])
}

export function pairExerciseWithNextSuperset(exercises = [], exerciseId) {
  if (!Array.isArray(exercises)) return []
  const firstIndex = exercises.findIndex(exercise => exercise?.id === exerciseId)
  const secondExercise = firstIndex >= 0 ? exercises[firstIndex + 1] : null
  return pairExercisesAsSuperset(exercises, exerciseId, secondExercise?.id)
}

export function clearSupersetGroupForExercise(exercises = [], exerciseId) {
  if (!Array.isArray(exercises)) return []
  const exercise = exercises.find(item => item?.id === exerciseId)
  const groupId = normalizeSupersetGroupId(exercise?.supersetGroupId)
  if (!groupId) return exercises
  return exercises.map(item => clearSupersetFromExercise(item, groupId))
}

export function removeExerciseAndRepairSupersets(exercises = [], exerciseId) {
  if (!Array.isArray(exercises)) return []
  const removedExercise = exercises.find(exercise => exercise?.id === exerciseId)
  const removedGroupId = normalizeSupersetGroupId(removedExercise?.supersetGroupId)
  const remaining = exercises.filter(exercise => exercise?.id !== exerciseId)
  const cleared = removedGroupId
    ? remaining.map(exercise => clearSupersetFromExercise(exercise, removedGroupId))
    : remaining
  return repairSupersetExerciseGroups(cleared)
}

function countStrengthWorkingSets(exercise) {
  return (exercise?.sets || []).filter(isStrengthWorkingSet).length
}

export function buildSupersetDisplayGroups(exercises = []) {
  const groupsById = new Map()
  ;(exercises || []).forEach((exercise, index) => {
    const groupId = normalizeSupersetGroupId(exercise?.supersetGroupId)
    if (!groupId || !isSupersetEligibleExercise(exercise)) return
    if (!groupsById.has(groupId)) groupsById.set(groupId, [])
    groupsById.get(groupId).push({ exercise, index })
  })

  const groups = [...groupsById.entries()]
    .filter(([, members]) => members.length === 2)
    .map(([groupId, members]) => ({
      groupId,
      members: members.sort((a, b) => a.index - b.index),
    }))
    .sort((a, b) => a.members[0].index - b.members[0].index)

  const byExerciseId = {}
  const renderedGroups = groups.map((group, groupIndex) => {
    const letter = getSupersetLetter(groupIndex)
    const counts = group.members.map(({ exercise }) => countStrengthWorkingSets(exercise))
    const equalRounds = counts.every(count => count === counts[0])
    const roundsText = equalRounds
      ? `${counts[0]} ${counts[0] === 1 ? 'round' : 'rounds'}`
      : 'mixed sets'
    const isAdjacent = group.members[1].index === group.members[0].index + 1
    const groupMeta = {
      groupId: group.groupId,
      letter,
      groupLabel: `Superset ${letter}`,
      roundsText,
      isAdjacent,
      startIndex: group.members[0].index,
      endIndex: group.members[1].index,
    }

    group.members.forEach(({ exercise, index }, memberIndex) => {
      byExerciseId[exercise.id] = {
        ...groupMeta,
        memberLabel: `${letter}${memberIndex + 1}`,
        memberNumber: memberIndex + 1,
        isFirstMember: memberIndex === 0,
        isLastMember: memberIndex === group.members.length - 1,
        exerciseIndex: index,
      }
    })

    return groupMeta
  })

  return { groups: renderedGroups, byExerciseId }
}

export function getWorkingSetIndexAt(sets = [], flatIndex) {
  if (!Array.isArray(sets) || flatIndex < 0 || flatIndex >= sets.length || isDropSet(sets[flatIndex])) {
    return null
  }

  let workingIndex = -1
  for (let index = 0; index <= flatIndex; index += 1) {
    if (!isDropSet(sets[index])) workingIndex += 1
  }
  return workingIndex
}

export function getDropSetGroupIndexForParent(sets = [], parentSetIdx) {
  if (!Array.isArray(sets) || parentSetIdx < 0 || parentSetIdx >= sets.length) return null
  const parentSet = sets[parentSetIdx]
  if (!parentSet || isDropSet(parentSet)) return null
  if (parentSet.setGroupIndex != null) return parentSet.setGroupIndex

  return sets.reduce(
    (max, set) => (set?.setGroupIndex != null ? Math.max(max, set.setGroupIndex) : max),
    -1
  ) + 1
}

export function buildPreviousSetValuesByWorkingIndex(exerciseSessions = []) {
  const prevSets = []

  for (let sessionIndex = exerciseSessions.length - 1; sessionIndex >= 0; sessionIndex -= 1) {
    const workingSets = (exerciseSessions[sessionIndex]?.sets || []).filter(set => !isDropSet(set))
    for (let setIndex = 0; setIndex < workingSets.length; setIndex += 1) {
      if (prevSets[setIndex] !== undefined) continue
      const set = workingSets[setIndex]
      prevSets[setIndex] = {
        weight: set.weight,
        reps: set.reps,
        unit: set.unit,
        duration_seconds: set.duration_seconds,
        set_number: set.set_number,
        setType: getSetType(set) === 'warmup' ? 'warmup' : 'normal',
      }
    }
  }

  return prevSets
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
        : { ...set, done: false, completedAt: null, restBeforeSeconds: null, progressionEvent: null, estimatedFresh1rm: null }
    }),
  }
}
