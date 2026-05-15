import {
  generateTrainingPlan,
  getTrainingPlanGoalLabel,
  normalizeTrainingPlan,
  normalizeTrainingPlanForm,
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

  makeExercise('Squat', 'Strength', 'Barbell', ['Quads', 'Glutes'], ['Hamstrings']),
  makeExercise('Romanian Deadlift', 'Strength', 'Barbell', ['Hamstrings', 'Glutes'], ['Lower Back']),
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

function validThreeDayForm(overrides = {}) {
  return {
    name: 'Three Day Hypertrophy',
    goal: 'hypertrophy',
    experience: 'intermediate',
    daysPerWeek: 3,
    sessionMinutes: 60,
    durationWeeks: 8,
    equipment: ['Bodyweight', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Cardio Machines'],
    ...overrides,
  }
}

function allPlanExercises(plan) {
  return plan.days.flatMap(day => day.exercises)
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

    expect(normalizeTrainingPlanForm({ equipment: ['Cable', 'Spaceship'] }).equipment).toEqual(['Cable'])
  })

  it('validates the normalized default form', () => {
    expect(validateTrainingPlanForm(normalizeTrainingPlanForm({}))).toBe('')
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
      equipment: ['Bodyweight', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Cardio Machines'],
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
})
