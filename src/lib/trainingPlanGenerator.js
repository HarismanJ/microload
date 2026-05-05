import { VALIDATION_LIMITS, validateLength, validateNumber } from './inputValidation'
import { matchesSearchQuery, normalizeSearchValue, scoreExerciseMatch } from './exerciseSearch'

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
  Back: ['Back', 'Pull Ups', 'Row'],
  Shoulders: ['Shoulders', 'Shoulder Press', 'Lateral Raise'],
  Arms: ['Biceps', 'Triceps', 'Curl', 'Tricep'],
  Quads: ['Quads', 'Squat', 'Leg Press'],
  Hamstrings: ['Hamstrings', 'Romanian Deadlift', 'Leg Curl'],
  Glutes: ['Glutes', 'Hip Thrust', 'Glute Bridge'],
  Calves: ['Calves', 'Calf Raise'],
  Core: ['Abs', 'Core', 'Plank'],
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

function getSplit(daysPerWeek, experience) {
  if (daysPerWeek === 2) return ['full_body_a', 'full_body_b']
  if (daysPerWeek === 3) return experience === 'beginner' ? ['full_body_a', 'full_body_b', 'full_body_c'] : ['push', 'pull', 'legs']
  if (daysPerWeek === 4) return ['upper', 'lower', 'upper', 'lower']
  if (daysPerWeek === 5) return ['push', 'pull', 'legs', 'upper', 'lower']
  if (daysPerWeek === 6) return ['push', 'pull', 'legs', 'push', 'pull', 'legs']
  return ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'cardio']
}

function getPreferredSplit(daysPerWeek, experience, preference, goal) {
  if (preference === 'full_body') {
    return ['full_body_a', 'full_body_b', 'full_body_c', 'full_body_a', 'full_body_b', 'full_body_c', 'cardio'].slice(0, daysPerWeek)
  }
  if (preference === 'upper_lower') {
    return ['upper', 'lower', 'upper', 'lower', 'upper', 'lower', 'cardio'].slice(0, daysPerWeek)
  }
  if (preference === 'push_pull_legs') {
    return ['push', 'pull', 'legs', 'push', 'pull', 'legs', goal === 'cardio' ? 'cardio' : 'upper'].slice(0, daysPerWeek)
  }
  if (preference === 'strength_accessories') {
    return daysPerWeek <= 3
      ? ['full_body_a', 'full_body_b', 'full_body_c'].slice(0, daysPerWeek)
      : ['upper', 'lower', 'push', 'pull', 'legs', 'upper', 'cardio'].slice(0, daysPerWeek)
  }
  if (preference === 'hybrid') {
    return ['upper', 'lower', 'cardio', 'full_body_a', 'full_body_b', 'cardio', 'legs'].slice(0, daysPerWeek)
  }
  return getSplit(daysPerWeek, experience)
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
  if (focus === 'cardio') return goal === 'cardio' ? 3 : 2
  const base = sessionMinutes < 40 ? 4 : sessionMinutes < 70 ? 5 : 6
  const experienceBonus = experience === 'advanced' ? 1 : experience === 'beginner' ? -1 : 0
  const goalBonus = goal === 'hypertrophy' ? 1 : goal === 'strength' ? -1 : 0
  return clamp(base + experienceBonus + goalBonus, 3, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay)
}

function getExerciseRole(index, focus) {
  if (focus === 'cardio') return 'cardio'
  if (index === 0) return 'main'
  if (index === 1) return 'secondary'
  return 'accessory'
}

function getProgressionForExercise(form, role) {
  const style = form.periodizationStyle || 'double_progression'
  if (role === 'cardio') {
    return {
      style,
      target: form.blockGoal === 'conditioning' ? 'Add 2-5 minutes when the effort feels repeatable.' : 'Keep the effort steady unless recovery is strong.',
    }
  }
  if (style === 'linear') return { style, target: 'Increase load when all prescribed sets are completed cleanly.' }
  if (style === 'undulating') return { style, target: role === 'main' ? 'Alternate heavier and moderate rep targets across the week.' : 'Use accessories to build volume without chasing max load.' }
  if (style === 'maintenance') return { style, target: 'Hold load and reps steady unless the work becomes clearly easy.' }
  if (style === 'deload_aware') return { style, target: 'Progress when targets are repeatable and reduce volume when fatigue patterns appear.' }
  return { style, target: 'Reach the top of the rep range across sets, then increase load next time.' }
}

function getExerciseRationale(exercise, role, form, focus) {
  if (role === 'main') return `${exercise.name} anchors this ${FOCUS_LABELS[focus] || focus} day because it gives the session a clear primary stimulus.`
  if (role === 'secondary') return `${exercise.name} supports the main movement while keeping weekly volume balanced.`
  if (role === 'cardio') return form.goal === 'cardio' || form.blockGoal === 'conditioning'
    ? `${exercise.name} drives the conditioning focus for this block.`
    : `${exercise.name} adds conditioning without crowding out strength work.`
  return `${exercise.name} fills accessory volume for the selected goal and focus areas.`
}

function getPlanExercise(exercise, form, index, focus) {
  const rules = GOAL_SET_RULES[form.goal] || GOAL_SET_RULES.hypertrophy
  const role = getExerciseRole(index, focus)
  if (isCardioExercise(exercise)) {
    const longCardio = form.goal === 'cardio' || focus === 'cardio'
    const durationSeconds = (longCardio ? 20 : 10) * 60
    return {
      name: exercise.name,
      category: 'Cardio',
      equipment: exercise.equipment || 'Bodyweight',
      role: 'cardio',
      sets: 1,
      durationSeconds,
      progression: getProgressionForExercise(form, 'cardio'),
      rationale: getExerciseRationale(exercise, 'cardio', form, focus),
      notes: longCardio ? 'Steady effort you can sustain.' : 'Easy conditioning finisher.',
    }
  }

  const isMainLift = index < 2 && focus !== 'cardio'
  const sets = isMainLift ? rules.sets : Math.max(2, rules.sets - 1)
  const reps = isMainLift ? rules.reps : Math.max(rules.reps, form.goal === 'strength' ? 8 : rules.reps)
  const repRange = isMainLift ? rules.repRange : (form.goal === 'strength' ? '6-10' : rules.repRange)

  return {
    name: exercise.name,
    category: exercise.category,
    equipment: exercise.equipment,
    role,
    sets,
    reps,
    repRange,
    restSeconds: isMainLift ? rules.restSeconds : Math.min(rules.restSeconds, 90),
    progression: getProgressionForExercise(form, role),
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

function buildDay(focus, dayIndex, form, library, weekUsedNames, scheduledDays = []) {
  const usedNames = new Set()
  const names = FOCUS_SLOT_NAMES[focus] || FOCUS_SLOT_NAMES.full_body_a
  const dayTarget = getExerciseTargetCount(form.goal, form.experience, form.sessionMinutes, focus)
  const selected = []

  const dayLibrary = focus === 'cardio'
    ? library.filter(isCardioExercise)
    : library.filter(ex => !isCardioExercise(ex))
  const fallback = focus.replaceAll('_', ' ')

  for (const candidate of names) {
    if (selected.length >= dayTarget) break
    const exercise = pickExercise(dayLibrary, [candidate], usedNames, fallback)
    if (!exercise) continue
    selected.push(exercise)
    usedNames.add(exercise.name)
    weekUsedNames.add(exercise.name)
  }

  for (const area of form.focusAreas || []) {
    if (selected.length >= dayTarget || focus === 'cardio') break
    const exercise = pickExercise(dayLibrary, FOCUS_AREA_QUERIES[area] || [area], usedNames, area)
    if (!exercise) continue
    selected.push(exercise)
    usedNames.add(exercise.name)
    weekUsedNames.add(exercise.name)
  }

  if ((form.goal === 'hybrid' || form.goal === 'cardio') && focus !== 'cardio') {
    const cardio = pickExercise(library.filter(isCardioExercise), FOCUS_SLOT_NAMES.cardio, usedNames, 'cardio')
    if (cardio) selected.push(cardio)
  }

  if (!selected.length) {
    const fallbackExercise = library.find(ex => !usedNames.has(ex.name))
    if (fallbackExercise) selected.push(fallbackExercise)
  }

  const exercises = trimToSessionLength(
    selected.map((exercise, index) => getPlanExercise(exercise, form, index, focus)),
    form.sessionMinutes
  ).slice(0, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay)

  return {
    id: `day-${dayIndex + 1}`,
    week: 1,
    scheduledDay: scheduledDays[dayIndex] || null,
    name: `Day ${dayIndex + 1}: ${FOCUS_LABELS[focus] || 'Training'}`,
    focus: FOCUS_LABELS[focus] || focus,
    estimatedMinutes: estimatePlanDayMinutes(exercises),
    exercises,
  }
}

function getDefaultName(form) {
  const goal = TRAINING_PLAN_GOALS.find(item => item.id === form.goal)?.label || 'Training'
  return `${goal} Plan`
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
  const weekUsedNames = new Set()
  const days = split.map((focus, index) => buildDay(focus, index, form, library, weekUsedNames, scheduledDays))
  const deloadInterval = getDeloadInterval(form.deloadPolicy)

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
        splitLabel: TRAINING_PLAN_SPLITS.find(item => item.id === form.splitPreference)?.label || 'Auto',
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
      rationale: {
        split: SPLIT_DESCRIPTIONS[form.splitPreference] || SPLIT_DESCRIPTIONS.auto,
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
  return {
    ...plan,
    name: String(plan.name || 'Custom Plan').slice(0, VALIDATION_LIMITS.trainingPlanNameMaxLength),
    goal: hasGoal(plan.goal) ? plan.goal : 'general_fitness',
    experience: hasExperience(plan.experience) ? plan.experience : 'beginner',
    days_per_week: clamp(readPlanNumber(plan.days_per_week, days.length || 2), VALIDATION_LIMITS.trainingPlanDaysMin, VALIDATION_LIMITS.trainingPlanDaysMax),
    session_minutes: clamp(readPlanNumber(plan.session_minutes, 60), VALIDATION_LIMITS.trainingPlanSessionMinutesMin, VALIDATION_LIMITS.trainingPlanSessionMinutesMax),
    duration_weeks: clamp(readPlanNumber(plan.duration_weeks, 8), VALIDATION_LIMITS.trainingPlanDurationWeeksMin, VALIDATION_LIMITS.trainingPlanDurationWeeksMax),
    equipment: normalizeEquipment(plan.equipment),
    preferences: {
      ...preferences,
      schedule: {
        mode: schedule.mode === 'exact' ? 'exact' : 'flexible',
        trainingDays: normalizeTrainingDays(schedule.trainingDays, readPlanNumber(plan.days_per_week, days.length || 2)),
        daysPerWeek: readPlanNumber(schedule.daysPerWeek, readPlanNumber(plan.days_per_week, days.length || 2)),
        splitPreference: hasOption(TRAINING_PLAN_SPLITS, schedule.splitPreference) ? schedule.splitPreference : 'auto',
        splitLabel: schedule.splitLabel || 'Auto',
      },
      periodization: {
        style: hasOption(TRAINING_PLAN_PERIODIZATION, periodization.style) ? periodization.style : 'double_progression',
        styleLabel: periodization.styleLabel || 'Double Progression',
        deloadPolicy: hasOption(TRAINING_PLAN_DELOAD_POLICIES, periodization.deloadPolicy) ? periodization.deloadPolicy : 'adaptive',
        deloadLabel: periodization.deloadLabel || 'Adaptive',
        deloadInterval: getDeloadInterval(periodization.deloadPolicy),
        blockGoal: hasOption(TRAINING_PLAN_BLOCK_GOALS, periodization.blockGoal) ? periodization.blockGoal : 'accumulation',
        blockGoalLabel: periodization.blockGoalLabel || 'Accumulation',
      },
      adaptiveCoach: {
        enabled: adaptiveCoach.enabled === true,
        style: adaptiveCoach.style || 'guided',
        lastReviewedAt: adaptiveCoach.lastReviewedAt || null,
      },
    },
    days: days.slice(0, 7).map((day, index) => ({
      id: String(day?.id || `day-${index + 1}`),
      week: clamp(readPlanNumber(day?.week, 1), 1, 52),
      scheduledDay: normalizeTrainingDays([day?.scheduledDay], 1)[0] || null,
      name: String(day?.name || `Day ${index + 1}`).slice(0, 80),
      focus: String(day?.focus || 'Training').slice(0, 60),
      estimatedMinutes: clamp(readPlanNumber(day?.estimatedMinutes, 60), 1, 240),
      exercises: (Array.isArray(day?.exercises) ? day.exercises : [])
        .slice(0, VALIDATION_LIMITS.trainingPlanMaxExercisesPerDay)
        .map((exercise, exerciseIndex) => ({
          ...exercise,
          role: exercise.role || getExerciseRole(exerciseIndex, exercise.category === 'Cardio' ? 'cardio' : day?.focus),
          progression: exercise.progression && typeof exercise.progression === 'object'
            ? exercise.progression
            : { style: 'double_progression', target: 'Reach the top of the rep range across sets, then increase load next time.' },
          rationale: String(exercise.rationale || exercise.notes || 'Selected to support this day.').slice(0, 220),
        })),
    })),
  }
}

export function getTrainingPlanGoalLabel(goalId) {
  return TRAINING_PLAN_GOALS.find(goal => goal.id === goalId)?.label || 'Training'
}
