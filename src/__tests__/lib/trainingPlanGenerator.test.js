import {
  generateTrainingPlan,
  getPlanExerciseReplacementWarning,
  getPrioritizedReplacementExercises,
  TRAINING_PLAN_EQUIPMENT,
  getTrainingPlanGoalLabel,
  normalizeTrainingPlan,
  normalizeTrainingPlanForm,
  replaceTrainingPlanExercise,
  validateTrainingPlanForm,
} from '../../lib/trainingPlanGenerator.js'

function makeExercise(name, category, equipment, primary_muscles = [], secondary_muscles = []) {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    category,
    equipment,
    primary_muscles,
    secondary_muscles,
  }
}

const MOCK_EXERCISES = [
  makeExercise('Bench Press', 'Strength', 'Barbell', ['Chest'], ['Triceps', 'Front Delts']),
  makeExercise('Incline Bench Press', 'Strength', 'Barbell', ['Upper Chest'], ['Triceps', 'Front Delts']),
  makeExercise('Military Press', 'Strength', 'Barbell', ['Front Delts'], ['Triceps']),
  makeExercise('Dumbbell Shoulder Press', 'Strength', 'Dumbbell', ['Front Delts'], ['Triceps']),
  makeExercise('Dumbbell Lateral Raise', 'Strength', 'Dumbbell', ['Lateral Delts']),
  makeExercise('Tricep Pushdown', 'Strength', 'Cable', ['Triceps']),

  makeExercise('Pull Ups', 'Strength', 'Bodyweight', ['Lats'], ['Biceps']),
  makeExercise('Bent Over Row', 'Strength', 'Barbell', ['Upper Back', 'Lats'], ['Biceps']),
  makeExercise('Lat Pulldown', 'Strength', 'Cable', ['Lats'], ['Biceps']),
  makeExercise('Machine Row', 'Strength', 'Machine', ['Upper Back', 'Lats'], ['Biceps']),
  makeExercise('Face Pull', 'Strength', 'Cable', ['Rear Delts', 'Upper Back']),
  makeExercise('Barbell Curl', 'Strength', 'Barbell', ['Biceps']),
  makeExercise('EZ Bar Curl', 'Strength', 'EZ Bar', ['Biceps'], ['Forearms']),

  makeExercise('Squat', 'Strength', 'Barbell', ['Quads', 'Glutes'], ['Hamstrings']),
  makeExercise('Romanian Deadlift', 'Strength', 'Barbell', ['Hamstrings', 'Glutes'], ['Lower Back']),
  makeExercise('Walking Lunge', 'Strength', 'Dumbbell', ['Quads', 'Glutes']),
  makeExercise('Horizontal Leg Press', 'Strength', 'Machine', ['Quads', 'Glutes']),
  makeExercise('Lying Leg Curl', 'Strength', 'Machine', ['Hamstrings']),
  makeExercise('Hip Thrust', 'Strength', 'Barbell', ['Glutes'], ['Hamstrings']),
  makeExercise('Machine Calf Raise', 'Strength', 'Machine', ['Calves']),

  makeExercise('Goblet Squat', 'Strength', 'Dumbbell', ['Quads', 'Glutes'], ['Core']),
  makeExercise('Dumbbell Bench Press', 'Strength', 'Dumbbell', ['Chest'], ['Triceps', 'Front Delts']),
  makeExercise('Dumbbell Row', 'Strength', 'Dumbbell', ['Upper Back', 'Lats'], ['Biceps']),
  makeExercise('Dumbbell Romanian Deadlift', 'Strength', 'Dumbbell', ['Hamstrings', 'Glutes'], ['Lower Back']),
  makeExercise('Plank', 'Strength', 'Bodyweight', ['Core', 'Abs']),

  makeExercise('Running', 'Cardio', 'Bodyweight'),
  makeExercise('Cycling', 'Cardio', 'Bodyweight'),
  makeExercise('Rowing Machine', 'Cardio', 'Machine'),
  makeExercise('Elliptical', 'Cardio', 'Machine'),
  makeExercise('Stationary Bike', 'Cardio', 'Machine'),
  makeExercise('Walking', 'Cardio', 'Bodyweight'),
]

const CONTAMINATED_EXERCISES = [
  ...MOCK_EXERCISES,
  makeExercise('Overhead Squat', 'Strength', 'Barbell', ['Quads', 'Glutes', 'Front Delts', 'Upper Back'], ['Core', 'Hamstrings']),
  makeExercise('Thruster', 'Strength', 'Barbell', ['Quads', 'Glutes', 'Front Delts', 'Triceps'], ['Core', 'Upper Chest']),
  makeExercise('Dumbbell Thruster', 'Strength', 'Dumbbell', ['Quads', 'Glutes', 'Front Delts', 'Triceps'], ['Core', 'Upper Chest']),
  makeExercise('Clean', 'Strength', 'Barbell', ['Quads', 'Glutes', 'Traps'], ['Hamstrings', 'Upper Back', 'Calves']),
  makeExercise('Clean Pull', 'Strength', 'Barbell', ['Glutes', 'Hamstrings', 'Traps'], ['Quads', 'Upper Back', 'Calves']),
  makeExercise('Rack Pull', 'Strength', 'Barbell', ['Glutes', 'Hamstrings', 'Lower Back'], ['Traps', 'Upper Back', 'Forearms']),
  makeExercise('Cable Pull Through', 'Strength', 'Cable', ['Glutes', 'Hamstrings'], ['Lower Back', 'Adductors']),
  makeExercise('Push Press', 'Strength', 'Barbell', ['Front Delts', 'Triceps', 'Quads', 'Glutes'], ['Core', 'Upper Back']),
  makeExercise('Snatch', 'Strength', 'Barbell', ['Glutes', 'Traps', 'Front Delts'], ['Quads', 'Upper Back', 'Core']),
  makeExercise('Cable Kickback', 'Strength', 'Cable', ['Triceps'], ['Rear Delts']),
  makeExercise('Dumbbell Tricep Kickback', 'Strength', 'Dumbbell', ['Triceps'], ['Rear Delts']),
  makeExercise('Lying Cable Curl', 'Strength', 'Cable', ['Hamstrings'], ['Calves']),
]

function validThreeDayForm(overrides = {}) {
  return {
    name: 'Three Day Hypertrophy',
    goal: 'hypertrophy',
    experience: 'intermediate',
    daysPerWeek: 3,
    sessionMinutes: 60,
    durationWeeks: 8,
    equipment: ['Bodyweight', 'Dumbbell', 'Barbell', 'EZ Bar', 'Cable', 'Machine', 'Cardio Machines'],
    ...overrides,
  }
}

function allPlanExercises(plan) {
  return plan.days.flatMap(day => day.exercises)
}

const LOWER_PRIMARY_MUSCLES = new Set(['Quads', 'Glutes', 'Hamstrings', 'Calves', 'Adductors', 'Abductors', 'Hip Flexors', 'Lower Back'])
const COMPOUND_MOVEMENT_PATTERNS = new Set([
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
  'hip_extension',
])

function hasLowerPrimaryMuscle(exercise) {
  return (exercise.primary_muscles || []).some(muscle => LOWER_PRIMARY_MUSCLES.has(muscle))
}

function isCompoundPlanExercise(exercise) {
  return COMPOUND_MOVEMENT_PATTERNS.has(exercise.movementPattern)
}

function expectPlanDayShape(day) {
  expect(day).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    focus: expect.any(String),
    estimatedMinutes: expect.any(Number),
    quality: expect.any(Object),
  })
  expect(day.exercises.length).toBeGreaterThan(0)

  day.exercises.forEach(exercise => {
    expect(exercise).toMatchObject({
      name: expect.any(String),
      category: expect.any(String),
      equipment: expect.any(String),
      role: expect.any(String),
      movementPattern: expect.any(String),
      sets: expect.any(Number),
      periodizationStyle: expect.any(String),
      progressionBias: expect.any(String),
      progression: expect.any(Object),
      rationale: expect.any(String),
    })
  })
}

describe('normalizeTrainingPlanForm', () => {
  it('clamps days per week and falls back invalid options to defaults', () => {
    expect(normalizeTrainingPlanForm({ daysPerWeek: 99 }).daysPerWeek).toBe(7)
    expect(normalizeTrainingPlanForm({ daysPerWeek: 1 }).daysPerWeek).toBe(2)

    expect(normalizeTrainingPlanForm({
      goal: 'powerbuilding',
      experience: 'expert',
      splitPreference: 'bro_split',
      periodizationStyle: 'chaos',
      deloadPolicy: 'never',
      blockGoal: 'everything',
    })).toMatchObject({
      goal: 'hypertrophy',
      experience: 'intermediate',
      splitPreference: 'auto',
      periodizationStyle: 'double_progression',
      deloadPolicy: 'adaptive',
      blockGoal: 'accumulation',
    })
  })

  it('normalizes exact schedule days and equipment', () => {
    expect(TRAINING_PLAN_EQUIPMENT.map(item => item.id)).toContain('EZ Bar')

    expect(normalizeTrainingPlanForm({
      daysPerWeek: 3,
      scheduleMode: 'exact',
      trainingDays: ['mon', 'noday', 'wed', 'fri', 'sun'],
      equipment: [],
    })).toMatchObject({
      scheduleMode: 'exact',
      trainingDays: ['mon', 'wed', 'fri'],
      equipment: ['Bodyweight'],
    })

    expect(normalizeTrainingPlanForm({ equipment: ['Cable', 'EZ Bar', 'Spaceship'] }).equipment).toEqual(['Cable', 'EZ Bar'])
  })

  it('defaults adaptive coach auto-apply on and preserves an explicit off value', () => {
    expect(normalizeTrainingPlanForm({}).adaptiveCoachAutoApply).toBe(true)
    expect(normalizeTrainingPlanForm({ adaptiveCoachAutoApply: false }).adaptiveCoachAutoApply).toBe(false)
  })

  it('includes EZ Bar exercises only when EZ Bar is selected', () => {
    const plan = normalizeTrainingPlan({
      name: 'EZ Test',
      goal: 'hypertrophy',
      experience: 'intermediate',
      days_per_week: 2,
      session_minutes: 60,
      duration_weeks: 8,
      equipment: ['Bodyweight', 'Barbell', 'EZ Bar'],
      days: [{
        id: 'day-1',
        name: 'Day 1',
        focus: 'Pull',
        focusKey: 'pull',
        exercises: [{
          exerciseId: 'barbell-curl',
          name: 'Barbell Curl',
          category: 'Strength',
          equipment: 'Barbell',
          role: 'accessory',
          movementPattern: 'elbow_flexion',
          sets: 3,
          reps: 10,
          repRange: '8-12',
        }],
      }],
    })
    const day = plan.days[0]
    const exercise = day.exercises[0]
    const withEzBar = getPrioritizedReplacementExercises({
      plan,
      day,
      exercise,
      exerciseLibrary: MOCK_EXERCISES,
      query: 'curl',
      limit: 10,
    }).map(item => item.exercise.name)
    const withoutEzBar = getPrioritizedReplacementExercises({
      plan: { ...plan, equipment: ['Bodyweight', 'Barbell'] },
      day,
      exercise,
      exerciseLibrary: MOCK_EXERCISES,
      query: 'curl',
      limit: 10,
    }).map(item => item.exercise.name)

    expect(withEzBar).toContain('EZ Bar Curl')
    expect(withoutEzBar).not.toContain('EZ Bar Curl')
  })

  it('validates the normalized default form', () => {
    expect(validateTrainingPlanForm(normalizeTrainingPlanForm({}))).toBe('')
  })

  it('filters out focus areas not in the allowed list', () => {
    const form = normalizeTrainingPlanForm({ focusAreas: ['Chest', 'FAKE_AREA', 'Back'] })
    expect(form.focusAreas).not.toContain('FAKE_AREA')
    expect(form.focusAreas.length).toBeGreaterThan(0)
  })
})

describe('training plan exercise replacement', () => {
  function replacementPlan() {
    return normalizeTrainingPlan({
      ...generateTrainingPlan(validThreeDayForm({
        daysPerWeek: 3,
        splitPreference: 'full_body',
      }), MOCK_EXERCISES),
      id: 'plan-1',
    })
  }

  function findExerciseSlot(plan, name = 'Bench Press') {
    const day = plan.days.find(item => item.exercises.some(ex => ex.name === name))
    const index = day.exercises.findIndex(ex => ex.name === name)
    return { day, exercise: day.exercises[index], index }
  }

  it('prioritizes same-pattern and same-muscle replacements above random matches', () => {
    const plan = replacementPlan()
    const { day, exercise } = findExerciseSlot(plan, 'Bench Press')
    const replacements = getPrioritizedReplacementExercises({
      plan,
      day,
      exercise,
      exerciseLibrary: MOCK_EXERCISES,
      limit: 8,
    })
    const names = replacements.map(item => item.exercise.name)

    expect(['Dumbbell Bench Press', 'Incline Bench Press']).toContain(names[0])
    expect(names.slice(0, 3)).toContain('Dumbbell Bench Press')
    expect(names).not.toContain('Bench Press')
  })

  it('excludes same-day duplicates from suggested replacements', () => {
    const plan = replacementPlan()
    const { day, exercise } = findExerciseSlot(plan, 'Bench Press')
    const duplicate = day.exercises.find(ex => ex.name !== exercise.name)
    const replacements = getPrioritizedReplacementExercises({
      plan,
      day,
      exercise,
      exerciseLibrary: MOCK_EXERCISES,
      limit: 20,
    })

    expect(replacements.map(item => item.exercise.name)).not.toContain(duplicate.name)
  })

  it('respects plan equipment and avoid terms for suggestions', () => {
    const plan = normalizeTrainingPlan({
      ...generateTrainingPlan(validThreeDayForm({
        equipment: ['Bodyweight', 'Barbell'],
        avoid: 'Dumbbell',
      }), MOCK_EXERCISES),
      id: 'plan-1',
    })
    const { day, exercise } = findExerciseSlot(plan, 'Bench Press')
    const replacements = getPrioritizedReplacementExercises({
      plan,
      day,
      exercise,
      exerciseLibrary: MOCK_EXERCISES,
      limit: 20,
    })

    expect(replacements.some(item => item.exercise.equipment === 'Dumbbell')).toBe(false)
  })

  it('filters replacement results with search and allows off-plan manual fallback', () => {
    const plan = replacementPlan()
    const { day, exercise } = findExerciseSlot(plan, 'Bench Press')
    const searched = getPrioritizedReplacementExercises({
      plan,
      day,
      exercise,
      exerciseLibrary: MOCK_EXERCISES,
      query: 'row',
      includeOffPlan: true,
      limit: 12,
    })

    expect(searched.map(item => item.exercise.name)).toContain('Dumbbell Row')
    expect(searched.every(item => item.exercise.name.toLowerCase().includes('row') || item.reason)).toBe(true)
  })

  it('preserves prescription and marks substitution for same-category replacement', () => {
    const plan = replacementPlan()
    const { day, exercise, index } = findExerciseSlot(plan, 'Bench Press')
    const replacement = MOCK_EXERCISES.find(ex => ex.name === 'Dumbbell Bench Press')
    const nextPlan = replaceTrainingPlanExercise(plan, day.id, index, replacement, { replacementMode: 'suggested' })
    const nextExercise = nextPlan.days.find(item => item.id === day.id).exercises.find(ex => ex.name === 'Dumbbell Bench Press')

    expect(nextExercise.sets).toBe(exercise.sets)
    expect(nextExercise.repRange).toBe(exercise.repRange)
    expect(nextExercise.progression.style).toBe(exercise.progression.style)
    expect(nextExercise.substitutedFrom).toMatchObject({ name: 'Bench Press' })
    expect(nextExercise.replacementMode).toBe('suggested')
  })

  it('converts strength/cardio replacements into valid override prescriptions and warnings', () => {
    const plan = replacementPlan()
    const { day, exercise, index } = findExerciseSlot(plan, 'Bench Press')
    const running = MOCK_EXERCISES.find(ex => ex.name === 'Running')
    const warning = getPlanExerciseReplacementWarning(exercise, running, plan, day)
    const nextPlan = replaceTrainingPlanExercise(plan, day.id, index, running, { replacementMode: 'manual' })
    const nextExercise = nextPlan.days.find(item => item.id === day.id).exercises.find(ex => ex.name === 'Running')

    expect(warning).toMatchObject({ level: 'strong' })
    expect(nextExercise.category).toBe('Cardio')
    expect(nextExercise.sets).toBe(1)
    expect(nextExercise.durationSeconds).toBeGreaterThanOrEqual(600)
    expect(nextExercise.durationSeconds).toBeLessThanOrEqual(1200)
    expect(nextExercise.replacementMode).toBe('override')
  })

  it('preserves substitution metadata through normalization', () => {
    const normalized = normalizeTrainingPlan({
      name: 'Plan',
      goal: 'hypertrophy',
      experience: 'intermediate',
      days_per_week: 2,
      session_minutes: 60,
      duration_weeks: 8,
      equipment: ['Dumbbell'],
      days: [{
        id: 'day-1',
        name: 'Day 1',
        focus: 'Upper',
        exercises: [{
          exerciseId: 'dumbbell-bench-press',
          name: 'Dumbbell Bench Press',
          category: 'Strength',
          equipment: 'Dumbbell',
          sets: 3,
          reps: 10,
          repRange: '8-12',
          substitutedFrom: { exerciseId: 'bench-press', name: 'Bench Press', category: 'Strength', equipment: 'Barbell' },
          replacementMode: 'manual',
        }],
      }],
    })

    expect(normalized.days[0].exercises[0].substitutedFrom).toMatchObject({ name: 'Bench Press' })
    expect(normalized.days[0].exercises[0].replacementMode).toBe('manual')
  })
})

describe('generateTrainingPlan failure cases', () => {
  it('throws when no matching exercises are available', () => {
    expect(() => generateTrainingPlan(validThreeDayForm(), [])).toThrow('No matching exercises found for this equipment setup.')
  })

  it('throws when equipment and avoid filters remove the full library', () => {
    expect(() => generateTrainingPlan({
      equipment: ['Cable'],
      avoid: 'cable',
    }, MOCK_EXERCISES)).toThrow('No matching exercises found for this equipment setup.')
  })
})

describe('generateTrainingPlan smoke output', () => {
  it('generates a valid three-day hypertrophy plan', () => {
    const plan = generateTrainingPlan(validThreeDayForm(), MOCK_EXERCISES)

    expect(plan).toMatchObject({
      name: 'Three Day Hypertrophy',
      goal: 'hypertrophy',
      days_per_week: 3,
      session_minutes: 60,
      duration_weeks: 8,
    })
    expect(plan.days).toHaveLength(3)
    plan.days.forEach(expectPlanDayShape)
  })

  it('threads the adaptive coach auto-apply preference into generated plans', () => {
    const defaultPlan = generateTrainingPlan(validThreeDayForm(), MOCK_EXERCISES)
    const manualReviewPlan = generateTrainingPlan(validThreeDayForm({
      adaptiveCoachAutoApply: false,
    }), MOCK_EXERCISES)

    expect(defaultPlan.preferences.adaptiveCoach).toMatchObject({
      enabled: true,
      autoApply: true,
    })
    expect(manualReviewPlan.preferences.adaptiveCoach).toMatchObject({
      enabled: true,
      autoApply: false,
    })
  })

  it('preserves exact scheduled days and deload metadata', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      scheduleMode: 'exact',
      trainingDays: ['mon', 'wed', 'fri'],
      deloadPolicy: 'auto_4',
    }), MOCK_EXERCISES)

    expect(plan.preferences.schedule.trainingDays).toEqual(['mon', 'wed', 'fri'])
    expect(plan.days.map(day => day.scheduledDay)).toEqual(['mon', 'wed', 'fri'])
    expect(plan.preferences.periodization.deloadInterval).toBe(4)
  })

  it('applies linear periodization metadata to preferences and exercises', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      periodizationStyle: 'linear',
    }), MOCK_EXERCISES)

    expect(plan.preferences.periodization.style).toBe('linear')
    allPlanExercises(plan).forEach(exercise => {
      expect(exercise.periodizationStyle).toBe('linear')
      expect(exercise.progression.style).toBe('linear')
    })
  })

  it('generates cardio prescriptions for a cardio goal', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      equipment: ['Bodyweight', 'Dumbbell', 'Barbell', 'EZ Bar', 'Cable', 'Machine', 'Cardio Machines'],
      splitPreference: 'auto',
    }), MOCK_EXERCISES)
    const cardioExercises = allPlanExercises(plan).filter(exercise => exercise.category === 'Cardio')

    expect(plan.days).toHaveLength(3)
    expect(plan.preferences.schedule.selectedSplit).toContain('cardio')
    expect(cardioExercises.length).toBeGreaterThan(0)
    cardioExercises.forEach(exercise => {
      expect(exercise).toMatchObject({
        role: 'cardio',
        durationSeconds: expect.any(Number),
      })
      expect(exercise.durationSeconds).toBeGreaterThan(0)
    })
  })

  it('honors avoid terms for generated exercise names', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      avoid: 'squat, bench',
    }), MOCK_EXERCISES)
    const names = allPlanExercises(plan).map(exercise => exercise.name.toLowerCase())

    expect(names.some(name => name.includes('squat'))).toBe(false)
    expect(names.some(name => name.includes('bench'))).toBe(false)
  })

  it('applies maintenance periodization to all exercises', () => {
    const plan = generateTrainingPlan(validThreeDayForm({ periodizationStyle: 'maintenance' }), MOCK_EXERCISES)

    expect(plan.preferences.periodization.style).toBe('maintenance')
    allPlanExercises(plan).forEach(exercise => {
      expect(exercise.periodizationStyle).toBe('maintenance')
    })
  })

  it('applies undulating periodization with rotating intensity tags', () => {
    const plan = generateTrainingPlan(validThreeDayForm({ periodizationStyle: 'undulating' }), MOCK_EXERCISES)
    const strengthExercises = allPlanExercises(plan).filter(ex => ex.category === 'Strength')

    expect(plan.preferences.periodization.style).toBe('undulating')
    expect(strengthExercises.length).toBeGreaterThan(0)
    strengthExercises.forEach(ex => {
      expect(['heavy', 'volume', 'light']).toContain(ex.intensityTag)
    })
  })

  it('generates a hybrid plan with both strength and cardio exercises', () => {
    const plan = generateTrainingPlan(validThreeDayForm({ goal: 'hybrid' }), MOCK_EXERCISES)
    const cardioExercises = allPlanExercises(plan).filter(ex => ex.category === 'Cardio')

    expect(plan.goal).toBe('hybrid')
    expect(cardioExercises.length).toBeGreaterThan(0)
    cardioExercises.forEach(ex => {
      expect(ex.durationSeconds).toBeGreaterThan(0)
    })
  })

  it('sets conservative accessory pattern baselines for hypertrophy plans with enough training days', () => {
    const plan = generateTrainingPlan(validThreeDayForm({ goal: 'hypertrophy', daysPerWeek: 3 }), MOCK_EXERCISES)

    expect(plan.preferences.patternTargets).toMatchObject({
      lunge: 1,
      knee_flexion: 1,
      elbow_flexion: 1,
      elbow_extension: 1,
      knee_extension: 0,
    })
  })

  it('does not require direct arm patterns for general fitness or short plans', () => {
    const generalFitnessPlan = generateTrainingPlan(validThreeDayForm({ goal: 'general_fitness', daysPerWeek: 3 }), MOCK_EXERCISES)
    const shortHypertrophyPlan = generateTrainingPlan(validThreeDayForm({ goal: 'hypertrophy', daysPerWeek: 2 }), MOCK_EXERCISES)

    expect(generalFitnessPlan.preferences.patternTargets).toMatchObject({
      lunge: 1,
      knee_flexion: 1,
      elbow_flexion: 0,
      elbow_extension: 0,
    })
    expect(shortHypertrophyPlan.preferences.patternTargets).toMatchObject({
      lunge: 0,
      knee_flexion: 0,
      elbow_flexion: 0,
      elbow_extension: 0,
    })
  })

  it('orders compound strength exercises before isolation strength exercises within each day', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 5,
      splitPreference: 'auto',
      focusAreas: ['Arms', 'Calves'],
    }), MOCK_EXERCISES)

    plan.days.forEach(day => {
      const strengthExercises = day.exercises.filter(exercise => exercise.category !== 'Cardio')
      const firstIsolationIndex = strengthExercises.findIndex(exercise => !isCompoundPlanExercise(exercise))
      if (firstIsolationIndex === -1) return

      expect(strengthExercises.slice(firstIsolationIndex + 1).some(isCompoundPlanExercise)).toBe(false)
    })
  })

  it('strongly prefers staple main lifts over niche variations when both are available', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 3,
      splitPreference: 'push_pull_legs',
    }), [
      ...MOCK_EXERCISES.filter(exercise => ![
        'Romanian Deadlift',
        'Dumbbell Romanian Deadlift',
      ].includes(exercise.name)),
      makeExercise('Deadlift', 'Strength', 'Barbell', ['Glutes', 'Hamstrings', 'Lower Back'], ['Quads', 'Traps', 'Forearms']),
      makeExercise('Behind The Back Deadlift', 'Strength', 'Barbell', ['Glutes', 'Hamstrings', 'Lower Back'], ['Quads', 'Traps', 'Forearms']),
      makeExercise('Jefferson Deadlift', 'Strength', 'Barbell', ['Quads', 'Glutes', 'Hamstrings'], ['Lower Back', 'Adductors', 'Forearms']),
      makeExercise('Zercher Deadlift', 'Strength', 'Barbell', ['Quads', 'Glutes', 'Hamstrings'], ['Lower Back', 'Traps', 'Forearms', 'Core']),
    ])
    const lowerDays = plan.days.filter(day => day.focusKey === 'legs' || day.focusKey === 'lower')
    const lowerNames = lowerDays.flatMap(day => day.exercises.map(exercise => exercise.name))

    expect(lowerNames).toContain('Deadlift')
    expect(lowerNames).not.toEqual(expect.arrayContaining([
      'Behind The Back Deadlift',
      'Jefferson Deadlift',
      'Zercher Deadlift',
    ]))
  })
})

describe('split day exercise compatibility regressions', () => {
  const lowerLeakNames = [
    'Overhead Squat',
    'Thruster',
    'Dumbbell Thruster',
    'Clean',
    'Clean Pull',
    'Rack Pull',
    'Cable Pull Through',
    'Push Press',
    'Snatch',
  ]

  it('keeps lower-dominant squats and thrusters off push days', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 3,
      splitPreference: 'push_pull_legs',
    }), CONTAMINATED_EXERCISES)
    const pushDays = plan.days.filter(day => day.focusKey === 'push')

    expect(pushDays.length).toBeGreaterThan(0)
    pushDays.forEach(day => {
      expect(day.exercises.map(exercise => exercise.name)).not.toEqual(expect.arrayContaining([
        'Overhead Squat',
        'Thruster',
        'Dumbbell Thruster',
      ]))
      expect(day.exercises.some(hasLowerPrimaryMuscle)).toBe(false)
    })
  })

  it('keeps lower-dominant Olympic and hinge lifts off pull and upper days', () => {
    const pullPlan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 3,
      splitPreference: 'push_pull_legs',
    }), CONTAMINATED_EXERCISES)
    const upperPlan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 4,
      splitPreference: 'upper_lower',
    }), CONTAMINATED_EXERCISES)
    const strictUpperDays = [
      ...pullPlan.days.filter(day => day.focusKey === 'pull'),
      ...upperPlan.days.filter(day => day.focusKey === 'upper'),
    ]

    expect(strictUpperDays.length).toBeGreaterThan(0)
    strictUpperDays.forEach(day => {
      expect(day.exercises.map(exercise => exercise.name)).not.toEqual(expect.arrayContaining(lowerLeakNames))
      expect(day.exercises.some(hasLowerPrimaryMuscle)).toBe(false)
    })
  })

  it('does not use triceps kickbacks to satisfy lower-day hip-extension slots', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 4,
      splitPreference: 'upper_lower',
    }), [
      ...MOCK_EXERCISES.filter(exercise => exercise.name !== 'Hip Thrust'),
      makeExercise('Cable Kickback', 'Strength', 'Cable', ['Triceps'], ['Rear Delts']),
      makeExercise('Dumbbell Tricep Kickback', 'Strength', 'Dumbbell', ['Triceps'], ['Rear Delts']),
    ])
    const lowerDays = plan.days.filter(day => day.focusKey === 'lower' || day.focusKey === 'legs')

    expect(lowerDays.length).toBeGreaterThan(0)
    lowerDays.forEach(day => {
      expect(day.exercises.map(exercise => exercise.name)).not.toEqual(expect.arrayContaining([
        'Cable Kickback',
        'Dumbbell Tricep Kickback',
      ]))
    })
  })

  it('does not let quad or glute focus areas leak lower work onto push or pull days', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 3,
      splitPreference: 'push_pull_legs',
      focusAreas: ['Quads', 'Glutes'],
    }), CONTAMINATED_EXERCISES)
    const upperSplitDays = plan.days.filter(day => day.focusKey === 'push' || day.focusKey === 'pull')

    expect(upperSplitDays.length).toBeGreaterThan(0)
    upperSplitDays.forEach(day => {
      expect(day.exercises.some(hasLowerPrimaryMuscle)).toBe(false)
    })
  })
})

describe('training plan normalization and labels', () => {
  it('normalizes a generated plan without losing core metadata', () => {
    const plan = generateTrainingPlan(validThreeDayForm(), MOCK_EXERCISES)
    const normalized = normalizeTrainingPlan(plan)

    expect(normalized).toMatchObject({
      name: plan.name,
      goal: plan.goal,
      days_per_week: plan.days_per_week,
    })
    expect(normalized.days).toHaveLength(plan.days.length)
    expect(normalized.preferences.qualityScore).toEqual(expect.any(Number))
  })

  it('resolves training plan goal labels', () => {
    expect(getTrainingPlanGoalLabel('hypertrophy')).toBe('Hypertrophy')
    expect(getTrainingPlanGoalLabel('unknown')).toBe('Training')
  })

  it('returns null for a null plan', () => {
    expect(normalizeTrainingPlan(null)).toBeNull()
  })

  it('recovers focusKey from display label for legacy plan days without focusKey (issue 27)', () => {
    const makeEx = (name, pattern) => ({
      name, category: 'Strength', equipment: 'Barbell', sets: 3,
      role: 'main', movementPattern: pattern, periodizationStyle: 'double_progression',
      progressionBias: 'reps_first', progression: {}, rationale: 'test', restSeconds: 90,
    })
    const legacyPlan = {
      name: 'Legacy Plan',
      goal: 'hypertrophy',
      days_per_week: 3,
      duration_weeks: 8,
      session_minutes: 60,
      days: [{
        name: 'Push',
        focus: 'Push',
        exercises: [
          makeEx('Bench Press', 'horizontal_push'),
          makeEx('Military Press', 'vertical_push'),
          makeEx('Tricep Pushdown', 'elbow_extension'),
        ],
      }],
    }
    const normalized = normalizeTrainingPlan(legacyPlan)

    expect(normalized.days[0].focusKey).toBe('push')
    expect(normalized.days[0].quality.flags).not.toContain('no_core')
  })
})

describe('split selection and labeling regression (issues 23, 24)', () => {
  it('honors explicit split preference over goal-driven scoring (issue 23)', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      splitPreference: 'full_body',
    }), MOCK_EXERCISES)

    expect(plan.preferences.schedule.selectedSplit.every(f => f.startsWith('full_body'))).toBe(true)
    expect(plan.preferences.schedule.splitLabel).toBe('Full Body')
  })

  it('labels a cardio-containing auto split correctly — hybrid path fires before upper/lower (issue 24)', () => {
    const importedHybrid = normalizeTrainingPlan({
      name: 'Imported Hybrid',
      goal: 'hybrid',
      days_per_week: 4,
      session_minutes: 45,
      duration_weeks: 8,
      preferences: {
        schedule: {
          mode: 'flexible',
          daysPerWeek: 4,
          splitPreference: 'auto',
          selectedSplit: ['upper', 'lower', 'cardio', 'full_body_a'],
        },
      },
      days: [],
    })
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      daysPerWeek: 3,
      splitPreference: 'auto',
    }), MOCK_EXERCISES)

    expect(importedHybrid.preferences.schedule.splitLabel).toBe('Hybrid')
    expect(plan.preferences.schedule.selectedSplit).toEqual(['cardio', 'cardio', 'full_body_a'])
    expect(plan.preferences.schedule.splitLabel).toBe('Hybrid')
  })

  it('labels imported pure-cardio auto splits as cardio (issue 24)', () => {
    const normalized = normalizeTrainingPlan({
      name: 'Pure Cardio',
      goal: 'cardio',
      days_per_week: 2,
      session_minutes: 30,
      duration_weeks: 8,
      preferences: {
        schedule: {
          mode: 'flexible',
          daysPerWeek: 2,
          splitPreference: 'auto',
          selectedSplit: ['cardio', 'cardio'],
        },
      },
      days: [],
    })

    expect(normalized.preferences.schedule.splitLabel).toBe('Cardio')
  })
})

describe('cardio time budget regression (issues 25, 26)', () => {
  it.each([
    { daysPerWeek: 3, sessionMinutes: 20 },
    { daysPerWeek: 6, sessionMinutes: 30 },
  ])('keeps $daysPerWeek-day cardio plans within 15% of the session target (issue 25)', ({ daysPerWeek, sessionMinutes }) => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      daysPerWeek,
      sessionMinutes,
      splitPreference: 'auto',
    }), MOCK_EXERCISES)

    expect(plan.preferences.schedule.selectedSplit).toContain('cardio')

    plan.days.forEach(day => {
      expect(day.estimatedMinutes).toBeLessThanOrEqual(sessionMinutes * 1.15)
    })
  })

  it('does not mark 6-day 60-minute cardio plans over time (issue 25)', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      daysPerWeek: 6,
      sessionMinutes: 60,
      splitPreference: 'auto',
    }), MOCK_EXERCISES)

    expect(plan.preferences.schedule.selectedSplit).toContain('cardio')
    plan.days.forEach(day => {
      expect(day.quality.flags).not.toContain('over_time')
    })
  })

  it('uses actual non-cardio day count from selected split for pattern targets (issue 26)', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      daysPerWeek: 6,
      splitPreference: 'auto',
    }), MOCK_EXERCISES)

    // For 6-day cardio auto, scoring selects ['cardio','cardio','full_body_a','cardio','full_body_b','cardio']
    // = 2 actual non-cardio days. Old heuristic gave strengthDays = Math.max(1, floor(6/2)) = 3.
    // Fix: uses actual count (2) → horizontal_push = ceil(2*0.7) = 2, not 3.
    const selectedSplit = plan.preferences.schedule.selectedSplit
    const actualStrengthDays = selectedSplit.filter(f => f !== 'cardio').length
    const expectedHorizontalPush = Math.max(1, Math.ceil(actualStrengthDays * 0.7))
    expect(plan.preferences.patternTargets.horizontal_push).toBe(expectedHorizontalPush)
  })

  it('preserves selected-split-aware pattern targets after normalization (issue 26)', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      daysPerWeek: 6,
      splitPreference: 'auto',
    }), MOCK_EXERCISES)
    const normalized = normalizeTrainingPlan(plan)

    expect(normalized.preferences.schedule.selectedSplit).toEqual(plan.preferences.schedule.selectedSplit)
    expect(normalized.preferences.patternTargets).toEqual(plan.preferences.patternTargets)
  })

  // ── Issue 29/30: planContext reconciliation + fallback path ──────────────

  it('exercises trimmed from a short-session day do not inflate cross-day coverage (issue 29)', () => {
    // Very short session forces trimToSessionLength to remove exercises from day 1.
    // Before the fix, removed exercises still appeared in planContext.weekUsedNames,
    // preventing later days from using those exercise names.
    const plan = generateTrainingPlan(
      validThreeDayForm({ daysPerWeek: 2, sessionMinutes: 20, goal: 'strength' }),
      MOCK_EXERCISES
    )
    // Each day must have at least one exercise
    plan.days.forEach(day => expect(day.exercises.length).toBeGreaterThan(0))
    // No exercise name should appear on more than one day
    const dayNameArrays = plan.days.map(d => d.exercises.map(ex => ex.name))
    for (let i = 0; i < dayNameArrays.length - 1; i++) {
      const overlap = dayNameArrays[i].filter(n => dayNameArrays[i + 1].includes(n))
      expect(overlap).toHaveLength(0)
    }
  })

  it('fallback exercise is included in weekUsedNames so it does not repeat on subsequent days (issues 29, 30)', () => {
    // 4-exercise sparse library: one per major focus type (push/pull/legs/cardio).
    // Sparse enough to likely trigger fallback paths, but covers all focus types
    // so no day is left empty. weekUsedNames (via reconcile from issue 29) and
    // usedNames.add in the fallback (issue 30) together ensure no repeats.
    const sparseLibrary = [
      makeExercise('Bench Press', 'Strength', 'Barbell', ['Chest'], ['Triceps']),
      makeExercise('Bent Over Row', 'Strength', 'Barbell', ['Upper Back', 'Lats'], ['Biceps']),
      makeExercise('Squat', 'Strength', 'Barbell', ['Quads', 'Glutes'], ['Hamstrings']),
      makeExercise('Running', 'Cardio', 'Bodyweight'),
    ]
    const plan = generateTrainingPlan(
      validThreeDayForm({ daysPerWeek: 3, sessionMinutes: 30 }),
      sparseLibrary
    )
    plan.days.forEach(day => expect(day.exercises.length).toBeGreaterThan(0))
    // No exercise should appear on more than one day
    const allNames = plan.days.flatMap(d => d.exercises.map(ex => ex.name))
    const counts = allNames.reduce((acc, n) => ({ ...acc, [n]: (acc[n] || 0) + 1 }), {})
    Object.values(counts).forEach(count => expect(count).toBe(1))
  })

  // ── Issue 31: repairPlan focus-aware floors + undulating context ─────────

  it('repairPlan respects cardio-focus 1-exercise floor and does not push days over time budget (issue 31)', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      goal: 'cardio',
      daysPerWeek: 3,
      sessionMinutes: 20,
      experience: 'beginner',
    }), MOCK_EXERCISES)
    plan.days.forEach(day => {
      // No day should be flagged over_time — repair trim must use focus-aware floor
      expect(day.quality?.flags ?? []).not.toContain('over_time')
      // All days should be within 15% of session budget
      expect(day.estimatedMinutes).toBeLessThanOrEqual(20 * 1.15)
    })
  })

  it('repair-added exercises on 6-day undulating plans carry per-focus intensity, not day-index (issue 31)', () => {
    const plan = generateTrainingPlan(validThreeDayForm({
      daysPerWeek: 6,
      sessionMinutes: 60,
      periodizationStyle: 'undulating',
      goal: 'strength',
      experience: 'intermediate',
    }), MOCK_EXERCISES)
    // Repeated focus days must have different dominant intensity tags
    const pushDays = plan.days.filter(d => d.focusKey === 'push')
    if (pushDays.length >= 2) {
      const tag1 = pushDays[0].exercises[0]?.intensityTag
      const tag2 = pushDays[1].exercises[0]?.intensityTag
      expect(tag1).toBeTruthy()
      expect(tag2).toBeTruthy()
      expect(tag1).not.toBe(tag2)
    }
    const pullDays = plan.days.filter(d => d.focusKey === 'pull')
    if (pullDays.length >= 2) {
      const tag1 = pullDays[0].exercises[0]?.intensityTag
      const tag2 = pullDays[1].exercises[0]?.intensityTag
      expect(tag1).toBeTruthy()
      expect(tag2).toBeTruthy()
      expect(tag1).not.toBe(tag2)
    }
  })

  // ── Issue 32: legacy undulating plan normalization ───────────────────────

  it('normalizing a legacy 6-day PPL undulating plan without intensityTag restores per-focus intensity rotation (issue 32)', () => {
    const makeUndulatingEx = (name, pattern) => ({
      name,
      movementPattern: pattern,
      sets: 4,
      repRange: '4-6',
      category: 'Strength',
      periodizationStyle: 'undulating',
      // intentionally no intensityTag — simulates a pre-fix or imported plan row
    })
    const legacyPlan = {
      name: 'Legacy 6-Day PPL',
      goal: 'strength',
      experience: 'intermediate',
      days_per_week: 6,
      session_minutes: 60,
      duration_weeks: 8,
      days: [
        { name: 'Push 1', focus: 'Push', exercises: [makeUndulatingEx('Bench Press', 'horizontal_push'), makeUndulatingEx('Overhead Press', 'vertical_push')] },
        { name: 'Pull 1', focus: 'Pull', exercises: [makeUndulatingEx('Bent Over Row', 'horizontal_pull'), makeUndulatingEx('Pull Ups', 'vertical_pull')] },
        { name: 'Legs 1', focus: 'Legs', exercises: [makeUndulatingEx('Squat', 'squat'), makeUndulatingEx('Romanian Deadlift', 'hinge')] },
        { name: 'Push 2', focus: 'Push', exercises: [makeUndulatingEx('Incline Bench Press', 'horizontal_push'), makeUndulatingEx('Dumbbell Shoulder Press', 'vertical_push')] },
        { name: 'Pull 2', focus: 'Pull', exercises: [makeUndulatingEx('Machine Row', 'horizontal_pull'), makeUndulatingEx('Lat Pulldown', 'vertical_pull')] },
        { name: 'Legs 2', focus: 'Legs', exercises: [makeUndulatingEx('Horizontal Leg Press', 'squat'), makeUndulatingEx('Lying Leg Curl', 'knee_flexion')] },
      ],
    }
    const normalized = normalizeTrainingPlan(legacyPlan)

    // focusKey must be recovered from display label
    normalized.days.forEach(day => expect(day.focusKey).toBeTruthy())

    // Repeated focus days must have DIFFERENT intensityTags (per-focus rotation)
    const pushDays = normalized.days.filter(d => d.focusKey === 'push')
    expect(pushDays).toHaveLength(2)
    const push1Tag = pushDays[0].exercises[0].intensityTag
    const push2Tag = pushDays[1].exercises[0].intensityTag
    expect(push1Tag).toBeTruthy()
    expect(push2Tag).toBeTruthy()
    expect(push1Tag).not.toBe(push2Tag)

    const pullDays = normalized.days.filter(d => d.focusKey === 'pull')
    expect(pullDays).toHaveLength(2)
    expect(pullDays[0].exercises[0].intensityTag).not.toBe(pullDays[1].exercises[0].intensityTag)

    // no_core must not fire on any split day after normalization
    normalized.days.forEach(day => {
      expect(day.quality?.flags ?? []).not.toContain('no_core')
    })
  })
})
