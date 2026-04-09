export function normalizeSearchValue(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenizeSearchValue(value = '') {
  return normalizeSearchValue(value).split(/\s+/).filter(Boolean)
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

export function matchesSearchQuery(query, ...fields) {
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return true

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const haystack = fields.map(normalizeSearchValue).filter(Boolean).join(' ')
  const hayTokens = tokenizeSearchValue(haystack)
  const compactHaystack = haystack.replace(/\s+/g, '')

  return tokens.every(token => (
    haystack.includes(token)
    || compactHaystack.includes(token)
    || getBestTokenMatchScore(token, hayTokens) >= 0.68
  ))
}

export function scoreExerciseMatch(query, exercise) {
  const q = normalizeSearchValue(query)
  if (!q) return 0

  const name = normalizeSearchValue(exercise?.name || '')
  const tokens = q.split(/\s+/).filter(Boolean)
  const nameTokens = tokenizeSearchValue(name)

  if (name === q) return 100
  if (name.startsWith(q)) return 90
  if (name.includes(q)) return 80
  if (tokens.every(token => name.includes(token))) return 70

  const exactNameHits = tokens.filter(token => name.includes(token)).length
  if (exactNameHits > 0) return 40 + exactNameHits * 10

  const fuzzyScore = tokens.reduce(
    (sum, token) => sum + getBestTokenMatchScore(token, nameTokens),
    0
  )

  if (fuzzyScore > 0) {
    return 24 + Math.round(fuzzyScore * 12)
  }

  return 10
}
