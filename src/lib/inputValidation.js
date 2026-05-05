import { convertWeight } from './liftMath'

export const VALIDATION_LIMITS = {
  emailMaxLength: 254,
  passwordMinLength: 8,
  passwordMaxLength: 128,
  fullNameMaxLength: 80,
  usernameMinLength: 3,
  usernameMaxLength: 24,
  ageMin: 13,
  ageMax: 120,
  bugReportMinLength: 10,
  bugReportMaxLength: 2000,
  bodyweightMinKg: 20,
  bodyweightMaxKg: 600,
  caloriesBurnedGoalMin: 1,
  caloriesBurnedGoalMax: 100000,
  restSecondsMin: 0,
  restSecondsMax: 3600,
  cardioDurationMinSeconds: 1,
  cardioDurationMaxSeconds: 24 * 60 * 60,
  exerciseNoteMaxLength: 1000,
  customExerciseNameMinLength: 2,
  customExerciseNameMaxLength: 80,
  routineNameMaxLength: 60,
  routineDescriptionMaxLength: 240,
  trainingPlanNameMaxLength: 60,
  trainingPlanDaysMin: 2,
  trainingPlanDaysMax: 7,
  trainingPlanSessionMinutesMin: 20,
  trainingPlanSessionMinutesMax: 180,
  trainingPlanDurationWeeksMin: 1,
  trainingPlanDurationWeeksMax: 52,
  trainingPlanMaxExercisesPerDay: 12,
  searchMaxLength: 100,
  foodNameMaxLength: 120,
  foodBrandMaxLength: 80,
  servingUnitMaxLength: 20,
  nutritionAmountMax: 1000000,
  nutritionCaloriesMax: 1000000,
  nutritionMacroMax: 250000,
  nutritionMineralMax: 10000000,
  nutritionVitaminAMax: 10000000,
  nutritionVitaminMax: 1000000,
}

export const NUTRITION_FIELD_LIMITS = {
  serving_size: { min: 0.01, max: VALIDATION_LIMITS.nutritionAmountMax, decimals: 2, label: 'Serving size' },
  calories: { min: 0, max: VALIDATION_LIMITS.nutritionCaloriesMax, decimals: 0, label: 'Calories' },
  protein: { min: 0, max: VALIDATION_LIMITS.nutritionMacroMax, decimals: 2, label: 'Protein' },
  carbs: { min: 0, max: VALIDATION_LIMITS.nutritionMacroMax, decimals: 2, label: 'Carbs' },
  fat: { min: 0, max: VALIDATION_LIMITS.nutritionMacroMax, decimals: 2, label: 'Fat' },
  fiber: { min: 0, max: VALIDATION_LIMITS.nutritionMacroMax, decimals: 2, label: 'Fiber' },
  sugar: { min: 0, max: VALIDATION_LIMITS.nutritionMacroMax, decimals: 2, label: 'Sugar' },
  saturated_fat: { min: 0, max: VALIDATION_LIMITS.nutritionMacroMax, decimals: 2, label: 'Saturated fat' },
  sodium: { min: 0, max: VALIDATION_LIMITS.nutritionMineralMax, decimals: 0, label: 'Sodium' },
  potassium: { min: 0, max: VALIDATION_LIMITS.nutritionMineralMax, decimals: 0, label: 'Potassium' },
  calcium: { min: 0, max: VALIDATION_LIMITS.nutritionMineralMax, decimals: 0, label: 'Calcium' },
  magnesium: { min: 0, max: VALIDATION_LIMITS.nutritionMineralMax, decimals: 0, label: 'Magnesium' },
  cholesterol: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 0, label: 'Cholesterol' },
  vitamin_a: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminAMax, decimals: 0, label: 'Vitamin A' },
  vitamin_c: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Vitamin C' },
  vitamin_d: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Vitamin D' },
  iron: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Iron' },
  zinc: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Zinc' },
  folate: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Folate' },
  vitamin_b12: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Vitamin B12' },
  vitamin_b6: { min: 0, max: VALIDATION_LIMITS.nutritionVitaminMax, decimals: 2, label: 'Vitamin B6' },
}

export function trimToMax(value, maxLength) {
  return String(value ?? '').slice(0, maxLength)
}

export function hasMaxDecimals(value, maxDecimals) {
  const text = String(value ?? '').trim()
  if (!text || !text.includes('.')) return true
  return text.split('.')[1].length <= maxDecimals
}

export function parseFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function validateNumber(value, {
  label,
  min = null,
  max = null,
  required = false,
  integer = false,
  decimals = null,
} = {}) {
  const name = label || 'Value'
  const text = String(value ?? '').trim()
  if (!text) return required ? `${name} is required.` : ''

  const numeric = Number(text)
  if (!Number.isFinite(numeric)) return `${name} must be a valid number.`
  if (integer && !Number.isInteger(numeric)) return `${name} must be a whole number.`
  if (decimals !== null && !hasMaxDecimals(text, decimals)) {
    return `${name} can have at most ${decimals} decimal place${decimals === 1 ? '' : 's'}.`
  }
  if (min !== null && numeric < min) return `${name} must be at least ${min}.`
  if (max !== null && numeric > max) return `${name} cannot exceed ${max.toLocaleString()}.`
  return ''
}

export function validateLength(value, {
  label,
  min = 0,
  max,
  required = false,
} = {}) {
  const name = label || 'Value'
  const text = String(value ?? '').trim()
  if (!text) return required ? `${name} is required.` : ''
  if (text.length < min) return `${name} must be at least ${min} characters.`
  if (max && text.length > max) return `${name} cannot exceed ${max} characters.`
  return ''
}

export function validateEmail(email) {
  const text = String(email ?? '').trim()
  if (!text) return 'Email is required.'
  if (text.length > VALIDATION_LIMITS.emailMaxLength) return 'Email cannot exceed 254 characters.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return 'Enter a valid email address.'
  return ''
}

export function validatePassword(password) {
  const text = String(password ?? '')
  if (text.length < VALIDATION_LIMITS.passwordMinLength) return 'Password must be at least 8 characters.'
  if (text.length > VALIDATION_LIMITS.passwordMaxLength) return 'Password cannot exceed 128 characters.'
  return ''
}

export function normalizeUsername(username) {
  return String(username ?? '').trim().toLowerCase().replace(/^@+/, '')
}

export function validateUsername(username) {
  const text = normalizeUsername(username)
  if (!text) return ''
  if (text.length < VALIDATION_LIMITS.usernameMinLength) return 'Username must be at least 3 characters.'
  if (text.length > VALIDATION_LIMITS.usernameMaxLength) return 'Username cannot exceed 24 characters.'
  if (!/^[a-z0-9_]+$/.test(text)) return 'Username can only use lowercase letters, numbers, and underscores.'
  return ''
}

export function validateBodyweight(value, unit = 'kg', { label = 'Bodyweight', required = true } = {}) {
  const baseError = validateNumber(value, {
    label,
    min: 0,
    required,
    decimals: 1,
  })
  if (baseError) return baseError

  if (!String(value ?? '').trim()) return ''
  const kg = convertWeight(Number(value), unit, 'kg')
  if (kg < VALIDATION_LIMITS.bodyweightMinKg || kg > VALIDATION_LIMITS.bodyweightMaxKg) {
    return `${label} must be between ${VALIDATION_LIMITS.bodyweightMinKg} and ${VALIDATION_LIMITS.bodyweightMaxKg} kg.`
  }
  return ''
}

export function validateNutritionForm(form) {
  const nameError = validateLength(form?.name, {
    label: 'Food name',
    min: 1,
    max: VALIDATION_LIMITS.foodNameMaxLength,
    required: true,
  })
  if (nameError) return nameError

  const brandError = validateLength(form?.brand, {
    label: 'Brand',
    max: VALIDATION_LIMITS.foodBrandMaxLength,
  })
  if (brandError) return brandError

  const unitError = validateLength(form?.serving_unit, {
    label: 'Serving unit',
    min: 1,
    max: VALIDATION_LIMITS.servingUnitMaxLength,
    required: true,
  })
  if (unitError) return unitError

  for (const [key, rules] of Object.entries(NUTRITION_FIELD_LIMITS)) {
    const error = validateNumber(form?.[key], {
      ...rules,
      required: key === 'serving_size' || key === 'calories',
    })
    if (error) return error
  }

  return ''
}
