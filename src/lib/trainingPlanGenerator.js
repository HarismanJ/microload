import { VALIDATION_LIMITS, validateLength, validateNumber } from './inputValidation'
import { matchesSearchQuery, normalizeSearchValue, scoreExerciseMatch } from './exerciseSearch'
import { MUSCLE_WORKLOAD_GROUPS, getMuscleWorkloadGroupsForName } from './muscleGroups'
import { SECONDARY_MUSCLE_CREDIT } from './muscleStimulus'

export const TRAINING_PLAN_GOALS = [
  { id: 'strength', label: 'Strength' },
  { id: 'hypertrophy', label: 'Hypertrophy' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'general_fitness', label: 'General Fitness' },
]

export const TRAINING_PLAN_EXPERIENCE = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

export const TRAINING_PLAN_EQUIPMENT = [
  { id: 'Bodyweight', label: 'Bodyweight' },
  { id: 'Dumbbell', label: 'Dumbbells' },
  { id: 'Barbell', label: 'Barbell' },
  { id: 'Cable', label: 'Cable' },
  { id: 'Machine', label: 'Machines' },
  { id: 'Cardio Machines', label: 'Cardio Machines' },
]

export const TRAINING_PLAN_FOCUS_AREAS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
]

export const TRAINING_PLAN_WEEKDAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

export const TRAINING_PLAN_SPLITS = [
  { id: 'auto', label: 'Auto' },
  { id: 'full_body', label: 'Full Body' },
  { id: 'upper_lower', label: 'Upper / Lower' },
  { id: 'push_pull_legs', label: 'Push / Pull / Legs' },
  { id: 'strength_accessories', label: 'Strength + Accessories' },
  { id: 'hybrid', label: 'Hybrid' },
]

export const TRAINING_PLAN_PERIODIZATION = [
  { id: 'double_progression', label: 'Double Progression' },
  { id: 'linear', label: 'Linear' },
  { id: 'undulating', label: 'Undulating' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'deload_aware', label: 'Deload Aware' },
]

export const TRAINING_PLAN_DELOAD_POLICIES = [
  { id: 'adaptive', label: 'Adaptive' },
  { id: 'auto_4', label: 'Every 4 weeks' },
  { id: 'auto_6', label: 'Every 6 weeks' },
  { id: 'auto_8', label: 'Every 8 weeks' },
  { id: 'off', label: 'Off' },
]

export const TRAINING_PLAN_BLOCK_GOALS = [
  { id: 'accumulation', label: 'Accumulation' },
  { id: 'strength', label: 'Strength' },
  { id: 'hypertrophy', label: 'Hypertrophy' },
  { id: 'conditioning', label: 'Conditioning' },
  { id: 'general_fitness', label: 'General Fitness' },
]

export const DEFAULT_TRAINING_PLAN_FORM = {
  name: '',
  goal: 'hypertrophy',
  secondaryGoal: '',
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionMinutes: 60,
  durationWeeks: 8,
  equipment: ['Bodyweight', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Cardio Machines'],
  focusAreas: [],
  avoid: '',
  scheduleMode: 'flexible',
  trainingDays: [],
  splitPreference: 'auto',
  periodizationStyle: 'double_progression',
  deloadPolicy: 'adaptive',
  blockGoal: 'accumulation',
  adaptiveCoach: true,
}

const GOAL_SET_RULES = {
  strength: { sets: 4, reps: 5, repRange: '3-5', restSeconds: 180 },
  hypertrophy: { sets: 3, reps: 10, repRange: '8-12', restSeconds: 90 },
  cardio: { sets: 2, reps: 12, repRange: '10-15', restSeconds: 60 },
  hybrid: { sets: 3, reps: 8, repRange: '6-10', restSeconds: 120 },
  general_fitness: { sets: 3, reps: 10, repRange: '8-12', restSeconds: 90 },
}

const FOCUS_SLOT_NAMES = {
  push: ['Bench Press', 'Incline Bench Press', 'Military Press', 'Dumbbell Shoulder Press', 'Dumbbell Lateral Raise', 'Tricep Pushdown'],
  pull: ['Pull Ups', 'Bent Over Row', 'Lat Pulldown', 'Machine Row', 'Face Pull', 'Barbell Curl'],
  legs: ['Squat', 'Romanian Deadlift', 'Horizontal Leg Press', 'Lying Leg Curl', 'Hip Thrust', 'Machine Calf Raise'],
  upper: ['Bench Press', 'Bent Over Row', 'Military Press', 'Lat Pulldown', 'Dumbbell Lateral Raise', 'Barbell Curl', 'Tricep Pushdown'],
  lower: ['Squat', 'Romanian Deadlift', 'Horizontal Leg Press', 'Lying Leg Curl', 'Hip Thrust', 'Machine Calf Raise'],
  full_body_a: ['Squat', 'Bench Press', 'Bent Over Row', 'Romanian Deadlift', 'Dumbbell Lateral Raise'],
  full_body_b: ['Horizontal Leg Press', 'Military Press', 'Lat Pulldown', 'Hip Thrust', 'Barbell Curl'],
  full_body_c: ['Goblet Squat', 'Dumbbell Bench Press', 'Dumbbell Row', 'Dumbbell Romanian Deadlift', 'Plank'],
  cardio: ['Running', 'Cycling', 'Rowing Machine', 'Elliptical', 'Stationary Bike', 'Walking'],
}

const FOCUS_LABELS = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body_a: 'Full Body A',
  full_body_b: 'Full Body B',
  full_body_c: 'Full Body C',
  cardio: 'Cardio',
}

const SPLIT_DESCRIPTIONS = {
  auto: 'Auto-selected from your availability, goal, and experience.',
  full_body: 'Each session trains the whole body for high frequency and simple recovery.',
  upper_lower: 'Upper and lower sessions alternate so each area gets repeatable practice.',
  push_pull_legs: 'Push, pull, and legs organize volume around movement patterns.',
  strength_accessories: 'Main lifts lead each day, with accessories supporting the priority pattern.',
  hybrid: 'Strength work stays anchored while conditioning is deliberately included.',
}

const PERIODIZATION_DESCRIPTIONS = {
  double_progression: 'Add reps inside the range first, then increase load when the top end is repeatable.',
  linear: 'Start conservative and build load week to week when targets are completed.',
  undulating: 'Rotate heavier and higher-rep days to manage fatigue across the week.',
  maintenance: 'Hold volume steady and use the plan to preserve consistency.',
  deload_aware: 'Progress normally while watching for accumulated fatigue and deload triggers.',
}

const FOCUS_AREA_QUERIES = {
  Chest: ['Chest', 'Bench Press', 'Push Up'],
  Back: ['Back', 'Upper Back', 'Lats', 'Pull Ups', 'Row'],
  Shoulders: ['Shoulders', 'Front Delts', 'Lateral Delts', 'Rear Delts', 'Shoulder Press', 'Lateral Raise'],
  Arms: ['Biceps', 'Triceps', 'Curl', 'Tricep'],
  Quads: ['Quads', 'Hip Flexors', 'Squat', 'Leg Press'],
  Hamstrings: ['Hamstrings', 'Romanian Deadlift', 'Leg Curl'],
  Glutes: ['Glutes', 'Hip Thrust', 'Glute Bridge'],
  Calves: ['Calves', 'Calf Raise'],
  Core: ['Abs', 'Core', 'Plank'],
}

const PLAN_WORKLOAD_GROUPS = MUSCLE_WORKLOAD_GROUPS
const FOCUS_AREA_GROUPS = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['front-deltoids'],
  Arms: ['biceps', 'triceps', 'forearm'],
  Quads: ['quadriceps'],
  Hamstrings: ['hamstring'],
  Glutes: ['gluteal', 'abductors'],
  Calves: ['calves'],
  Core: ['abs', 'obliques'],
}
const PLAN_WORKLOAD_GROUP_KEYS = new Set(PLAN_WORKLOAD_GROUPS.map(group => group.key))
const PLAN_WORKLOAD_GROUP_KEY_BY_NORMALIZED = new Map(PLAN_WORKLOAD_GROUPS.map(group => [normalizeSearchValue(group.key), group.key]))
const LEGACY_WORKLOAD_BUCKET_GROUPS = {
  chest: ['chest'],
  back: ['upper-back'],
  shoulders: ['front-deltoids'],
  arms: ['biceps', 'triceps'],
  quads: ['quadriceps'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  core: ['abs', 'obliques'],
  abs: ['abs'],
  'abs core': ['abs', 'obliques'],
  traps: ['trapezius'],
  lats: ['upper-back'],
  forearms: ['forearm'],
  adductors: ['adductor'],
  abductors: ['abductors'],
  neck: ['neck'],
}
const NICHE_WORKLOAD_GROUPS = new Set(['adductor', 'abductors', 'neck'])
const MAJOR_WORKLOAD_GROUPS = new Set(['chest', 'upper-back', 'quadriceps', 'hamstring', 'gluteal'])

const MOVEMENT_PATTERNS = [
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
  'knee_flexion',
  'hip_extension',
  'elbow_flexion',
  'elbow_extension',
  'calf',
  'core',
  'cardio',
  'other',
]

const COMPOUND_PATTERNS = new Set([
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
  'hip_extension',
])

const FOCUS_PATTERNS = {
  push: ['horizontal_push', 'vertical_push', 'elbow_extension', 'horizontal_push', 'vertical_push', 'elbow_extension'],
  pull: ['vertical_pull', 'horizontal_pull', 'horizontal_pull', 'elbow_flexion', 'vertical_pull', 'elbow_flexion'],
  legs: ['squat', 'hinge', 'lunge', 'knee_flexion', 'hip_extension', 'calf'],
  upper: ['horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull', 'elbow_flexion', 'elbow_extension'],
  lower: ['squat', 'hinge', 'lunge', 'knee_flexion', 'hip_extension', 'calf'],
  full_body_a: ['squat', 'horizontal_push', 'horizontal_pull', 'hinge', 'core'],
  full_body_b: ['squat', 'vertical_push', 'vertical_pull', 'hip_extension', 'elbow_flexion'],
  full_body_c: ['lunge', 'horizontal_push', 'horizontal_pull', 'hinge', 'core'],
  cardio: ['cardio', 'cardio', 'cardio'],
}

const SPLIT_CANDIDATES = {
  full_body: ['full_body_a', 'full_body_b', 'full_body_c', 'full_body_a', 'full_body_b', 'full_body_c', 'cardio'],
  upper_lower: ['upper', 'lower', 'upper', 'lower', 'upper', 'lower', 'cardio'],
  push_pull_legs: ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'upper'],
  strength_accessories: ['upper', 'lower', 'push', 'pull', 'legs', 'upper', 'full_body_a'],
  hybrid: ['upper', 'lower', 'cardio', 'full_body_a', 'full_body_b', 'cardio', 'legs'],
  cardio: ['cardio', 'cardio', 'full_body_a', 'cardio', 'full_body_b', 'cardio', 'full_body_c'],
}

const VOLUME_PROFILES = {
  strength: {
    beginner: { major: 5, minor: 2 },
    intermediate: { major: 7, minor: 3 },
    advanced: { major: 9, minor: 4 },
  },
  hypertrophy: {
    beginner: { major: 7, minor: 4 },
    intermediate: { major: 10, minor: 6 },
    advanced: { major: 13, minor: 8 },
  },
  cardio: {
    beginner: { major: 3, minor: 2 },
    intermediate: { major: 4, minor: 3 },
    advanced: { major: 5, minor: 3 },
  },
  hybrid: {
    beginner: { major: 5, minor: 3 },
    intermediate: { major: 7, minor: 4 },
    advanced: { major: 9, minor: 5 },
  },
  general_fitness: {
    beginner: { major: 5, minor: 3 },
    intermediate: { major: 7, minor: 4 },
    advanced: { major: 9, minor: 5 },
  },
}

function readPlanNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeListText(value, max = 12) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, max)
}

function hasGoal(id) {
  return TRAINING_PLAN_GOALS.some(goal => goal.id === id)
}

function hasExperience(id) {
  return TRAINING_PLAN_EXPERIENCE.some(level => level.id === id)
}

function hasOption(options, id) {
  return options.some(option => option.id === id)
}

function getOptionLabel(options, id, fallback) {
  return options.find(option => option.id === id)?.label || fallback
}

function normalizeEquipment(equipment = []) {
  const allowed = new Set(TRAINING_PLAN_EQUIPMENT.map(item => item.id))
  const normalized = uniq(equipment).filter(item => allowed.has(item))
  return normalized.length ? normalized : ['Bodyweight']
}

function isCardioExercise(exercise) {
  return exercise?.category === 'Cardio'
}

function isEquipmentAllowed(exercise, equipment) {
  if (!exercise) return false
  if (exercise.equipment === 'Bodyweight') return equipment.includes('Bodyweight')
  if (isCardioExercise(exercise) && exercise.equipment === 'Machine') return equipment.includes('Cardio Machines') || equipment.includes('Machine')
  return equipment.includes(exercise.equipment)
}

function matchesAvoid(exercise, avoidTerms) {
  if (!avoidTerms.length) return false
  const haystack = normalizeSearchValue([
    exercise.name,
    exercise.category,
    exercise.equipment,
    ...(exercise.primary_muscles || []),
    ...(exercise.secondary_muscles || []),
  ].join(' '))
  return avoidTerms.some(term => haystack.includes(normalizeSearchValue(term)))
}

function getAllowedLibrary(exerciseLibrary, form) {
  const equipment = normalizeEquipment(form.equipment)
  const avoidTerms = normalizeListText(form.avoid)
  return (exerciseLibrary || [])
    .filter(exercise => exercise?.name && isEquipmentAllowed(exercise, equipment))
    .filter(exercise => !matchesAvoid(exercise, avoidTerms))
}

function pickExercise(library, candidates, usedNames, fallbackQuery) {
  for (const name of candidates) {
    const normalized = normalizeSearchValue(name)
    const exact = library.find(ex => normalizeSearchValue(ex.name) === normalized && !usedNames.has(ex.name))
    if (exact) return exact
    const matched = library
      .filter(ex => !usedNames.has(ex.name))
      .filter(ex => matchesSearchQuery(name, ex.name, ex.category, ex.equipment, (ex.primary_muscles || []).join(' '), (ex.secondary_muscles || []).join(' ')))
      .sort((a, b) => scoreExerciseMatch(name, b) - scoreExerciseMatch(name, a))[0]
    if (matched) return matched
  }
  if (!fallbackQuery) return null
  return library
    .filter(ex => !usedNames.has(ex.name))
    .filter(ex => matchesSearchQuery(fallbackQuery, ex.name, ex.category, ex.equipment, (ex.primary_muscles || []).join(' '), (ex.secondary_muscles || []).join(' ')))
    .sort((a, b) => scoreExerciseMatch(fallbackQuery, b) - scoreExerciseMatch(fallbackQuery, a))[0] || null
}

function getMuscleWorkloadGroups(muscle) {
  return getMuscleWorkloadGroupsForName(muscle)
}

function getExerciseMuscleBuckets(exercise) {
  const primary = uniq((exercise?.primary_muscles || []).flatMap(muscle => getMuscleWorkloadGroups(muscle).map(group => group.key)))
  const secondary = uniq((exercise?.secondary_muscles || []).flatMap(muscle => getMuscleWorkloadGroups(muscle).map(group => group.key)))
    .filter(groupKey => !primary.includes(groupKey))
  return { primary, secondary }
}

function getStimulusScore(exercise, sets = null) {
  const multiplier = Number.isFinite(Number(sets)) ? Math.max(1, Number(sets)) : 1
  const { primary, secondary } = getExerciseMuscleBuckets(exercise)
  const score = {}
  primary.forEach(muscle => { score[muscle] = (score[muscle] || 0) + multiplier })
  secondary.forEach(muscle => { score[muscle] = (score[muscle] || 0) + multiplier * SECONDARY_MUSCLE_CREDIT })
  return score
}

function getWorkloadGroupKeysFromScoreKey(key) {
  const raw = String(key || '')
  if (PLAN_WORKLOAD_GROUP_KEYS.has(raw)) return [raw]

  const normalized = normalizeSearchValue(raw)
  if (!normalized) return []

  const normalizedGroupKey = PLAN_WORKLOAD_GROUP_KEY_BY_NORMALIZED.get(normalized)
  if (normalizedGroupKey) return [normalizedGroupKey]

  const legacyGroups = LEGACY_WORKLOAD_BUCKET_GROUPS[normalized]
  if (legacyGroups?.length) return legacyGroups

  return getMuscleWorkloadGroups(raw).map(group => group.key)
}

function normalizeStimulusScore(exercise, sets = null) {
  const source = exercise?.stimulusScore && typeof exercise.stimulusScore === 'object'
    ? exercise.stimulusScore
    : null
  const normalized = {}
  let mappedAny = false

  Object.entries(source || {}).forEach(([key, value]) => {
    const amount = Number(value)
    if (!Number.isFinite(amount) || amount <= 0) return
    const groupKeys = getWorkloadGroupKeysFromScoreKey(key)
    groupKeys.forEach(groupKey => {
      normalized[groupKey] = (normalized[groupKey] || 0) + amount
      mappedAny = true
    })
  })

  return mappedAny ? normalized : getStimulusScore(exercise, sets)
}

function classifyMovementPattern(exercise) {
  if (isCardioExercise(exercise)) return 'cardio'
  const name = normalizeSearchValue(exercise?.name || '')
  const text = normalizeSearchValue([
    exercise?.name,
    exercise?.category,
    exercise?.equipment,
    ...(exercise?.primary_muscles || []),
    ...(exercise?.secondary_muscles || []),
  ].join(' '))

  if (/(bench|chest press|push up|push-up|dip|fly|pec)/.test(name)) return 'horizontal_push'
  if (/(overhead|military|shoulder press|arnold|pike push)/.test(name)) return 'vertical_push'
  if (/(row|face pull|rear delt)/.test(name)) return 'horizontal_pull'
  if (/(pull up|pull-up|chin up|chin-up|pulldown|lat pull)/.test(name)) return 'vertical_pull'
  if (/(squat|leg press|hack squat|leg extension)/.test(name)) return 'squat'
  if (/(deadlift|romanian|good morning|back extension|swing)/.test(name)) return 'hinge'
  if (/(lunge|split squat|step up|step-up)/.test(name)) return 'lunge'
  if (/(leg curl|hamstring curl|nordic)/.test(name)) return 'knee_flexion'
  if (/(hip thrust|glute bridge|kickback|abduction)/.test(name)) return 'hip_extension'
  if (/(curl|preacher)/.test(name)) return 'elbow_flexion'
  if (/(tricep|skullcrusher|pushdown|extension)/.test(name)) return 'elbow_extension'
  if (/calf/.test(name)) return 'calf'
  if (/(plank|crunch|sit up|sit-up|leg raise|ab wheel|core|pallof)/.test(name)) return 'core'
  if (text.includes('chest')) return 'horizontal_push'
  if (text.includes('back')) return 'horizontal_pull'
  if (text.includes('shoulder')) return 'vertical_push'
  if (text.includes('quad')) return 'squat'
  if (text.includes('hamstring')) return 'hinge'
  if (text.includes('glute')) return 'hip_extension'
  if (text.includes('calf')) return 'calf'
  if (text.includes('core') || text.includes('abs')) return 'core'
  return 'other'
}

function addCounts(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + value
  })
  return target
}

function getWeeklySetBudget(form) {
  const perDay = form.sessionMinutes < 35 ? 9 : form.sessionMinutes < 55 ? 13 : form.sessionMinutes < 80 ? 17 : 22
  const goalModifier = form.goal === 'cardio' ? 0.55 : form.goal === 'strength' ? 0.85 : 1
  return Math.max(form.daysPerWeek * 6, Math.round(form.daysPerWeek * perDay * goalModifier))
}

function isFocusGroup(form, groupKey) {
  return (form.focusAreas || []).some(area => (FOCUS_AREA_GROUPS[area] || []).includes(groupKey))
}

function getPlanGroupBaseTarget(groupKey, profile) {
  const base = MAJOR_WORKLOAD_GROUPS.has(groupKey) ? profile.major : profile.minor
  if (NICHE_WORKLOAD_GROUPS.has(groupKey)) return 1
  return base
}

function computeVolumeTargets(form) {
  const profile = VOLUME_PROFILES[form.goal]?.[form.experience] || VOLUME_PROFILES.general_fitness.intermediate
  const targets = {}
  PLAN_WORKLOAD_GROUPS.forEach(group => {
    const base = getPlanGroupBaseTarget(group.key, profile)
    const focused = isFocusGroup(form, group.key)
    targets[group.key] = form.goal === 'cardio' && !focused
      ? Math.max(1, base - 1)
      : base
  })

  form.focusAreas.forEach(area => {
    ;(FOCUS_AREA_GROUPS[area] || []).forEach(groupKey => {
      if (targets[groupKey] !== undefined) targets[groupKey] += form.experience === 'advanced' ? 4 : 3
    })
  })

  const weeklyBudget = getWeeklySetBudget(form)
  const targetTotal = Object.values(targets).reduce((sum, value) => sum + value, 0)
  if (targetTotal > weeklyBudget) {
    const scale = weeklyBudget / targetTotal
    Object.keys(targets).forEach(groupKey => {
      const focused = isFocusGroup(form, groupKey)
      const floor = focused ? 4 : NICHE_WORKLOAD_GROUPS.has(groupKey) ? 0 : 1
      targets[groupKey] = Math.max(floor, Math.round(targets[groupKey] * scale))
    })
  }

  return targets
}

function computePatternTargets(form) {
  const strengthDays = form.goal === 'cardio' ? Math.max(1, Math.floor(form.daysPerWeek / 2)) : form.daysPerWeek
  const targets = Object.fromEntries(MOVEMENT_PATTERNS.map(pattern => [pattern, 0]))
  targets.horizontal_push = Math.max(1, Math.ceil(strengthDays * 0.7))
  targets.horizontal_pull = Math.max(1, Math.ceil(strengthDays * 0.8))
  targets.vertical_pull = Math.max(1, Math.floor(strengthDays * 0.45))
  targets.vertical_push = Math.max(1, Math.floor(strengthDays * 0.45))
  targets.squat = Math.max(1, Math.ceil(strengthDays * 0.45))
  targets.hinge = Math.max(1, Math.ceil(strengthDays * 0.45))
  targets.core = form.goal === 'strength' ? 1 : Math.max(1, Math.floor(form.daysPerWeek * 0.35))
  targets.cardio = form.goal === 'cardio' ? form.daysPerWeek : form.goal === 'hybrid' ? Math.max(1, Math.floor(form.daysPerWeek / 3)) : 0
  if (form.focusAreas.includes('Arms')) {
    targets.elbow_flexion += 1
    targets.elbow_extension += 1
  }
  if (form.focusAreas.includes('Calves')) targets.calf += 1
  if (form.focusAreas.includes('Glutes')) targets.hip_extension += 1
  if (form.focusAreas.includes('Core')) targets.core += 1
  return targets
}

function getDayExerciseBudget(form, focus) {
  if (focus === 'cardio') return form.goal === 'cardio' ? Math.min(3, Math.max(2, Math.floor(form.sessionMinutes / 18))) : 2
  const base = form.sessionMinutes < 35 ? 3 : form.sessionMinutes < 55 ? 4 : form.sessionMinutes < 80 ? 5 : 6
  const goalBonus = form.goal === 'hypertrophy' ? 1 : form.goal === 'strength' ? -1 : 0
  const experienceBonus = form.experience === 'advanced' ? 1 : form.experience === 'beginner' ? -1 : 0
  return clamp(base + goalBonus + experienceBonus, 3, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay)
}

function estimateExerciseMinutes(exercise) {
  if (exercise.category === 'Cardio') return Math.ceil((exercise.durationSeconds || 0) / 60) + 3
  const sets = Number(exercise.sets) || 1
  const rest = Number(exercise.restSeconds) || 90
  return Math.ceil(sets * 1.4 + ((sets - 1) * rest) / 60 + 3)
}

function getFocusPatternPlan(focus, form) {
  const patterns = FOCUS_PATTERNS[focus] || FOCUS_PATTERNS.full_body_a
  if (form.goal === 'hybrid' && focus !== 'cardio') return [...patterns, 'cardio']
  return patterns
}

function getCoverageFromDays(days = []) {
  const muscles = {}
  const patterns = {}
  days.forEach(day => {
    ;(day.exercises || []).forEach(exercise => {
      addCounts(muscles, normalizeStimulusScore(exercise, exercise.sets))
      patterns[exercise.movementPattern || classifyMovementPattern(exercise)] = (patterns[exercise.movementPattern || classifyMovementPattern(exercise)] || 0) + 1
    })
  })
  return { muscles, patterns }
}

function scoreCandidateExercise(exercise, {
  role,
  desiredPattern,
  form,
  dayExercises,
  weekUsedNames,
  muscleCoverage,
  volumeTargets,
  patternCoverage,
  patternTargets,
  seedNames,
}) {
  const nameKey = normalizeSearchValue(exercise.name)
  const movementPattern = classifyMovementPattern(exercise)
  const stimulus = getStimulusScore(exercise)
  const dayPatterns = new Set(dayExercises.map(ex => ex.movementPattern || classifyMovementPattern(ex)))
  const dayNames = new Set(dayExercises.map(ex => normalizeSearchValue(ex.name)))
  const isCompound = COMPOUND_PATTERNS.has(movementPattern)
  let score = 0

  if (movementPattern === desiredPattern) score += 36
  if ((patternCoverage[movementPattern] || 0) < (patternTargets[movementPattern] || 0)) score += 16
  if (seedNames.some(name => normalizeSearchValue(name) === nameKey)) score += 10
  else if (seedNames.some(name => matchesSearchQuery(name, exercise.name, exercise.category, exercise.equipment))) score += 5

  Object.entries(stimulus).forEach(([muscle, value]) => {
    const deficit = Math.max(0, (volumeTargets[muscle] || 0) - (muscleCoverage[muscle] || 0))
    score += Math.min(16, deficit * 1.7) * value
    if (isFocusGroup(form, muscle)) score += 8 * value
  })

  if (role === 'main' && isCompound) score += 18
  if (role === 'main' && !isCompound && movementPattern !== 'cardio') score -= 14
  if (role === 'secondary' && isCompound) score += 8
  if (role === 'accessory' && !isCompound) score += 8
  if (role === 'accessory' && dayPatterns.has(movementPattern)) score -= 6
  if (dayNames.has(nameKey)) score -= 100
  if (weekUsedNames.has(exercise.name)) score -= 18
  if (dayPatterns.has(movementPattern) && !['elbow_flexion', 'elbow_extension', 'core', 'calf', 'cardio'].includes(movementPattern)) score -= 10

  return score
}

function pickRankedExercise(library, options) {
  return library
    .filter(ex => !options.dayExercises.some(dayEx => normalizeSearchValue(dayEx.name) === normalizeSearchValue(ex.name)))
    .map(ex => ({ exercise: ex, score: scoreCandidateExercise(ex, options) }))
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))[0]?.exercise || null
}

function getSplit(daysPerWeek, experience) {
  if (daysPerWeek === 2) return ['full_body_a', 'full_body_b']
  if (daysPerWeek === 3) return experience === 'beginner' ? ['full_body_a', 'full_body_b', 'full_body_c'] : ['push', 'pull', 'legs']
  if (daysPerWeek === 4) return ['upper', 'lower', 'upper', 'lower']
  if (daysPerWeek === 5) return ['push', 'pull', 'legs', 'upper', 'lower']
  if (daysPerWeek === 6) return ['push', 'pull', 'legs', 'push', 'pull', 'legs']
  return ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'cardio']
}

function getPreferredSplit(daysPerWeek, experience, preference, goal) {
  const auto = getSplit(daysPerWeek, experience)
  const candidates = [
    { id: 'auto', split: auto },
    ...Object.entries(SPLIT_CANDIDATES).map(([id, split]) => ({ id, split: split.slice(0, daysPerWeek) })),
  ].map(candidate => ({
    ...candidate,
    split: candidate.split.length >= daysPerWeek
      ? candidate.split.slice(0, daysPerWeek)
      : [...candidate.split, ...auto].slice(0, daysPerWeek),
  }))

  return candidates
    .map(candidate => {
      const counts = candidate.split.reduce((map, focus) => {
        map[focus] = (map[focus] || 0) + 1
        return map
      }, {})
      let score = 0
      if (candidate.id === preference) score += 35
      if (preference === 'auto' && candidate.id === 'auto') score += 15
      if (daysPerWeek <= 3 && candidate.split.every(focus => focus.startsWith('full_body'))) score += 24
      if (experience === 'beginner' && candidate.split.some(focus => focus.startsWith('full_body'))) score += 14
      if (goal === 'strength' && (candidate.id === 'strength_accessories' || candidate.id === 'upper_lower')) score += 20
      if (goal === 'hypertrophy' && (candidate.id === 'push_pull_legs' || candidate.id === 'upper_lower')) score += daysPerWeek >= 4 ? 18 : 4
      if (goal === 'hybrid' && candidate.id === 'hybrid') score += 28
      if (goal === 'cardio' && candidate.id === 'cardio') score += 28
      if (goal === 'cardio') score += (counts.cardio || 0) * 18
      if (goal !== 'cardio' && (counts.cardio || 0) > Math.max(1, Math.floor(daysPerWeek / 3))) score -= 10
      if ((counts.push || 0) > 0 && (counts.pull || 0) === 0) score -= 10
      if ((counts.upper || 0) > 0 && (counts.lower || 0) === 0) score -= 12
      if ((counts.legs || 0) === 0 && !candidate.split.some(focus => focus === 'lower' || focus.startsWith('full_body'))) score -= 18
      return { ...candidate, score }
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[0].split
}

function normalizeTrainingDays(days = [], daysPerWeek = 4) {
  const allowed = new Set(TRAINING_PLAN_WEEKDAYS.map(day => day.id))
  return uniq(days).filter(day => allowed.has(day)).slice(0, daysPerWeek)
}

function getScheduledDays(form) {
  if (form.scheduleMode === 'exact') {
    const exact = normalizeTrainingDays(form.trainingDays, form.daysPerWeek)
    if (exact.length) return exact
  }
  return []
}

function getDeloadInterval(policy) {
  if (policy === 'auto_4') return 4
  if (policy === 'auto_6') return 6
  if (policy === 'auto_8') return 8
  return null
}

function getExerciseTargetCount(goal, experience, sessionMinutes, focus) {
  return getDayExerciseBudget({ goal, experience, sessionMinutes }, focus)
}

function getExerciseRole(index, focus) {
  if (focus === 'cardio') return 'cardio'
  if (index === 0) return 'main'
  if (index === 1) return 'secondary'
  return 'accessory'
}

const PERIODIZATION_INTENSITY_TAGS = ['standard', 'heavy', 'volume', 'light', 'maintenance']
const PERIODIZATION_PROGRESSION_BIASES = ['reps_first', 'load_first', 'maintenance', 'deload_aware']

function normalizePeriodizationStyle(style) {
  return hasOption(TRAINING_PLAN_PERIODIZATION, style) ? style : 'double_progression'
}

function normalizeIntensityTag(tag) {
  return PERIODIZATION_INTENSITY_TAGS.includes(tag) ? tag : null
}

function normalizeProgressionBias(bias) {
  return PERIODIZATION_PROGRESSION_BIASES.includes(bias) ? bias : null
}

function getUndulatingIntensityTag(dayIndex = 0) {
  return ['heavy', 'volume', 'light'][Math.max(0, Number(dayIndex) || 0) % 3]
}

function getProgressionBiasForStyle(style, intensityTag) {
  if (style === 'maintenance') return 'maintenance'
  if (style === 'deload_aware') return 'deload_aware'
  if (style === 'linear' || intensityTag === 'heavy') return 'load_first'
  return 'reps_first'
}

function getExercisePeriodization(form, role, dayIndex = 0, exercise = {}) {
  const style = normalizePeriodizationStyle(exercise.periodizationStyle || exercise.progression?.style || form.periodizationStyle)
  const intensityTag = normalizeIntensityTag(exercise.intensityTag)
    || (style === 'undulating' && role !== 'cardio' ? getUndulatingIntensityTag(dayIndex) : null)
    || (style === 'maintenance' && role !== 'cardio' ? 'maintenance' : 'standard')
  return {
    style,
    intensityTag,
    progressionBias: normalizeProgressionBias(exercise.progressionBias) || getProgressionBiasForStyle(style, intensityTag),
  }
}

function parsePrescriptionRange(repRange, fallbackReps) {
  if (repRange && typeof repRange === 'object') {
    const low = Number(repRange.low ?? repRange.lower ?? repRange.min)
    const high = Number(repRange.high ?? repRange.upper ?? repRange.max)
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low) return { low, high }
  }

  const match = String(repRange || '').match(/(\d+)\s*[-–]\s*(\d+)/)
  if (match) {
    const low = Number(match[1])
    const high = Number(match[2])
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high >= low) return { low, high }
  }
  const reps = Number(repRange || fallbackReps)
  return Number.isFinite(reps) && reps > 0 ? { low: reps, high: reps } : { low: 8, high: 12 }
}

function buildRepRange(low, high) {
  const safeLow = clamp(Math.round(low), 1, 50)
  const safeHigh = clamp(Math.round(high), safeLow, 50)
  return `${safeLow}-${safeHigh}`
}

function getPrescriptionMidpoint(repRange, fallbackReps) {
  const range = parsePrescriptionRange(repRange, fallbackReps)
  return Math.round((range.low + range.high) / 2)
}

function getLinearRepTarget(form, role, baseReps) {
  if (role === 'accessory') return form.goal === 'strength' ? 10 : Number(baseReps) || 10
  if (form.goal === 'strength') return role === 'main' ? 5 : 8
  if (form.goal === 'hybrid') return role === 'main' ? 6 : 8
  return Number(baseReps) || 10
}

function getPeriodizedPrescription(base, form, role, periodization) {
  if (role === 'cardio') return base

  const next = { ...base }
  if (periodization.style === 'linear') {
    const reps = getLinearRepTarget(form, role, base.reps)
    return { ...next, reps, repRange: buildRepRange(reps, reps) }
  }

  if (periodization.style === 'maintenance') {
    return {
      ...next,
      sets: Math.max(2, next.sets - 1),
      reps: getPrescriptionMidpoint(next.repRange, next.reps),
    }
  }

  if (periodization.style !== 'undulating') return next

  const range = parsePrescriptionRange(next.repRange, next.reps)
  if (periodization.intensityTag === 'heavy') {
    const low = Math.max(1, range.low - (form.goal === 'strength' ? 0 : 2))
    const high = Math.max(low, Math.min(range.high, range.low + 1))
    return {
      ...next,
      sets: role === 'main' ? Math.min(next.sets + 1, 6) : next.sets,
      reps: Math.round((low + high) / 2),
      repRange: buildRepRange(low, high),
      restSeconds: Math.round(next.restSeconds * 1.25),
    }
  }

  if (periodization.intensityTag === 'light') {
    const low = range.high
    const high = range.high + (form.goal === 'strength' ? 4 : 3)
    return {
      ...next,
      sets: Math.max(2, next.sets - 1),
      reps: Math.round((low + high) / 2),
      repRange: buildRepRange(low, high),
      restSeconds: Math.max(45, Math.round(next.restSeconds * 0.85)),
    }
  }

  return next
}

function getProgressionForExercise(form, role, periodization = getExercisePeriodization(form, role)) {
  const style = periodization.style
  if (role === 'cardio') {
    return {
      style,
      intensityTag: periodization.intensityTag,
      progressionBias: periodization.progressionBias,
      target: form.blockGoal === 'conditioning' ? 'Add 2-5 minutes when the effort feels repeatable.' : 'Keep the effort steady unless recovery is strong.',
    }
  }
  const base = {
    style,
    intensityTag: periodization.intensityTag,
    progressionBias: periodization.progressionBias,
  }
  if (style === 'linear') return { ...base, target: 'Complete the fixed reps cleanly, then add load.' }
  if (style === 'undulating') {
    if (periodization.intensityTag === 'heavy') return { ...base, target: 'Heavy day: prioritize clean load progress at the lower rep target.' }
    if (periodization.intensityTag === 'light') return { ...base, target: 'Light day: keep load controlled and build higher-quality reps.' }
    return { ...base, target: 'Volume day: add reps inside the range before chasing load.' }
  }
  if (style === 'maintenance') return { ...base, target: 'Hold load and reps steady unless you manually choose to advance.' }
  if (style === 'deload_aware') return { ...base, target: 'Progress when targets are repeatable and reduce sooner when fatigue patterns appear.' }
  return { ...base, target: 'Reach the top of the rep range across sets, then increase load next time.' }
}

function getExerciseRationale(exercise, role, form, focus) {
  if (role === 'main') return `${exercise.name} anchors this ${FOCUS_LABELS[focus] || focus} day because it gives the session a clear primary stimulus.`
  if (role === 'secondary') return `${exercise.name} supports the main movement while keeping weekly volume balanced.`
  if (role === 'cardio') return form.goal === 'cardio' || form.blockGoal === 'conditioning'
    ? `${exercise.name} drives the conditioning focus for this block.`
    : `${exercise.name} adds conditioning without crowding out strength work.`
  return `${exercise.name} fills accessory volume for the selected goal and focus areas.`
}

function getPlanExercise(exercise, form, index, focus, context = {}) {
  const rules = GOAL_SET_RULES[form.goal] || GOAL_SET_RULES.hypertrophy
  const role = getExerciseRole(index, focus)
  const movementPattern = classifyMovementPattern(exercise)
  const periodization = getExercisePeriodization(form, isCardioExercise(exercise) ? 'cardio' : role, context.dayIndex ?? 0)
  if (isCardioExercise(exercise)) {
    const longCardio = form.goal === 'cardio' || focus === 'cardio'
    const durationSeconds = clamp((longCardio ? Math.min(30, Math.max(16, Math.floor(form.sessionMinutes / 2))) : 10) * 60, 60, VALIDATION_LIMITS.cardioDurationMaxSeconds)
    return {
      exerciseId: exercise.id || null,
      name: exercise.name,
      category: 'Cardio',
      equipment: exercise.equipment || 'Bodyweight',
      role: 'cardio',
      movementPattern,
      stimulusScore: {},
      sets: 1,
      durationSeconds,
      periodizationStyle: periodization.style,
      intensityTag: periodization.intensityTag,
      progressionBias: periodization.progressionBias,
      progression: getProgressionForExercise(form, 'cardio', periodization),
      rationale: getExerciseRationale(exercise, 'cardio', form, focus),
      notes: longCardio ? 'Steady effort you can sustain.' : 'Easy conditioning finisher.',
    }
  }

  const isMainLift = index < 2 && focus !== 'cardio'
  const basePrescription = {
    sets: isMainLift ? rules.sets : Math.max(2, rules.sets - 1),
    reps: isMainLift ? rules.reps : Math.max(rules.reps, form.goal === 'strength' ? 8 : rules.reps),
    repRange: isMainLift ? rules.repRange : (form.goal === 'strength' ? '6-10' : rules.repRange),
    restSeconds: isMainLift ? rules.restSeconds : Math.min(rules.restSeconds, 90),
  }
  const prescription = getPeriodizedPrescription(basePrescription, form, role, periodization)

  return {
    exerciseId: exercise.id || null,
    name: exercise.name,
    category: exercise.category,
    equipment: exercise.equipment,
    role,
    movementPattern,
    sets: prescription.sets,
    reps: prescription.reps,
    repRange: prescription.repRange,
    restSeconds: prescription.restSeconds,
    periodizationStyle: periodization.style,
    intensityTag: periodization.intensityTag,
    progressionBias: periodization.progressionBias,
    stimulusScore: getStimulusScore(exercise, prescription.sets),
    progression: getProgressionForExercise(form, role, periodization),
    rationale: getExerciseRationale(exercise, role, form, focus),
    notes: isMainLift ? 'Main movement for the day.' : 'Accessory work.',
  }
}

function estimatePlanDayMinutes(exercises) {
  return exercises.reduce((total, exercise) => {
    if (exercise.category === 'Cardio') return total + Math.ceil((exercise.durationSeconds || 0) / 60) + 3
    const sets = Number(exercise.sets) || 1
    const rest = Number(exercise.restSeconds) || 90
    return total + Math.ceil(sets * 1.4 + ((sets - 1) * rest) / 60 + 3)
  }, 6)
}

function trimToSessionLength(exercises, sessionMinutes) {
  const next = [...exercises]
  while (next.length > 3 && estimatePlanDayMinutes(next) > sessionMinutes) {
    let accessoryIndex = -1
    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (index > 1 && next[index].category !== 'Cardio') {
        accessoryIndex = index
        break
      }
    }
    if (accessoryIndex !== -1) next.splice(accessoryIndex, 1)
    else next.pop()
  }
  return next
}

function scorePlanDayQuality(exercises, sessionMinutes) {
  const estimatedMinutes = estimatePlanDayMinutes(exercises)
  const patterns = exercises.reduce((map, exercise) => {
    const pattern = exercise.movementPattern || classifyMovementPattern(exercise)
    map[pattern] = (map[pattern] || 0) + 1
    return map
  }, {})
  const flags = []
  if (estimatedMinutes > sessionMinutes * 1.15) flags.push('over_time')
  if (!exercises.some(ex => ex.category === 'Cardio') && exercises.length > 2 && !patterns.core) flags.push('no_core')
  const duplicatePatternCount = Object.values(patterns).filter(count => count >= 3).length
  if (duplicatePatternCount > 0) flags.push('duplicate_stimulus')
  return {
    estimatedMinutes,
    timeFit: estimatedMinutes > sessionMinutes * 1.15 ? 'over' : estimatedMinutes < sessionMinutes * 0.55 ? 'under' : 'on_track',
    patterns,
    flags,
  }
}

export function scoreWeeklyMuscleCoverage(days, targets) {
  const coverage = getCoverageFromDays(days).muscles
  const deficits = {}
  const excess = {}
  PLAN_WORKLOAD_GROUPS.forEach(group => {
    const actual = Math.round((coverage[group.key] || 0) * 10) / 10
    const target = targets[group.key] || 0
    if (target > 0 && actual < target * 0.75) deficits[group.key] = Math.round((target - actual) * 10) / 10
    if (target > 0 && actual > target * 1.65) excess[group.key] = Math.round((actual - target) * 10) / 10
  })
  const deficitPenalty = Object.values(deficits).reduce((sum, value) => sum + value, 0)
  const excessPenalty = Object.values(excess).reduce((sum, value) => sum + value * 0.6, 0)
  return {
    coverage,
    deficits,
    excess,
    score: clamp(Math.round(100 - deficitPenalty * 4 - excessPenalty * 2), 0, 100),
  }
}

function scorePatternCoverage(days, patternTargets) {
  const coverage = getCoverageFromDays(days).patterns
  const missing = {}
  Object.entries(patternTargets).forEach(([pattern, target]) => {
    if (!target) return
    const actual = coverage[pattern] || 0
    if (actual < target) missing[pattern] = target - actual
  })
  const penalty = Object.values(missing).reduce((sum, value) => sum + value, 0)
  return {
    coverage,
    missing,
    score: clamp(100 - penalty * 9, 0, 100),
  }
}

function buildQualityFlags(days, form, volumeScore, patternScore) {
  const flags = []
  form.focusAreas.forEach(area => {
    if ((FOCUS_AREA_GROUPS[area] || []).some(groupKey => volumeScore.deficits[groupKey])) {
      flags.push(`undertrained_${area.toLowerCase().replaceAll(' ', '_')}`)
    }
  })
  const patterns = patternScore.coverage
  const push = (patterns.horizontal_push || 0) + (patterns.vertical_push || 0)
  const pull = (patterns.horizontal_pull || 0) + (patterns.vertical_pull || 0)
  if (push > pull + 2) flags.push('excessive_pressing_vs_pulling')
  if (pull > push + 3) flags.push('pulling_dominates_pressing')
  const quads = volumeScore.coverage.quadriceps || 0
  const posterior = (volumeScore.coverage.hamstring || 0) + (volumeScore.coverage.gluteal || 0) * 0.6
  if (quads > posterior * 1.8 && quads >= 5) flags.push('quad_hamstring_imbalance')
  if ((volumeScore.coverage.abs || 0) < Math.max(1, (volumeScore.coverage.chest || 0) * 0.15)) flags.push('missing_core')
  const shoulderArm = (volumeScore.coverage['front-deltoids'] || 0)
    + (volumeScore.coverage.biceps || 0)
    + (volumeScore.coverage.triceps || 0)
    + (volumeScore.coverage.forearm || 0)
  const torso = (volumeScore.coverage.chest || 0) + (volumeScore.coverage['upper-back'] || 0)
  if (shoulderArm > torso * 1.15 && shoulderArm >= 12) flags.push('excessive_direct_shoulder_arm_overlap')
  days.forEach(day => {
    if (day.quality?.timeFit === 'over') flags.push(`over_time_${day.id}`)
  })
  return uniq(flags).slice(0, 8)
}

function scorePlanQuality(days, form, volumeTargets, patternTargets) {
  const volumeScore = scoreWeeklyMuscleCoverage(days, volumeTargets)
  const patternScore = scorePatternCoverage(days, patternTargets)
  const timeScores = days.map(day => {
    const estimated = Number(day.estimatedMinutes) || estimatePlanDayMinutes(day.exercises || [])
    if (estimated > form.sessionMinutes * 1.15) return 70
    if (estimated < form.sessionMinutes * 0.45) return 82
    return 100
  })
  const timeScore = Math.round(timeScores.reduce((sum, score) => sum + score, 0) / Math.max(1, timeScores.length))
  const flags = buildQualityFlags(days, form, volumeScore, patternScore)
  return {
    qualityScore: clamp(Math.round(volumeScore.score * 0.45 + patternScore.score * 0.35 + timeScore * 0.2 - flags.length * 2), 0, 100),
    qualityFlags: flags,
    muscleCoverage: volumeScore.coverage,
    patternCoverage: patternScore.coverage,
    volumeScore: volumeScore.score,
    patternScore: patternScore.score,
    timeScore,
  }
}

function findExerciseForPattern(library, pattern, dayExercises, weekUsedNames, form, volumeTargets, muscleCoverage, patternCoverage, patternTargets) {
  const pool = pattern === 'cardio' ? library.filter(isCardioExercise) : library.filter(ex => !isCardioExercise(ex))
  return pickRankedExercise(pool, {
    role: ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hinge'].includes(pattern) ? 'secondary' : 'accessory',
    desiredPattern: pattern,
    form,
    dayExercises,
    weekUsedNames,
    muscleCoverage,
    volumeTargets,
    patternCoverage,
    patternTargets,
    seedNames: FOCUS_SLOT_NAMES.cardio,
  })
}

function getPlanDayIndex(day) {
  const match = String(day?.id || '').match(/day-(\d+)/)
  return match ? Math.max(0, Number(match[1]) - 1) : 0
}

function repairPlan(days, form, library, volumeTargets, patternTargets) {
  let nextDays = days.map(day => ({ ...day, exercises: [...(day.exercises || [])] }))

  for (let pass = 0; pass < 3; pass += 1) {
    const coverage = getCoverageFromDays(nextDays)
    const quality = scorePlanQuality(nextDays, form, volumeTargets, patternTargets)
    const missingPatterns = Object.entries(scorePatternCoverage(nextDays, patternTargets).missing)
      .filter(([, count]) => count > 0)
      .map(([pattern]) => pattern)

    let changed = false
    for (const pattern of missingPatterns) {
      const candidateDay = [...nextDays]
        .sort((a, b) => estimatePlanDayMinutes(a.exercises) - estimatePlanDayMinutes(b.exercises))[0]
      if (!candidateDay || estimatePlanDayMinutes(candidateDay.exercises) > form.sessionMinutes * 0.95) continue
      const exercise = findExerciseForPattern(
        library, pattern, candidateDay.exercises, new Set(nextDays.flatMap(day => day.exercises.map(ex => ex.name))),
        form, volumeTargets, coverage.muscles, coverage.patterns, patternTargets
      )
      if (!exercise) continue
      const planned = getPlanExercise(
        exercise,
        form,
        candidateDay.exercises.length,
        candidateDay.focus === 'Cardio' ? 'cardio' : 'upper',
        { dayIndex: getPlanDayIndex(candidateDay) }
      )
      if (estimatePlanDayMinutes([...candidateDay.exercises, planned]) > form.sessionMinutes * 1.12 && candidateDay.exercises.length >= 3) continue
      candidateDay.exercises.push(planned)
      candidateDay.estimatedMinutes = estimatePlanDayMinutes(candidateDay.exercises)
      candidateDay.quality = scorePlanDayQuality(candidateDay.exercises, form.sessionMinutes)
      changed = true
    }

    nextDays = nextDays.map(day => {
      let exercises = [...day.exercises]
      while (exercises.length > 3 && estimatePlanDayMinutes(exercises) > form.sessionMinutes * 1.12) {
        const trimIndex = exercises.findLastIndex(ex => ex.role === 'accessory' && ex.category !== 'Cardio')
        exercises.splice(trimIndex === -1 ? exercises.length - 1 : trimIndex, 1)
        changed = true
      }
      return {
        ...day,
        exercises,
        estimatedMinutes: estimatePlanDayMinutes(exercises),
        quality: scorePlanDayQuality(exercises, form.sessionMinutes),
      }
    })

    if (!changed || quality.qualityScore >= 88) break
  }

  return nextDays
}

function buildDay(focus, dayIndex, form, library, planContext, scheduledDays = []) {
  const usedNames = new Set()
  const seedNames = FOCUS_SLOT_NAMES[focus] || FOCUS_SLOT_NAMES.full_body_a
  const dayTarget = getExerciseTargetCount(form.goal, form.experience, form.sessionMinutes, focus)
  const selected = []
  const selectedPlanExercises = []
  let estimatedMinutes = 6

  const dayLibrary = focus === 'cardio'
    ? library.filter(isCardioExercise)
    : library.filter(ex => !isCardioExercise(ex))
  const patternPlan = getFocusPatternPlan(focus, form)

  for (let slot = 0; slot < dayTarget; slot += 1) {
    const role = getExerciseRole(slot, focus)
    const desiredPattern = patternPlan[slot % patternPlan.length]
    const ranked = pickRankedExercise(dayLibrary, {
      role,
      desiredPattern,
      form,
      dayExercises: selectedPlanExercises,
      weekUsedNames: planContext.weekUsedNames,
      muscleCoverage: planContext.muscleCoverage,
      volumeTargets: planContext.volumeTargets,
      patternCoverage: planContext.patternCoverage,
      patternTargets: planContext.patternTargets,
      seedNames,
    })
    const exercise = ranked || pickExercise(dayLibrary, seedNames, usedNames, focus.replaceAll('_', ' '))
    if (!exercise || usedNames.has(exercise.name)) continue

    const planned = getPlanExercise(exercise, form, slot, focus, { dayIndex })
    const nextMinutes = estimatedMinutes + estimateExerciseMinutes(planned)
    if (selected.length >= 3 && nextMinutes > form.sessionMinutes * 1.08) break
    estimatedMinutes = nextMinutes
    selectedPlanExercises.push(planned)
    selected.push(exercise)
    usedNames.add(exercise.name)
    planContext.weekUsedNames.add(exercise.name)
    addCounts(planContext.muscleCoverage, planned.stimulusScore)
    planContext.patternCoverage[planned.movementPattern] = (planContext.patternCoverage[planned.movementPattern] || 0) + 1
  }

  if ((form.goal === 'hybrid' || form.goal === 'cardio') && focus !== 'cardio') {
    const cardio = pickExercise(library.filter(isCardioExercise), FOCUS_SLOT_NAMES.cardio, usedNames, 'cardio')
    if (cardio) {
      const planned = getPlanExercise(cardio, form, selectedPlanExercises.length, focus, { dayIndex })
      if (estimatedMinutes + estimateExerciseMinutes(planned) <= form.sessionMinutes * 1.12 || selectedPlanExercises.length < 3) {
        selectedPlanExercises.push(planned)
        selected.push(cardio)
        usedNames.add(cardio.name)
        planContext.weekUsedNames.add(cardio.name)
        planContext.patternCoverage.cardio = (planContext.patternCoverage.cardio || 0) + 1
      }
    }
  }

  for (const area of form.focusAreas || []) {
    if (selectedPlanExercises.length >= dayTarget || focus === 'cardio') break
    const exercise = pickExercise(dayLibrary, FOCUS_AREA_QUERIES[area] || [area], usedNames, area)
    if (!exercise) continue
    const planned = getPlanExercise(exercise, form, selectedPlanExercises.length, focus, { dayIndex })
    if (estimatedMinutes + estimateExerciseMinutes(planned) > form.sessionMinutes * 1.12 && selectedPlanExercises.length >= 3) continue
    selectedPlanExercises.push(planned)
    selected.push(exercise)
    usedNames.add(exercise.name)
    planContext.weekUsedNames.add(exercise.name)
    addCounts(planContext.muscleCoverage, planned.stimulusScore)
    planContext.patternCoverage[planned.movementPattern] = (planContext.patternCoverage[planned.movementPattern] || 0) + 1
  }

  if (!selectedPlanExercises.length) {
    const fallbackExercise = library.find(ex => !usedNames.has(ex.name))
    if (fallbackExercise) selectedPlanExercises.push(getPlanExercise(fallbackExercise, form, 0, focus, { dayIndex }))
  }

  const exercises = trimToSessionLength(selectedPlanExercises, form.sessionMinutes)
    .slice(0, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay)
  const dayQuality = scorePlanDayQuality(exercises, form.sessionMinutes)

  return {
    id: `day-${dayIndex + 1}`,
    week: 1,
    scheduledDay: scheduledDays[dayIndex] || null,
    name: `Day ${dayIndex + 1}: ${FOCUS_LABELS[focus] || 'Training'}`,
    focus: FOCUS_LABELS[focus] || focus,
    estimatedMinutes: estimatePlanDayMinutes(exercises),
    quality: dayQuality,
    exercises,
  }
}

function getDefaultName(form) {
  const goal = TRAINING_PLAN_GOALS.find(item => item.id === form.goal)?.label || 'Training'
  return `${goal} Plan`
}

function getSplitLabel(split, preference) {
  const joined = split.join('|')
  if (split.every(focus => focus.startsWith('full_body'))) return 'Full Body'
  if (/upper/.test(joined) && /lower/.test(joined)) return 'Upper / Lower'
  if (/push/.test(joined) && /pull/.test(joined) && /legs/.test(joined)) return 'Push / Pull / Legs'
  if (/cardio/.test(joined) && split.some(focus => focus !== 'cardio')) return 'Hybrid'
  if (preference !== 'auto') return TRAINING_PLAN_SPLITS.find(item => item.id === preference)?.label || 'Auto'
  return 'Auto'
}

export function normalizeTrainingPlanForm(raw = {}) {
  const base = { ...DEFAULT_TRAINING_PLAN_FORM, ...raw }
  const goal = hasGoal(base.goal) ? base.goal : DEFAULT_TRAINING_PLAN_FORM.goal
  const experience = hasExperience(base.experience) ? base.experience : DEFAULT_TRAINING_PLAN_FORM.experience
  const daysPerWeek = clamp(readPlanNumber(base.daysPerWeek, DEFAULT_TRAINING_PLAN_FORM.daysPerWeek), VALIDATION_LIMITS.trainingPlanDaysMin, VALIDATION_LIMITS.trainingPlanDaysMax)
  const scheduleMode = base.scheduleMode === 'exact' ? 'exact' : 'flexible'
  return {
    ...base,
    name: String(base.name || '').slice(0, VALIDATION_LIMITS.trainingPlanNameMaxLength),
    goal,
    secondaryGoal: hasGoal(base.secondaryGoal) ? base.secondaryGoal : '',
    experience,
    daysPerWeek,
    sessionMinutes: clamp(readPlanNumber(base.sessionMinutes, DEFAULT_TRAINING_PLAN_FORM.sessionMinutes), VALIDATION_LIMITS.trainingPlanSessionMinutesMin, VALIDATION_LIMITS.trainingPlanSessionMinutesMax),
    durationWeeks: clamp(readPlanNumber(base.durationWeeks, DEFAULT_TRAINING_PLAN_FORM.durationWeeks), VALIDATION_LIMITS.trainingPlanDurationWeeksMin, VALIDATION_LIMITS.trainingPlanDurationWeeksMax),
    equipment: normalizeEquipment(base.equipment),
    focusAreas: uniq(base.focusAreas || []).filter(area => TRAINING_PLAN_FOCUS_AREAS.includes(area)),
    avoid: String(base.avoid || '').slice(0, 180),
    scheduleMode,
    trainingDays: scheduleMode === 'exact' ? normalizeTrainingDays(base.trainingDays, daysPerWeek) : [],
    splitPreference: hasOption(TRAINING_PLAN_SPLITS, base.splitPreference) ? base.splitPreference : 'auto',
    periodizationStyle: hasOption(TRAINING_PLAN_PERIODIZATION, base.periodizationStyle) ? base.periodizationStyle : 'double_progression',
    deloadPolicy: hasOption(TRAINING_PLAN_DELOAD_POLICIES, base.deloadPolicy) ? base.deloadPolicy : 'adaptive',
    blockGoal: hasOption(TRAINING_PLAN_BLOCK_GOALS, base.blockGoal) ? base.blockGoal : 'accumulation',
    adaptiveCoach: base.adaptiveCoach !== false,
  }
}

export function validateTrainingPlanForm(form) {
  const normalized = normalizeTrainingPlanForm(form)
  return validateLength(normalized.name || getDefaultName(normalized), {
    label: 'Plan name',
    min: 1,
    max: VALIDATION_LIMITS.trainingPlanNameMaxLength,
    required: true,
  }) || validateNumber(normalized.daysPerWeek, {
    label: 'Days per week',
    min: VALIDATION_LIMITS.trainingPlanDaysMin,
    max: VALIDATION_LIMITS.trainingPlanDaysMax,
    integer: true,
    required: true,
  }) || validateNumber(normalized.sessionMinutes, {
    label: 'Session length',
    min: VALIDATION_LIMITS.trainingPlanSessionMinutesMin,
    max: VALIDATION_LIMITS.trainingPlanSessionMinutesMax,
    integer: true,
    required: true,
  }) || validateNumber(normalized.durationWeeks, {
    label: 'Plan duration',
    min: VALIDATION_LIMITS.trainingPlanDurationWeeksMin,
    max: VALIDATION_LIMITS.trainingPlanDurationWeeksMax,
    integer: true,
    required: true,
  }) || (!normalized.equipment.length ? 'Select at least one equipment option.' : '')
}

export function generateTrainingPlan(rawForm, exerciseLibrary = []) {
  const form = normalizeTrainingPlanForm(rawForm)
  const validationError = validateTrainingPlanForm(form)
  if (validationError) throw new Error(validationError)

  const library = getAllowedLibrary(exerciseLibrary, form)
  if (!library.length) throw new Error('No matching exercises found for this equipment setup.')

  const split = getPreferredSplit(form.daysPerWeek, form.experience, form.splitPreference, form.goal)
  const scheduledDays = getScheduledDays(form)
  const volumeTargets = computeVolumeTargets(form)
  const patternTargets = computePatternTargets(form)
  const planContext = {
    weekUsedNames: new Set(),
    muscleCoverage: {},
    patternCoverage: {},
    volumeTargets,
    patternTargets,
  }
  const initialDays = split.map((focus, index) => buildDay(focus, index, form, library, planContext, scheduledDays))
  const days = repairPlan(initialDays, form, library, volumeTargets, patternTargets)
  const quality = scorePlanQuality(days, form, volumeTargets, patternTargets)
  const deloadInterval = getDeloadInterval(form.deloadPolicy)
  const splitLabel = getSplitLabel(split, form.splitPreference)

  return {
    name: (form.name || getDefaultName(form)).trim(),
    goal: form.goal,
    experience: form.experience,
    days_per_week: form.daysPerWeek,
    session_minutes: form.sessionMinutes,
    duration_weeks: form.durationWeeks,
    equipment: form.equipment,
    preferences: {
      secondaryGoal: form.secondaryGoal || null,
      focusAreas: form.focusAreas,
      avoid: normalizeListText(form.avoid),
      schedule: {
        mode: form.scheduleMode,
        trainingDays: scheduledDays,
        daysPerWeek: form.daysPerWeek,
        splitPreference: form.splitPreference,
        selectedSplit: split,
        splitLabel,
      },
      periodization: {
        style: form.periodizationStyle,
        styleLabel: TRAINING_PLAN_PERIODIZATION.find(item => item.id === form.periodizationStyle)?.label || 'Double Progression',
        deloadPolicy: form.deloadPolicy,
        deloadLabel: TRAINING_PLAN_DELOAD_POLICIES.find(item => item.id === form.deloadPolicy)?.label || 'Adaptive',
        deloadInterval,
        blockGoal: form.blockGoal,
        blockGoalLabel: TRAINING_PLAN_BLOCK_GOALS.find(item => item.id === form.blockGoal)?.label || 'Accumulation',
      },
      adaptiveCoach: {
        enabled: form.adaptiveCoach !== false,
        style: 'guided',
        lastReviewedAt: null,
      },
      volumeTargets,
      patternTargets,
      qualityScore: quality.qualityScore,
      qualityFlags: quality.qualityFlags,
      quality: {
        muscleCoverage: quality.muscleCoverage,
        patternCoverage: quality.patternCoverage,
        volumeScore: quality.volumeScore,
        patternScore: quality.patternScore,
        timeScore: quality.timeScore,
      },
      rationale: {
        split: `${splitLabel}: ${SPLIT_DESCRIPTIONS[form.splitPreference] || SPLIT_DESCRIPTIONS.auto}`,
        periodization: PERIODIZATION_DESCRIPTIONS[form.periodizationStyle] || PERIODIZATION_DESCRIPTIONS.double_progression,
        schedule: scheduledDays.length
          ? `Scheduled around ${scheduledDays.map(day => TRAINING_PLAN_WEEKDAYS.find(item => item.id === day)?.label || day).join(', ')}.`
          : `${form.daysPerWeek} flexible training days per week.`,
      },
    },
    days,
  }
}

export function normalizeTrainingPlan(plan) {
  if (!plan) return null
  const days = Array.isArray(plan.days) ? plan.days : []
  const preferences = plan.preferences && typeof plan.preferences === 'object' ? plan.preferences : {}
  const schedule = preferences.schedule && typeof preferences.schedule === 'object' ? preferences.schedule : {}
  const periodization = preferences.periodization && typeof preferences.periodization === 'object' ? preferences.periodization : {}
  const adaptiveCoach = preferences.adaptiveCoach && typeof preferences.adaptiveCoach === 'object'
    ? preferences.adaptiveCoach
    : { enabled: false, style: 'guided', lastReviewedAt: null }

  const goal = hasGoal(plan.goal) ? plan.goal : 'general_fitness'
  const experience = hasExperience(plan.experience) ? plan.experience : 'beginner'
  const daysPerWeek = clamp(readPlanNumber(plan.days_per_week, days.length || 2), VALIDATION_LIMITS.trainingPlanDaysMin, VALIDATION_LIMITS.trainingPlanDaysMax)
  const sessionMinutes = clamp(readPlanNumber(plan.session_minutes, 60), VALIDATION_LIMITS.trainingPlanSessionMinutesMin, VALIDATION_LIMITS.trainingPlanSessionMinutesMax)
  const durationWeeks = clamp(readPlanNumber(plan.duration_weeks, 8), VALIDATION_LIMITS.trainingPlanDurationWeeksMin, VALIDATION_LIMITS.trainingPlanDurationWeeksMax)
  const equipment = normalizeEquipment(plan.equipment)
  const form = normalizeTrainingPlanForm({
    name: plan.name,
    goal,
    secondaryGoal: preferences.secondaryGoal || '',
    experience,
    daysPerWeek,
    sessionMinutes,
    durationWeeks,
    equipment,
    focusAreas: preferences.focusAreas || [],
    avoid: Array.isArray(preferences.avoid) ? preferences.avoid.join(', ') : preferences.avoid,
    scheduleMode: schedule.mode,
    trainingDays: schedule.trainingDays,
    splitPreference: schedule.splitPreference,
    periodizationStyle: periodization.style,
    deloadPolicy: periodization.deloadPolicy,
    blockGoal: periodization.blockGoal,
    adaptiveCoach: adaptiveCoach.enabled === true,
  })
  const planPeriodizationStyle = form.periodizationStyle
  const selectedSplit = Array.isArray(schedule.selectedSplit) ? schedule.selectedSplit.slice(0, 7).map(item => String(item).slice(0, 40)) : []
  const normalizedDays = days.slice(0, 7).map((day, index) => {
    const normalizedExercises = (Array.isArray(day?.exercises) ? day.exercises : [])
      .slice(0, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay)
      .map((exercise, exerciseIndex) => {
        const role = exercise.role || getExerciseRole(exerciseIndex, exercise.category === 'Cardio' ? 'cardio' : day?.focus)
        const movementPattern = MOVEMENT_PATTERNS.includes(exercise.movementPattern)
          ? exercise.movementPattern
          : classifyMovementPattern(exercise)
        const periodizationMeta = getExercisePeriodization(form, role, index, exercise)
        const progression = exercise.progression && typeof exercise.progression === 'object'
          ? exercise.progression
          : getProgressionForExercise(form, role, periodizationMeta)
        return {
          ...exercise,
          exerciseId: exercise.exerciseId || exercise.id || null,
          role,
          movementPattern,
          periodizationStyle: periodizationMeta.style,
          intensityTag: periodizationMeta.intensityTag,
          progressionBias: periodizationMeta.progressionBias,
          stimulusScore: normalizeStimulusScore(exercise, exercise.sets),
          progression: {
            ...progression,
            style: periodizationMeta.style,
            intensityTag: normalizeIntensityTag(progression.intensityTag) || periodizationMeta.intensityTag,
            progressionBias: normalizeProgressionBias(progression.progressionBias) || periodizationMeta.progressionBias,
          },
          rationale: String(exercise.rationale || exercise.notes || 'Selected to support this day.').slice(0, 220),
        }
      })

    return {
      id: String(day?.id || `day-${index + 1}`),
      week: clamp(readPlanNumber(day?.week, 1), 1, 52),
      scheduledDay: normalizeTrainingDays([day?.scheduledDay], 1)[0] || null,
      name: String(day?.name || `Day ${index + 1}`).slice(0, 80),
      focus: String(day?.focus || 'Training').slice(0, 60),
      estimatedMinutes: clamp(readPlanNumber(day?.estimatedMinutes, estimatePlanDayMinutes(normalizedExercises) || sessionMinutes), 1, 240),
      exercises: normalizedExercises,
      quality: scorePlanDayQuality(normalizedExercises, sessionMinutes),
    }
  })
  const volumeTargets = computeVolumeTargets(form)
  const patternTargets = computePatternTargets(form)
  const quality = scorePlanQuality(normalizedDays, form, volumeTargets, patternTargets)

  return {
    ...plan,
    name: String(plan.name || 'Custom Plan').slice(0, VALIDATION_LIMITS.trainingPlanNameMaxLength),
    goal,
    experience,
    days_per_week: daysPerWeek,
    session_minutes: sessionMinutes,
    duration_weeks: durationWeeks,
    equipment,
    preferences: {
      ...preferences,
      secondaryGoal: form.secondaryGoal || null,
      focusAreas: form.focusAreas,
      avoid: normalizeListText(form.avoid),
      schedule: {
        mode: form.scheduleMode,
        trainingDays: form.trainingDays,
        daysPerWeek: form.daysPerWeek,
        splitPreference: form.splitPreference,
        selectedSplit,
        splitLabel: schedule.splitLabel || (selectedSplit.length
          ? getSplitLabel(selectedSplit, form.splitPreference)
          : getOptionLabel(TRAINING_PLAN_SPLITS, form.splitPreference, 'Auto')),
      },
      periodization: {
        style: planPeriodizationStyle,
        styleLabel: getOptionLabel(TRAINING_PLAN_PERIODIZATION, planPeriodizationStyle, 'Double Progression'),
        deloadPolicy: form.deloadPolicy,
        deloadLabel: getOptionLabel(TRAINING_PLAN_DELOAD_POLICIES, form.deloadPolicy, 'Adaptive'),
        deloadInterval: getDeloadInterval(form.deloadPolicy),
        blockGoal: form.blockGoal,
        blockGoalLabel: getOptionLabel(TRAINING_PLAN_BLOCK_GOALS, form.blockGoal, 'Accumulation'),
      },
      adaptiveCoach: {
        enabled: adaptiveCoach.enabled === true,
        style: adaptiveCoach.style || 'guided',
        lastReviewedAt: adaptiveCoach.lastReviewedAt || null,
      },
      volumeTargets,
      patternTargets,
      qualityScore: quality.qualityScore,
      qualityFlags: quality.qualityFlags,
      quality: {
        muscleCoverage: quality.muscleCoverage,
        patternCoverage: quality.patternCoverage,
        volumeScore: quality.volumeScore,
        patternScore: quality.patternScore,
        timeScore: quality.timeScore,
      },
    },
    days: normalizedDays,
  }
}

export function getTrainingPlanGoalLabel(goalId) {
  return TRAINING_PLAN_GOALS.find(goal => goal.id === goalId)?.label || 'Training'
}
