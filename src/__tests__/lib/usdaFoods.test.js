import { searchUsdaFoods, lookupUsdaBarcode } from '../../lib/usdaFoods'

function makeFetchOk(payload) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  })
}

function makeFetchFail(status = 500) {
  return vi.fn().mockResolvedValue({ ok: false, status })
}

function usdaFood(overrides = {}) {
  return {
    fdcId: 123456,
    description: 'Chicken Breast',
    dataType: 'SR Legacy',
    brandName: null,
    brandOwner: null,
    servingSize: 100,
    servingSizeUnit: 'g',
    foodNutrients: [
      { nutrientNumber: '208', value: 165 },
      { nutrientNumber: '203', value: 31 },
      { nutrientNumber: '205', value: 0 },
      { nutrientNumber: '204', value: 3.6 },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  global.fetch = makeFetchOk({ foods: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

it('does not throw at import time when the USDA API key is missing', async () => {
  vi.stubEnv('VITE_USDA_API_KEY', '')
  vi.resetModules()

  const mod = await import('../../lib/usdaFoods')

  expect(mod.searchUsdaFoods).toEqual(expect.any(Function))
  expect(mod.lookupUsdaBarcode).toEqual(expect.any(Function))
})

describe('searchUsdaFoods', () => {
  it('returns [] for an empty query without calling fetch', async () => {
    expect(await searchUsdaFoods('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns [] for an empty query when the USDA API key is missing', async () => {
    vi.stubEnv('VITE_USDA_API_KEY', '')

    expect(await searchUsdaFoods('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns [] for a whitespace-only query without calling fetch', async () => {
    expect(await searchUsdaFoods('   ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps a successful food response to the correct shape', async () => {
    global.fetch = makeFetchOk({ foods: [usdaFood()] })
    const results = await searchUsdaFoods('chicken')
    expect(results).toHaveLength(1)
    const food = results[0]
    expect(food.name).toBe('Chicken Breast')
    expect(food.source).toBe('usda')
    expect(food.remoteKey).toBe('usda:123456')
    expect(food.calories).toBe(165)
    expect(food.protein).toBe(31)
    expect(food.carbs).toBe(0)
    expect(food.serving_size).toBe(100)
    expect(food.serving_unit).toBe('g')
    expect(food.is_branded).toBe(false)
    expect(food.brand).toBeNull()
  })

  it('marks branded foods correctly and populates brand', async () => {
    global.fetch = makeFetchOk({
      foods: [usdaFood({ fdcId: 999, dataType: 'Branded', brandName: 'Quest' })],
    })
    const results = await searchUsdaFoods('protein bar')
    expect(results[0].is_branded).toBe(true)
    expect(results[0].brand).toBe('Quest')
  })

  it('falls back to brandOwner when brandName is absent', async () => {
    global.fetch = makeFetchOk({
      foods: [usdaFood({ brandName: null, brandOwner: 'General Mills', dataType: 'Branded' })],
    })
    const results = await searchUsdaFoods('cereal')
    expect(results[0].brand).toBe('General Mills')
    expect(results[0].is_branded).toBe(true)
  })

  it('defaults serving_size to 100 and unit to g when servingSize is 0', async () => {
    global.fetch = makeFetchOk({ foods: [usdaFood({ servingSize: 0 })] })
    const results = await searchUsdaFoods('chicken')
    expect(results[0].serving_size).toBe(100)
    expect(results[0].serving_unit).toBe('g')
  })

  it('estimates calories from macros when no calorie nutrient is present', async () => {
    global.fetch = makeFetchOk({
      foods: [usdaFood({
        foodNutrients: [
          { nutrientNumber: '203', value: 10 }, // protein → 40 kcal
          { nutrientNumber: '205', value: 20 }, // carbs  → 80 kcal
          { nutrientNumber: '204', value: 5 },  // fat    → 45 kcal
        ],
      })],
    })
    const results = await searchUsdaFoods('test food')
    expect(results[0].calories).toBe(165) // 10*4 + 20*4 + 5*9
  })

  it('falls back to labelNutrients when foodNutrients is empty', async () => {
    global.fetch = makeFetchOk({
      foods: [usdaFood({
        foodNutrients: [],
        labelNutrients: { calories: { value: 200 }, protein: { value: 15 } },
      })],
    })
    const results = await searchUsdaFoods('test')
    expect(results[0].calories).toBe(200)
  })

  it('resolves nutrients by name when nutrientNumber is absent', async () => {
    global.fetch = makeFetchOk({
      foods: [usdaFood({
        foodNutrients: [
          { nutrientName: 'Energy', value: 180 },
          { nutrientName: 'Protein', value: 22 },
          { nutrientName: 'Carbohydrate, by difference', value: 5 },
          { nutrientName: 'Total lipid (fat)', value: 8 },
        ],
      })],
    })
    const results = await searchUsdaFoods('test')
    expect(results[0].calories).toBe(180)
    expect(results[0].protein).toBe(22)
  })

  it('filters out foods that are missing fdcId', async () => {
    global.fetch = makeFetchOk({ foods: [{ description: 'No ID food' }] })
    const results = await searchUsdaFoods('test')
    expect(results).toHaveLength(0)
  })

  it('throws when the HTTP response is not ok', async () => {
    global.fetch = makeFetchFail(403)
    await expect(searchUsdaFoods('chicken')).rejects.toThrow('USDA search failed (403)')
  })

  it('throws a runtime config error before fetching when the USDA API key is missing', async () => {
    vi.stubEnv('VITE_USDA_API_KEY', '')

    await expect(searchUsdaFoods('chicken')).rejects.toThrow('USDA API key not configured.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('stops fetching additional queries once pageSize foods are collected', async () => {
    const foods = Array.from({ length: 24 }, (_, i) =>
      usdaFood({ fdcId: i + 1, description: `Food ${i + 1}` })
    )
    global.fetch = makeFetchOk({ foods })
    await searchUsdaFoods('chicken')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('deduplicates foods with the same remoteKey across multiple alias queries', async () => {
    const food = usdaFood()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ foods: [food] }),
    })
    // 'pb2' expands to 'peanut butter powder' producing multiple candidate queries
    const results = await searchUsdaFoods('pb2')
    const keys = results.map(f => f.remoteKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('throws the rate limit error when the hourly soft limit is exceeded', async () => {
    const future = Date.now() + 60 * 60 * 1000
    localStorage.setItem('usdaRequestBucket', JSON.stringify({ resetAt: future, count: 1000 }))
    await expect(searchUsdaFoods('chicken')).rejects.toThrow('USDA lookup limit')
  })

  it('returns [] immediately when the abort signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    global.fetch = vi.fn()
    const results = await searchUsdaFoods('chicken', { signal: controller.signal })
    expect(fetch).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })
})

describe('lookupUsdaBarcode', () => {
  it('returns null for an empty barcode without calling fetch', async () => {
    expect(await lookupUsdaBarcode('')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null for an invalid barcode when the USDA API key is missing', async () => {
    vi.stubEnv('VITE_USDA_API_KEY', '')

    expect(await lookupUsdaBarcode('---')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null for a barcode of only non-digit characters', async () => {
    expect(await lookupUsdaBarcode('---')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns null when the HTTP response is not ok', async () => {
    global.fetch = makeFetchFail(500)
    expect(await lookupUsdaBarcode('012345678905')).toBeNull()
  })

  it('returns null when no food in the response matches the barcode', async () => {
    global.fetch = makeFetchOk({
      foods: [{ ...usdaFood(), gtinUpc: '999999999999' }],
    })
    expect(await lookupUsdaBarcode('012345678905')).toBeNull()
  })

  it('matches gtinUpc after stripping leading zeros from both sides', async () => {
    global.fetch = makeFetchOk({
      foods: [{ ...usdaFood({ fdcId: 555 }), gtinUpc: '0012345678905' }],
    })
    const result = await lookupUsdaBarcode('012345678905')
    expect(result).not.toBeNull()
    expect(result.remoteKey).toBe('usda:555')
  })

  it('returns null when the foods array is empty', async () => {
    global.fetch = makeFetchOk({ foods: [] })
    expect(await lookupUsdaBarcode('012345678905')).toBeNull()
  })
})
