import { NUTRITION_FIELD_LIMITS, validateNutritionForm } from './inputValidation'

export const FOOD_FORM_FIELDS = [
  { key: 'name', label: 'Name', unit: '', type: 'text', required: true },
  { key: 'brand', label: 'Brand', unit: '', type: 'text' },
  { key: 'serving_size', label: 'Serving Size', unit: '', type: 'number', required: true, rules: NUTRITION_FIELD_LIMITS.serving_size },
  { key: 'serving_unit', label: 'Serving Unit', unit: '', type: 'text' },
  { key: 'calories', label: 'Calories', unit: 'kcal', type: 'number', required: true, rules: NUTRITION_FIELD_LIMITS.calories },
  { key: 'protein', label: 'Protein', unit: 'g', type: 'number', rules: NUTRITION_FIELD_LIMITS.protein },
  { key: 'carbs', label: 'Carbs', unit: 'g', type: 'number', rules: NUTRITION_FIELD_LIMITS.carbs },
  { key: 'fat', label: 'Fat', unit: 'g', type: 'number', rules: NUTRITION_FIELD_LIMITS.fat },
  { key: 'fiber', label: 'Fiber', unit: 'g', type: 'number', rules: NUTRITION_FIELD_LIMITS.fiber },
  { key: 'sugar', label: 'Sugar', unit: 'g', type: 'number', rules: NUTRITION_FIELD_LIMITS.sugar },
  { key: 'saturated_fat', label: 'Saturated Fat', unit: 'g', type: 'number', rules: NUTRITION_FIELD_LIMITS.saturated_fat },
  { key: 'sodium', label: 'Sodium', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.sodium },
  { key: 'potassium', label: 'Potassium', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.potassium },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.cholesterol },
  { key: 'vitamin_a', label: 'Vitamin A', unit: 'mcg', type: 'number', rules: NUTRITION_FIELD_LIMITS.vitamin_a },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.vitamin_c },
  { key: 'calcium', label: 'Calcium', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.calcium },
  { key: 'iron', label: 'Iron', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.iron },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'mcg', type: 'number', rules: NUTRITION_FIELD_LIMITS.vitamin_d },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.magnesium },
  { key: 'zinc', label: 'Zinc', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.zinc },
  { key: 'folate', label: 'Folate', unit: 'mcg', type: 'number', rules: NUTRITION_FIELD_LIMITS.folate },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg', type: 'number', rules: NUTRITION_FIELD_LIMITS.vitamin_b12 },
  { key: 'vitamin_b6', label: 'Vitamin B6', unit: 'mg', type: 'number', rules: NUTRITION_FIELD_LIMITS.vitamin_b6 },
]

export const EMPTY_FOOD_FORM = {
  name: '',
  brand: '',
  serving_size: '100',
  serving_unit: 'g',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  saturated_fat: '',
  sodium: '',
  potassium: '',
  cholesterol: '',
  vitamin_a: '',
  vitamin_c: '',
  calcium: '',
  iron: '',
  vitamin_d: '',
  magnesium: '',
  zinc: '',
  folate: '',
  vitamin_b12: '',
  vitamin_b6: '',
}

function numberOrZero(value) {
  if (value === '' || value === null || value === undefined) return 0
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function foodToFormValues(food = {}) {
  return {
    name: String(food?.name || ''),
    brand: String(food?.brand || ''),
    serving_size: String(food?.serving_size || 100),
    serving_unit: String(food?.serving_unit || 'g'),
    calories: String(Math.round(Number(food?.calories) || 0)),
    protein: String(+((Number(food?.protein) || 0).toFixed(1))),
    carbs: String(+((Number(food?.carbs) || 0).toFixed(1))),
    fat: String(+((Number(food?.fat) || 0).toFixed(1))),
    fiber: String(+((Number(food?.fiber) || 0).toFixed(1))),
    sugar: String(+((Number(food?.sugar) || 0).toFixed(1))),
    saturated_fat: String(+((Number(food?.saturated_fat) || 0).toFixed(1))),
    sodium: String(Math.round(Number(food?.sodium) || 0)),
    potassium: String(Math.round(Number(food?.potassium) || 0)),
    cholesterol: String(Math.round(Number(food?.cholesterol) || 0)),
    vitamin_a: String(+((Number(food?.vitamin_a) || 0).toFixed(1))),
    vitamin_c: String(+((Number(food?.vitamin_c) || 0).toFixed(1))),
    calcium: String(Math.round(Number(food?.calcium) || 0)),
    iron: String(+((Number(food?.iron) || 0).toFixed(2))),
    vitamin_d: String(+((Number(food?.vitamin_d) || 0).toFixed(1))),
    magnesium: String(Math.round(Number(food?.magnesium) || 0)),
    zinc: String(+((Number(food?.zinc) || 0).toFixed(1))),
    folate: String(Math.round(Number(food?.folate) || 0)),
    vitamin_b12: String(+((Number(food?.vitamin_b12) || 0).toFixed(2))),
    vitamin_b6: String(+((Number(food?.vitamin_b6) || 0).toFixed(2))),
  }
}

export function isFoodFormValid(form) {
  return !validateNutritionForm(form)
}

export function getFoodFormError(form) {
  return validateNutritionForm(form)
}

export function buildFoodPayload(form, userId) {
  return {
    user_id: userId,
    name: form?.name?.trim() || '',
    brand: form?.brand?.trim() || null,
    serving_size: numberOrZero(form?.serving_size) || 100,
    serving_unit: String(form?.serving_unit || 'g').trim() || 'g',
    calories: numberOrZero(form?.calories),
    protein: numberOrZero(form?.protein),
    carbs: numberOrZero(form?.carbs),
    fat: numberOrZero(form?.fat),
    fiber: numberOrZero(form?.fiber),
    sugar: numberOrZero(form?.sugar),
    saturated_fat: numberOrZero(form?.saturated_fat),
    sodium: numberOrZero(form?.sodium),
    potassium: numberOrZero(form?.potassium),
    cholesterol: numberOrZero(form?.cholesterol),
    vitamin_a: numberOrZero(form?.vitamin_a),
    vitamin_c: numberOrZero(form?.vitamin_c),
    calcium: numberOrZero(form?.calcium),
    iron: numberOrZero(form?.iron),
    vitamin_d: numberOrZero(form?.vitamin_d),
    magnesium: numberOrZero(form?.magnesium),
    zinc: numberOrZero(form?.zinc),
    folate: numberOrZero(form?.folate),
    vitamin_b12: numberOrZero(form?.vitamin_b12),
    vitamin_b6: numberOrZero(form?.vitamin_b6),
  }
}

export function foodFromFormValues(form, baseFood = {}, { persistAsNew = false } = {}) {
  const next = {
    ...baseFood,
    name: form?.name?.trim() || '',
    brand: form?.brand?.trim() || null,
    serving_size: numberOrZero(form?.serving_size) || 100,
    serving_unit: String(form?.serving_unit || 'g').trim() || 'g',
    calories: numberOrZero(form?.calories),
    protein: numberOrZero(form?.protein),
    carbs: numberOrZero(form?.carbs),
    fat: numberOrZero(form?.fat),
    fiber: numberOrZero(form?.fiber),
    sugar: numberOrZero(form?.sugar),
    saturated_fat: numberOrZero(form?.saturated_fat),
    sodium: numberOrZero(form?.sodium),
    potassium: numberOrZero(form?.potassium),
    cholesterol: numberOrZero(form?.cholesterol),
    vitamin_a: numberOrZero(form?.vitamin_a),
    vitamin_c: numberOrZero(form?.vitamin_c),
    calcium: numberOrZero(form?.calcium),
    iron: numberOrZero(form?.iron),
    vitamin_d: numberOrZero(form?.vitamin_d),
    magnesium: numberOrZero(form?.magnesium),
    zinc: numberOrZero(form?.zinc),
    folate: numberOrZero(form?.folate),
    vitamin_b12: numberOrZero(form?.vitamin_b12),
    vitamin_b6: numberOrZero(form?.vitamin_b6),
  }

  if (persistAsNew) {
    next.persistAsNew = true
  } else {
    delete next.persistAsNew
  }

  return next
}
