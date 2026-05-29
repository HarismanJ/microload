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

export function normalizeSearchValue(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function applySearchAliases(value = '') {
  let normalized = ` ${normalizeSearchValue(value)} `
  for (const [from, to] of SEARCH_ALIAS_REPLACEMENTS) {
    normalized = normalized.split(` ${from} `).join(` ${to} `)
  }
  return normalizeSearchValue(normalized)
}

function tokenizeSearchValue(value = '') {
  return normalizeSearchValue(value).split(/\s+/).filter(Boolean)
}

function getSearchText(food) {
  return food?.searchText || `${food?.name || ''} ${food?.brand || ''}`
}

function getTypoTolerance(token = '') {
  if (token.length <= 3) return 0
  if (token.length <= 5) return 1
  return 2
}

function getEditDistance(a = '', b = '', maxDistance = Infinity) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1

  const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      )

      if (
        i > 1
        && j > 1
        && a[i - 1] === b[j - 2]
        && a[i - 2] === b[j - 1]
      ) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + cost)
      }
    }
  }

  return rows[a.length][b.length]
}

function getTokenMatchScore(queryToken, candidateToken) {
  if (!queryToken || !candidateToken) return 0
  if (queryToken === candidateToken) return 1
  if (
    queryToken.length >= 4
    && (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken))
  ) {
    return 0.9
  }

  const maxDistance = Math.min(getTypoTolerance(queryToken), getTypoTolerance(candidateToken))
  if (maxDistance <= 0) return 0

  const distance = getEditDistance(queryToken, candidateToken, maxDistance)
  if (distance > maxDistance) return 0
  if (distance === 1) return 0.82
  return 0.68
}

function getBestTokenMatchScore(queryToken, candidateTokens = []) {
  let bestScore = 0
  for (const candidateToken of candidateTokens) {
    const score = getTokenMatchScore(queryToken, candidateToken)
    if (score > bestScore) bestScore = score
    if (bestScore === 1) break
  }
  return bestScore
}

export function isGenericFood(food) {
  if (typeof food?.is_branded === 'boolean') return !food.is_branded

  const dataType = String(food?.data_type || '').toLowerCase()
  if (dataType) return dataType !== 'branded'

  return !food?.brand
}

function getGenericQueryBonus(food, queryTokens = [], normalizedQuery = '') {
  const simpleQuery = queryTokens.length > 0 && queryTokens.length <= 2 && !/\d/.test(normalizedQuery)
  if (simpleQuery) {
    return isGenericFood(food) ? 28 : -14
  }
  return isGenericFood(food) ? 8 : 0
}

export function matchesFoodSearch(food, query) {
  const normalizedQuery = applySearchAliases(query)
  if (!normalizedQuery) return true

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const haystack = applySearchAliases(getSearchText(food))
  const hayTokens = tokenizeSearchValue(haystack)
  const compactHaystack = haystack.replace(/\s+/g, '')

  return tokens.every(token => (
    haystack.includes(token)
    || compactHaystack.includes(token)
    || getBestTokenMatchScore(token, hayTokens) >= 0.68
  ))
}

export function buildFoodSearchKey(food) {
  const servingSize = Number(food?.serving_size) || 0
  const calories = Number(food?.calories) || 0
  return [
    normalizeSearchValue(food?.name || ''),
    normalizeSearchValue(food?.brand || ''),
    servingSize,
    String(food?.serving_unit || '').toLowerCase(),
    Math.round(calories),
  ].join('|')
}

export function scoreFoodSearch(food, query) {
  const normalizedQuery = applySearchAliases(query)
  if (!normalizedQuery) return 0

  const name = applySearchAliases(food?.name || '')
  const full = applySearchAliases(getSearchText(food))
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const nameTokens = tokenizeSearchValue(name)
  const fullTokens = tokenizeSearchValue(full)
  const genericBonus = getGenericQueryBonus(food, tokens, normalizedQuery)

  if (name === normalizedQuery) return 150 + genericBonus
  if (full === normalizedQuery) return 132 + genericBonus
  if (name.startsWith(normalizedQuery)) return 126 + genericBonus
  if (full.startsWith(normalizedQuery)) return 112 + genericBonus
  if (name.includes(normalizedQuery)) return 102 + genericBonus
  if (full.includes(normalizedQuery)) return 90 + genericBonus

  const exactNameHits = tokens.filter(token => nameTokens.includes(token)).length
  const exactFullHits = tokens.filter(token => fullTokens.includes(token)).length
  const fuzzyScore = tokens.reduce(
    (sum, token) => sum + getBestTokenMatchScore(token, fullTokens),
    0
  )

  if (fuzzyScore <= 0) return 0

  return (
    40
    + exactNameHits * 12
    + exactFullHits * 6
    + Math.round(fuzzyScore * 18)
    + genericBonus
  )
}

export function sortFoodsForQuery(a, b, query) {
  const scoreDiff = scoreFoodSearch(b, query) - scoreFoodSearch(a, query)
  if (scoreDiff !== 0) return scoreDiff

  const genericDiff = Number(isGenericFood(b)) - Number(isGenericFood(a))
  if (genericDiff !== 0) return genericDiff

  const lengthDiff = (a?.name?.length || 0) - (b?.name?.length || 0)
  if (lengthDiff !== 0) return lengthDiff

  return String(a?.name || '').localeCompare(String(b?.name || ''))
}

export function matchesStoredFood(record, food) {
  return (
    normalizeSearchValue(record?.name || '') === normalizeSearchValue(food?.name || '')
    && normalizeSearchValue(record?.brand || '') === normalizeSearchValue(food?.brand || '')
    && Math.abs((Number(record?.serving_size) || 0) - (Number(food?.serving_size) || 0)) < 0.001
    && String(record?.serving_unit || '').toLowerCase() === String(food?.serving_unit || '').toLowerCase()
    && Math.abs((Number(record?.calories) || 0) - (Number(food?.calories) || 0)) < 0.001
  )
}

export function mergeFoodSearchResults(localFoods = [], remoteFoods = [], query = '') {
  const seen = new Set()
  const merged = []

  for (const food of [...remoteFoods, ...localFoods]) {
    if (!matchesFoodSearch(food, query)) continue
    const key = buildFoodSearchKey(food)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(food)
  }

  return merged.sort((a, b) => sortFoodsForQuery(a, b, query))
}
