import {
  applySearchAliases,
  buildFoodSearchKey,
  isGenericFood,
  matchesFoodSearch,
  matchesStoredFood,
  mergeFoodSearchResults,
  normalizeSearchValue,
  scoreFoodSearch,
  sortFoodsForQuery,
} from '../../lib/foodSearch.js'

function makeFood(overrides = {}) {
  return {
    id: 'food',
    name: 'Greek Yogurt',
    brand: null,
    serving_size: 100,
    serving_unit: 'g',
    calories: 90,
    ...overrides,
  }
}

describe('food search normalization and aliases', () => {
  it('lowercases text and collapses punctuation into normalized tokens', () => {
    expect(normalizeSearchValue('  Greek-YOGURT!! 2%  ')).toBe('greek yogurt 2')
  })

  it('applies common food aliases after normalization', () => {
    expect(applySearchAliases('PB2')).toBe('peanut butter powder')
    expect(applySearchAliases('PB Fit yoghurt')).toBe('peanut butter powder yogurt')
    expect(applySearchAliases('garbanzo beans with aubergine')).toBe('chickpeas with eggplant')
  })
})

describe('matchesFoodSearch', () => {
  it('treats empty and whitespace-only queries as matches', () => {
    expect(matchesFoodSearch(makeFood(), '')).toBe(true)
    expect(matchesFoodSearch(makeFood(), '   ')).toBe(true)
  })

  it('matches multiple query tokens across food name, brand, and search text', () => {
    expect(matchesFoodSearch(makeFood({ brand: 'Chobani' }), 'chobani yogurt')).toBe(true)
    expect(matchesFoodSearch(makeFood({
      name: 'Unknown',
      searchText: 'USDA Chobani Greek Yogurt Plain',
    }), 'chobani yogurt')).toBe(true)
  })

  it('matches compact queries when the candidate has spaces', () => {
    expect(matchesFoodSearch(makeFood({ name: 'Peanut Butter' }), 'peanutbutter')).toBe(true)
  })

  it('accepts tolerated typos and rejects short or distant typos', () => {
    expect(matchesFoodSearch(makeFood({ name: 'Greek Yogurt' }), 'yogrt')).toBe(true)
    expect(matchesFoodSearch(makeFood({ name: 'Greek Yogurt' }), 'gy')).toBe(false)
    expect(matchesFoodSearch(makeFood({ name: 'Greek Yogurt' }), 'zzzz')).toBe(false)
  })
})

describe('generic and branded food detection', () => {
  it('uses explicit branded flags before data type or brand fallback', () => {
    expect(isGenericFood(makeFood({ is_branded: false, brand: 'Brand' }))).toBe(true)
    expect(isGenericFood(makeFood({ is_branded: true, brand: null }))).toBe(false)
  })

  it('uses USDA data type and then missing brand as fallback signals', () => {
    expect(isGenericFood(makeFood({ data_type: 'Foundation', brand: 'USDA' }))).toBe(true)
    expect(isGenericFood(makeFood({ data_type: 'Branded', brand: null }))).toBe(false)
    expect(isGenericFood(makeFood({ brand: null }))).toBe(true)
    expect(isGenericFood(makeFood({ brand: 'Chobani' }))).toBe(false)
  })

  it('scores generic foods above branded foods for simple generic queries', () => {
    const generic = makeFood({ name: 'Greek Yogurt', brand: null })
    const branded = makeFood({ name: 'Greek Yogurt', brand: 'Chobani' })

    expect(scoreFoodSearch(generic, 'greek yogurt')).toBeGreaterThan(scoreFoodSearch(branded, 'greek yogurt'))
  })
})

describe('scoreFoodSearch', () => {
  it('scores exact, full text, prefix, contained, and fuzzy matches in descending order', () => {
    const exactName = makeFood({ name: 'Peanut Butter', brand: 'BrandCo' })
    const exactFullText = makeFood({ name: 'Peanut', brand: 'Butter' })
    const prefix = makeFood({ name: 'Peanut Butter Powder', brand: 'BrandCo' })
    const contained = makeFood({ name: 'Creamy Peanut Butter Spread', brand: 'BrandCo' })
    const fuzzy = makeFood({ name: 'Peanut Better', brand: 'BrandCo' })
    const query = 'peanut butter'

    expect(scoreFoodSearch(exactName, query)).toBeGreaterThan(scoreFoodSearch(exactFullText, query))
    expect(scoreFoodSearch(exactFullText, query)).toBeGreaterThan(scoreFoodSearch(prefix, query))
    expect(scoreFoodSearch(prefix, query)).toBeGreaterThan(scoreFoodSearch(contained, query))
    expect(scoreFoodSearch(contained, query)).toBeGreaterThan(scoreFoodSearch(fuzzy, query))
    expect(scoreFoodSearch(fuzzy, query)).toBeGreaterThan(0)
  })

  it('returns zero for empty queries and foods with no token matches', () => {
    expect(scoreFoodSearch(makeFood(), '')).toBe(0)
    expect(scoreFoodSearch(makeFood({ name: 'Greek Yogurt' }), 'salmon')).toBe(0)
  })
})

describe('sortFoodsForQuery', () => {
  it('sorts by score before fallback tie breakers', () => {
    const foods = [
      makeFood({ id: 'prefix', name: 'Peanut Butter Powder', brand: 'BrandCo' }),
      makeFood({ id: 'exact', name: 'Peanut Butter', brand: 'BrandCo' }),
    ]

    expect(foods.sort((a, b) => sortFoodsForQuery(a, b, 'peanut butter')).map(food => food.id)).toEqual([
      'exact',
      'prefix',
    ])
  })

  it('uses generic preference, shorter name, then alphabetical name when scores tie', () => {
    const genericTie = [
      makeFood({ id: 'branded', name: 'Greek Yogurt', brand: 'Chobani' }),
      makeFood({ id: 'generic', name: 'Greek Yogurt', brand: null }),
    ]
    expect(genericTie.sort((a, b) => sortFoodsForQuery(a, b, '')).map(food => food.id)).toEqual([
      'generic',
      'branded',
    ])

    const lengthTie = [
      makeFood({ id: 'long', name: 'Plain Greek Yogurt', brand: null }),
      makeFood({ id: 'short', name: 'Yogurt', brand: null }),
    ]
    expect(lengthTie.sort((a, b) => sortFoodsForQuery(a, b, '')).map(food => food.id)).toEqual([
      'short',
      'long',
    ])

    const alphaTie = [
      makeFood({ id: 'mango', name: 'Mango', brand: null }),
      makeFood({ id: 'apple', name: 'Apple', brand: null }),
    ]
    expect(alphaTie.sort((a, b) => sortFoodsForQuery(a, b, '')).map(food => food.id)).toEqual([
      'apple',
      'mango',
    ])
  })
})

describe('stored food keys and merging', () => {
  it('builds normalized dedupe keys from food identity and rounded calories', () => {
    expect(buildFoodSearchKey({
      name: ' Greek-Yogurt! ',
      brand: ' CHOBANI!! ',
      serving_size: '100',
      serving_unit: 'G',
      calories: 89.6,
    })).toBe('greek yogurt|chobani|100|g|90')
  })

  it('matches stored foods with normalized text and tiny numeric differences', () => {
    const record = makeFood({
      name: 'Greek-Yogurt',
      brand: 'CHOBANI',
      serving_size: 100,
      serving_unit: 'G',
      calories: 90.0004,
    })
    const food = makeFood({
      name: 'greek yogurt',
      brand: 'chobani',
      serving_size: 100.0005,
      serving_unit: 'g',
      calories: 90,
    })

    expect(matchesStoredFood(record, food)).toBe(true)
    expect(matchesStoredFood(record, { ...food, calories: 91 })).toBe(false)
  })

  it('filters non-matches, dedupes remote and local foods, and sorts merged results', () => {
    const remoteDuplicate = makeFood({
      id: 'remote-peanut-butter',
      name: 'Peanut Butter',
      brand: 'Acme',
      serving_size: 32,
      serving_unit: 'g',
      calories: 190,
    })
    const localDuplicate = makeFood({
      id: 'local-peanut-butter',
      name: 'peanut butter',
      brand: 'ACME',
      serving_size: 32,
      serving_unit: 'g',
      calories: 190.2,
    })
    const remotePowder = makeFood({
      id: 'remote-powder',
      name: 'Peanut Butter Powder',
      brand: null,
      serving_size: 16,
      serving_unit: 'g',
      calories: 60,
    })
    const localCreamy = makeFood({
      id: 'local-creamy',
      name: 'Creamy Peanut Butter Spread',
      brand: 'Store',
      serving_size: 32,
      serving_unit: 'g',
      calories: 200,
    })
    const nonMatch = makeFood({
      id: 'local-yogurt',
      name: 'Greek Yogurt',
      brand: null,
    })

    const merged = mergeFoodSearchResults(
      [localDuplicate, localCreamy, nonMatch],
      [remoteDuplicate, remotePowder],
      'peanut butter'
    )

    expect(merged.map(food => food.id)).toEqual([
      'remote-powder',
      'remote-peanut-butter',
      'local-creamy',
    ])
  })
})
