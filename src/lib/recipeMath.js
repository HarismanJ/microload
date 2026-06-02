// Pure nutrition math for recipes — extracted from CreateFood so the recipe editor,
// the food picker, and logging all scale/total ingredients identically (and so it can
// be unit-tested in isolation). No React, no Supabase — keep it pure.

export const RECIPE_NUMERIC_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'saturated_fat',
  'sodium',
  'potassium',
  'cholesterol',
  'vitamin_a',
  'vitamin_c',
  'calcium',
  'iron',
  'vitamin_d',
  'magnesium',
  'zinc',
  'folate',
  'vitamin_b12',
  'vitamin_b6',
]

export const RECIPE_MICRO_ITEMS = [
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'saturated_fat', label: 'Saturated Fat', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  { key: 'vitamin_a', label: 'Vitamin A', unit: 'mcg' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'mcg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg' },
  { key: 'folate', label: 'Folate', unit: 'mcg' },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg' },
  { key: 'vitamin_b6', label: 'Vitamin B6', unit: 'mg' },
]

// Fields rounded to whole numbers in per-serving output; everything else to 1 decimal,
// except the trace nutrients below which keep 2 decimals.
const PER_SERVING_INTEGER_FIELDS = new Set([
  'calories', 'sodium', 'potassium', 'cholesterol', 'vitamin_a', 'calcium', 'magnesium', 'folate',
])
const PER_SERVING_TWO_DECIMAL_FIELDS = new Set(['iron', 'vitamin_b12', 'vitamin_b6'])

export function numberOrZero(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function roundNumber(value, decimals = 1) {
  const factor = 10 ** decimals
  return Math.round((numberOrZero(value) + Number.EPSILON) * factor) / factor
}

export function supportsDirectAmount(food) {
  const unit = String(food?.serving_unit || '').trim().toLowerCase()
  return unit === 'g' || unit === 'ml'
}

export function getDirectAmountUnit(food) {
  return String(food?.serving_unit || '').trim().toLowerCase() === 'ml' ? 'ml' : 'g'
}

export function getIngredientDefaults(food) {
  if (supportsDirectAmount(food)) {
    const servingSize = numberOrZero(food?.serving_size) || 100
    return {
      amountMode: 'direct',
      amount: String(roundNumber(servingSize, 1)),
      servings: 1,
    }
  }

  return {
    amountMode: 'servings',
    amount: '',
    servings: 1,
  }
}

export function getIngredientMultiplier(food, amountMode, amount, servings) {
  if (!food) return 0

  if (amountMode === 'direct') {
    const directAmount = Number.parseFloat(amount)
    const servingSize = numberOrZero(food?.serving_size)
    if (!Number.isFinite(directAmount) || directAmount <= 0 || servingSize <= 0) return 0
    return directAmount / servingSize
  }

  const servingCount = Number.parseFloat(servings)
  if (!Number.isFinite(servingCount) || servingCount <= 0) return 0
  return servingCount
}

// Scale a food's per-its-own-serving nutrients by `multiplier`, with field-appropriate rounding.
export function buildScaledNutrients(food, multiplier) {
  return {
    calories: Math.round(numberOrZero(food?.calories) * multiplier),
    protein: roundNumber(numberOrZero(food?.protein) * multiplier, 1),
    carbs: roundNumber(numberOrZero(food?.carbs) * multiplier, 1),
    fat: roundNumber(numberOrZero(food?.fat) * multiplier, 1),
    fiber: roundNumber(numberOrZero(food?.fiber) * multiplier, 1),
    sugar: roundNumber(numberOrZero(food?.sugar) * multiplier, 1),
    saturated_fat: roundNumber(numberOrZero(food?.saturated_fat) * multiplier, 1),
    sodium: Math.round(numberOrZero(food?.sodium) * multiplier),
    potassium: Math.round(numberOrZero(food?.potassium) * multiplier),
    cholesterol: Math.round(numberOrZero(food?.cholesterol) * multiplier),
    vitamin_a: Math.round(numberOrZero(food?.vitamin_a) * multiplier),
    vitamin_c: roundNumber(numberOrZero(food?.vitamin_c) * multiplier, 1),
    calcium: Math.round(numberOrZero(food?.calcium) * multiplier),
    iron: roundNumber(numberOrZero(food?.iron) * multiplier, 2),
    vitamin_d: roundNumber(numberOrZero(food?.vitamin_d) * multiplier, 1),
    magnesium: Math.round(numberOrZero(food?.magnesium) * multiplier),
    zinc: roundNumber(numberOrZero(food?.zinc) * multiplier, 1),
    folate: Math.round(numberOrZero(food?.folate) * multiplier),
    vitamin_b12: roundNumber(numberOrZero(food?.vitamin_b12) * multiplier, 2),
    vitamin_b6: roundNumber(numberOrZero(food?.vitamin_b6) * multiplier, 2),
  }
}

export function formatIngredientAmount(entry) {
  if (entry.amountMode === 'direct') {
    return `${roundNumber(entry.amount, 1)}${entry.amountUnit}`
  }

  const servings = roundNumber(entry.servings, 2)
  return `${servings} serving${servings === 1 ? '' : 's'}`
}

// Sum the scaled `nutrients` of every ingredient into recipe-wide totals.
export function sumRecipeTotals(ingredients = []) {
  return ingredients.reduce((totals, ingredient) => {
    for (const key of RECIPE_NUMERIC_FIELDS) {
      totals[key] += numberOrZero(ingredient?.nutrients?.[key])
    }
    return totals
  }, Object.fromEntries(RECIPE_NUMERIC_FIELDS.map(key => [key, 0])))
}

// Divide recipe-wide totals by the number of servings the recipe yields, with
// field-appropriate rounding. `servings` is clamped to at least 1.
export function perServingTotals(totals, servings) {
  const recipeYield = Math.max(1, numberOrZero(servings) || 1)
  return RECIPE_NUMERIC_FIELDS.reduce((perServing, key) => {
    const value = numberOrZero(totals?.[key]) / recipeYield
    if (PER_SERVING_INTEGER_FIELDS.has(key)) {
      perServing[key] = Math.round(value)
    } else if (PER_SERVING_TWO_DECIMAL_FIELDS.has(key)) {
      perServing[key] = roundNumber(value, 2)
    } else {
      perServing[key] = roundNumber(value, 1)
    }
    return perServing
  }, {})
}

// Convenience: ingredients + yield → rounded per-serving nutrition object.
export function computePerServingNutrition(ingredients, servings) {
  return perServingTotals(sumRecipeTotals(ingredients), servings)
}
