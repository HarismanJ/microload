import { NUTRITION_FIELD_LIMITS, VALIDATION_LIMITS, trimToMax } from './inputValidation'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search'

function numberOrZero(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, numberOrZero(v)))
}

// Get a nutrient value, preferring the suffix-specific key then falling back to bare key
function offNutrient(n, key, suffix) {
  const suffixed = n[`${key}${suffix}`]
  if (suffixed !== undefined && suffixed !== null) return numberOrZero(suffixed)
  return numberOrZero(n[key] ?? 0)
}

export function mapOffFood(product) {
  if (!product) return null

  const name = String(product.product_name || '').trim()
  if (!name) return null

  const id = String(product._id || product.id || product.code || '').trim()
  if (!id) return null

  const n = product.nutriments || {}

  // Nutrient suffix + serving size must stay in sync.
  // _serving fields are per product.serving_quantity; _100g fields are per 100 g.
  // When no serving data is present we default to 100 g so the stored nutrients
  // (which are per 100 g) match the stored serving size.
  const hasServingData = 'energy-kcal_serving' in n || 'proteins_serving' in n
  const suffix = hasServingData ? '_serving' : '_100g'
  const serving_size = hasServingData
    ? clamp(numberOrZero(product.serving_quantity) || 100, NUTRITION_FIELD_LIMITS.serving_size.min, NUTRITION_FIELD_LIMITS.serving_size.max)
    : 100
  const serving_unit = hasServingData
    ? (String(product.serving_quantity_unit || 'g').toLowerCase().trim() || 'g')
    : 'g'

  const protein = offNutrient(n, 'proteins', suffix)
  const carbs = offNutrient(n, 'carbohydrates', suffix)
  const fat = offNutrient(n, 'fat', suffix)
  const kcal = offNutrient(n, 'energy-kcal', suffix)
  const estimatedCalories = protein * 4 + carbs * 4 + fat * 9
  const calories = kcal > 0 ? kcal : estimatedCalories

  const brand = product.brands?.split(',')[0]?.trim() || null

  return {
    id: null,
    remoteKey: `off:${id}`,
    source: 'off',
    data_type: brand ? 'Branded' : '',
    is_branded: Boolean(brand),
    searchText: trimToMax(
      `${brand || ''} ${name}`.trim(),
      VALIDATION_LIMITS.foodNameMaxLength + VALIDATION_LIMITS.foodBrandMaxLength + 1
    ),
    name: trimToMax(name, VALIDATION_LIMITS.foodNameMaxLength),
    brand: brand ? trimToMax(brand, VALIDATION_LIMITS.foodBrandMaxLength) : null,
    serving_size,
    serving_unit,

    // Calories
    calories: Math.round(clamp(calories, NUTRITION_FIELD_LIMITS.calories.min, NUTRITION_FIELD_LIMITS.calories.max)),

    // Macros — OFI returns g, matches our stored unit
    protein:       clamp(protein, NUTRITION_FIELD_LIMITS.protein.min, NUTRITION_FIELD_LIMITS.protein.max),
    carbs:         clamp(carbs,   NUTRITION_FIELD_LIMITS.carbs.min,   NUTRITION_FIELD_LIMITS.carbs.max),
    fat:           clamp(fat,     NUTRITION_FIELD_LIMITS.fat.min,     NUTRITION_FIELD_LIMITS.fat.max),
    fiber:         clamp(offNutrient(n, 'fiber',         suffix), NUTRITION_FIELD_LIMITS.fiber.min,        NUTRITION_FIELD_LIMITS.fiber.max),
    sugar:         clamp(offNutrient(n, 'sugars',        suffix), NUTRITION_FIELD_LIMITS.sugar.min,        NUTRITION_FIELD_LIMITS.sugar.max),
    saturated_fat: clamp(offNutrient(n, 'saturated-fat', suffix), NUTRITION_FIELD_LIMITS.saturated_fat.min, NUTRITION_FIELD_LIMITS.saturated_fat.max),

    // Minerals — OFI returns g, we store mg → multiply by 1000
    sodium:      Math.round(clamp(offNutrient(n, 'sodium',      suffix) * 1000, NUTRITION_FIELD_LIMITS.sodium.min,      NUTRITION_FIELD_LIMITS.sodium.max)),
    potassium:   Math.round(clamp(offNutrient(n, 'potassium',   suffix) * 1000, NUTRITION_FIELD_LIMITS.potassium.min,   NUTRITION_FIELD_LIMITS.potassium.max)),
    calcium:     Math.round(clamp(offNutrient(n, 'calcium',     suffix) * 1000, NUTRITION_FIELD_LIMITS.calcium.min,     NUTRITION_FIELD_LIMITS.calcium.max)),
    magnesium:   Math.round(clamp(offNutrient(n, 'magnesium',   suffix) * 1000, NUTRITION_FIELD_LIMITS.magnesium.min,   NUTRITION_FIELD_LIMITS.magnesium.max)),
    iron:        clamp(offNutrient(n, 'iron',         suffix) * 1000, NUTRITION_FIELD_LIMITS.iron.min,         NUTRITION_FIELD_LIMITS.iron.max),
    zinc:        clamp(offNutrient(n, 'zinc',         suffix) * 1000, NUTRITION_FIELD_LIMITS.zinc.min,         NUTRITION_FIELD_LIMITS.zinc.max),
    cholesterol: Math.round(clamp(offNutrient(n, 'cholesterol',  suffix) * 1000, NUTRITION_FIELD_LIMITS.cholesterol.min,  NUTRITION_FIELD_LIMITS.cholesterol.max)),

    // Vitamins — follow parseOFF convention (raw value, no × 1000)
    vitamin_a: clamp(offNutrient(n, 'vitamin-a', suffix), NUTRITION_FIELD_LIMITS.vitamin_a.min, NUTRITION_FIELD_LIMITS.vitamin_a.max),
    vitamin_c: clamp(offNutrient(n, 'vitamin-c', suffix), NUTRITION_FIELD_LIMITS.vitamin_c.min, NUTRITION_FIELD_LIMITS.vitamin_c.max),
    vitamin_d: clamp(offNutrient(n, 'vitamin-d', suffix), NUTRITION_FIELD_LIMITS.vitamin_d.min, NUTRITION_FIELD_LIMITS.vitamin_d.max),

    // Vitamins B6/B12 + Folate — OFI returns g, convert per target unit.
    // The 5,000 cap absorbs OFF products that mis-encode units; alternative
    // would silently mis-store spec-compliant products at 1,000,000× too small.
    vitamin_b6: clamp(offNutrient(n, 'vitamin-b6', suffix) * 1000, NUTRITION_FIELD_LIMITS.vitamin_b6.min, NUTRITION_FIELD_LIMITS.vitamin_b6.max),
    vitamin_b12: clamp(offNutrient(n, 'vitamin-b12', suffix) * 1000000, NUTRITION_FIELD_LIMITS.vitamin_b12.min, NUTRITION_FIELD_LIMITS.vitamin_b12.max),
    folate: Math.round(clamp(offNutrient(n, 'folates', suffix) * 1000000, NUTRITION_FIELD_LIMITS.folate.min, NUTRITION_FIELD_LIMITS.folate.max)),
  }
}

export async function searchOffFoods(query, { signal, pageSize = 20 } = {}) {
  if (!query?.trim()) return []

  const params = new URLSearchParams({
    search_terms: query.trim(),
    page_size: String(Math.min(50, Math.max(1, pageSize))),
    fields: [
      'id', '_id', 'code',
      'product_name', 'brands',
      'serving_quantity', 'serving_quantity_unit',
      'nutriments',
    ].join(','),
  })

  const response = await fetch(`${OFF_SEARCH_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`OpenFoodFacts search failed (${response.status})`)

  const payload = await response.json()
  const products = Array.isArray(payload?.products) ? payload.products : []

  const seen = new Set()
  const results = []
  for (const product of products) {
    const mapped = mapOffFood(product)
    if (!mapped) continue
    if (seen.has(mapped.remoteKey)) continue
    seen.add(mapped.remoteKey)
    results.push(mapped)
  }
  return results
}
