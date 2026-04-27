const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY
if (!USDA_API_KEY) throw new Error('VITE_USDA_API_KEY is not set — add it to your .env file')
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

const SEARCH_ALIAS_REPLACEMENTS = [
  ['pb2', 'peanut butter powder'],
  ['pb fit', 'peanut butter powder'],
  ['pbfit', 'peanut butter powder'],
  ['pb', 'peanut butter'],
  ['greek yoghurt', 'greek yogurt'],
  ['yoghurt', 'yogurt'],
  ['garbanzo beans', 'chickpeas'],
  ['garbanzo bean', 'chickpeas'],
  ['chick peas', 'chickpeas'],
  ['aubergine', 'eggplant'],
  ['courgette', 'zucchini'],
  ['capsicum', 'bell pepper'],
  ['minced', 'ground'],
  ['mince', 'ground'],
]

const NUTRIENT_NUMBERS = {
  calories: ['208', '958', '957', '2048', '2047'],
  protein: ['203'],
  carbs: ['205'],
  fat: ['204'],
  fiber: ['291'],
  sugar: ['269'],
  saturated_fat: ['606'],
  sodium: ['307'],
  potassium: ['306'],
  cholesterol: ['601'],
  calcium: ['301'],
  iron: ['303'],
  magnesium: ['304'],
  zinc: ['309'],
  vitamin_a: ['318', '320'],
  vitamin_c: ['401'],
  vitamin_d: ['324', '328'],
}

const NUTRIENT_NAME_ALIASES = {
  calories: ['energy', 'energy atwater specific factors', 'energy atwater general factors'],
  protein: ['protein'],
  carbs: ['carbohydrate by difference', 'carbohydrate'],
  fat: ['total lipid fat', 'fat'],
  fiber: ['fiber total dietary', 'dietary fiber'],
  sugar: ['total sugars', 'sugars total including nlea'],
  saturated_fat: ['fatty acids total saturated', 'saturated fat'],
  sodium: ['sodium na', 'sodium'],
  potassium: ['potassium k', 'potassium'],
  cholesterol: ['cholesterol'],
  calcium: ['calcium ca', 'calcium'],
  iron: ['iron fe', 'iron'],
  magnesium: ['magnesium mg', 'magnesium'],
  zinc: ['zinc zn', 'zinc'],
  vitamin_a: ['vitamin a rae', 'vitamin a iu'],
  vitamin_c: ['vitamin c total ascorbic acid', 'vitamin c'],
  vitamin_d: ['vitamin d d2 d3', 'vitamin d'],
}

const LABEL_NUTRIENT_KEYS = {
  calories: ['calories'],
  protein: ['protein'],
  carbs: ['carbohydrates'],
  fat: ['fat'],
  fiber: ['fiber'],
  sugar: ['sugars'],
  saturated_fat: ['saturatedFat'],
  sodium: ['sodium'],
  cholesterol: ['cholesterol'],
}

function normalizeUnit(unit) {
  const normalized = String(unit || '').trim().toLowerCase()
  return normalized || 'g'
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function applySearchAliases(value) {
  let normalized = ` ${normalizeSearchValue(value)} `
  for (const [from, to] of SEARCH_ALIAS_REPLACEMENTS) {
    normalized = normalized.split(` ${from} `).join(` ${to} `)
  }
  return normalizeSearchValue(normalized)
}

function buildUsdaQueries(query) {
  const queries = []
  const push = (value) => {
    const normalized = normalizeSearchValue(value)
    if (!normalized || queries.includes(normalized)) return
    queries.push(normalized)
  }

  const aliasNormalized = applySearchAliases(query)
  const rawNormalized = normalizeSearchValue(query)
  const tokens = aliasNormalized.split(/\s+/).filter(token => token.length >= 3)
  const longestToken = [...tokens].sort((a, b) => b.length - a.length)[0] || ''

  push(aliasNormalized)
  push(rawNormalized)

  if (longestToken && longestToken !== aliasNormalized) {
    push(longestToken)
  }

  if (longestToken.length >= 5) {
    push(longestToken.slice(0, 4))
  }

  return queries.slice(0, 4)
}

function numberOrZero(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function normalizeNutrientName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getRawNutrientValue(nutrient) {
  if ('value' in nutrient) return numberOrZero(nutrient.value)
  if ('amount' in nutrient) return numberOrZero(nutrient.amount)
  return 0
}

function getLabelNutrientValue(labelNutrients, nutrientKey) {
  if (!labelNutrients) return 0
  const candidateKeys = LABEL_NUTRIENT_KEYS[nutrientKey] || []
  for (const key of candidateKeys) {
    const rawEntry = labelNutrients[key]
    if (rawEntry && typeof rawEntry === 'object') {
      if ('value' in rawEntry) return numberOrZero(rawEntry.value)
      if ('amount' in rawEntry) return numberOrZero(rawEntry.amount)
    }
  }
  return 0
}

function getNutrientValue(nutrientKey, foodNutrients = [], labelNutrients = null) {
  const nutrientNumbers = NUTRIENT_NUMBERS[nutrientKey] || []
  const nutrientNames = (NUTRIENT_NAME_ALIASES[nutrientKey] || []).map(normalizeNutrientName)

  for (const nutrientNumber of nutrientNumbers) {
    for (const nutrient of foodNutrients) {
      if (String(nutrient?.nutrientNumber || '') === nutrientNumber) {
        return getRawNutrientValue(nutrient)
      }
    }
  }

  for (const nutrientName of nutrientNames) {
    for (const nutrient of foodNutrients) {
      const rawName = nutrient?.nutrientName || nutrient?.nutrient?.name || ''
      if (normalizeNutrientName(rawName) === nutrientName) {
        return getRawNutrientValue(nutrient)
      }
    }
  }

  const labelValue = getLabelNutrientValue(labelNutrients, nutrientKey)
  if (labelValue > 0) return labelValue

  return 0
}

function mapUsdaFood(food) {
  if (!food?.fdcId || !food?.description) return null

  const servingSize = numberOrZero(food.servingSize) > 0 ? numberOrZero(food.servingSize) : 100
  const servingUnit = numberOrZero(food.servingSize) > 0
    ? normalizeUnit(food.servingSizeUnit)
    : 'g'
  const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : []
  const labelNutrients = food.labelNutrients && typeof food.labelNutrients === 'object'
    ? food.labelNutrients
    : null
  const protein = getNutrientValue('protein', nutrients, labelNutrients)
  const carbs = getNutrientValue('carbs', nutrients, labelNutrients)
  const fat = getNutrientValue('fat', nutrients, labelNutrients)
  const calorieValue = getNutrientValue('calories', nutrients, labelNutrients)
  const estimatedCalories = protein * 4 + carbs * 4 + fat * 9
  const calories = calorieValue > 0 ? calorieValue : estimatedCalories

  return {
    id: null,
    remoteKey: `usda:${food.fdcId}`,
    source: 'usda',
    usdaFdcId: food.fdcId,
    data_type: String(food.dataType || ''),
    is_branded: String(food.dataType || '').toLowerCase() === 'branded' || Boolean(food.brandName || food.brandOwner),
    searchText: `${food.brandName || food.brandOwner || ''} ${String(food.description).trim()}`.trim(),
    name: String(food.description).trim(),
    brand: food.brandName || food.brandOwner || null,
    serving_size: servingSize,
    serving_unit: servingUnit,
    calories: Math.round(calories),
    protein,
    carbs,
    fat,
    fiber: getNutrientValue('fiber', nutrients, labelNutrients),
    sugar: getNutrientValue('sugar', nutrients, labelNutrients),
    saturated_fat: getNutrientValue('saturated_fat', nutrients, labelNutrients),
    sodium: getNutrientValue('sodium', nutrients, labelNutrients),
    potassium: getNutrientValue('potassium', nutrients, labelNutrients),
    cholesterol: getNutrientValue('cholesterol', nutrients, labelNutrients),
    calcium: getNutrientValue('calcium', nutrients, labelNutrients),
    iron: getNutrientValue('iron', nutrients, labelNutrients),
    magnesium: getNutrientValue('magnesium', nutrients, labelNutrients),
    zinc: getNutrientValue('zinc', nutrients, labelNutrients),
    vitamin_a: getNutrientValue('vitamin_a', nutrients, labelNutrients),
    vitamin_c: getNutrientValue('vitamin_c', nutrients, labelNutrients),
    vitamin_d: getNutrientValue('vitamin_d', nutrients, labelNutrients),
  }
}

function normalizeBarcode(code) {
  return String(code || '').replace(/^0+/, '') || '0'
}

export async function searchUsdaFoods(query, { signal, pageSize = 24 } = {}) {
  const trimmedQuery = String(query || '').trim()
  if (!trimmedQuery) return []

  const requestedPageSize = Math.max(1, Math.min(50, pageSize))
  const candidateQueries = buildUsdaQueries(trimmedQuery)
  const foodsById = new Map()

  for (const candidateQuery of candidateQueries) {
    if (signal?.aborted) break

    const params = new URLSearchParams({
      api_key: USDA_API_KEY,
      query: candidateQuery,
      pageSize: String(requestedPageSize),
    })

    const response = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`, { signal })
    if (!response.ok) throw new Error(`USDA search failed (${response.status})`)

    const payload = await response.json()
    const foods = Array.isArray(payload?.foods) ? payload.foods : []
    for (const food of foods) {
      const mapped = mapUsdaFood(food)
      if (!mapped) continue
      foodsById.set(String(mapped.remoteKey), mapped)
    }

    if (foodsById.size >= requestedPageSize) break
  }

  return [...foodsById.values()]
}

export async function lookupUsdaBarcode(barcode, { signal } = {}) {
  const normalizedInput = normalizeBarcode(barcode)
  const params = new URLSearchParams({
    api_key: USDA_API_KEY,
    query: String(barcode),
    dataType: 'Branded',
    pageSize: '5',
  })

  const response = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`, { signal })
  if (!response.ok) return null

  const payload = await response.json()
  const foods = Array.isArray(payload?.foods) ? payload.foods : []
  const match = foods.find(f => f.gtinUpc && normalizeBarcode(f.gtinUpc) === normalizedInput)
  return match ? mapUsdaFood(match) : null
}
