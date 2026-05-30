import { mapOffFood, searchOffFoods } from '../../lib/offFoods'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search'

function makeFetchOk(payload) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  })
}

function makeFetchFail(status = 500) {
  return vi.fn().mockResolvedValue({ ok: false, status })
}

function offProduct(overrides = {}) {
  return {
    _id: 'p-1',
    code: 'p-1',
    product_name: 'Chicken Breast',
    brands: '',
    nutriments: {
      'energy-kcal_100g': 165,
      'proteins_100g': 31,
      'carbohydrates_100g': 0,
      'fat_100g': 3.6,
    },
    ...overrides,
  }
}

beforeEach(() => {
  global.fetch = makeFetchOk({ products: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─── mapOffFood (pure mapper) ─────────────────────────────────────────────

describe('mapOffFood', () => {
  it('returns null for null or undefined input', () => {
    expect(mapOffFood(null)).toBeNull()
    expect(mapOffFood(undefined)).toBeNull()
  })

  it('returns null when product_name is missing', () => {
    expect(mapOffFood(offProduct({ product_name: undefined }))).toBeNull()
  })

  it('returns null when product_name is an empty or whitespace string', () => {
    expect(mapOffFood(offProduct({ product_name: '' }))).toBeNull()
    expect(mapOffFood(offProduct({ product_name: '   ' }))).toBeNull()
  })

  it('returns null when all id fields are missing', () => {
    expect(mapOffFood(offProduct({ _id: undefined, id: undefined, code: undefined }))).toBeNull()
  })

  it('falls back from _id → id → code for the remoteKey', () => {
    expect(mapOffFood(offProduct({ _id: undefined, id: undefined, code: 'fallback-id' })).remoteKey)
      .toBe('off:fallback-id')
    expect(mapOffFood(offProduct({ _id: undefined, id: 'mid-id', code: 'low-id' })).remoteKey)
      .toBe('off:mid-id')
  })

  it('maps a minimal _100g product to the expected base shape', () => {
    const food = mapOffFood(offProduct())
    expect(food).toMatchObject({
      id: null,
      remoteKey: 'off:p-1',
      source: 'off',
      data_type: '',
      is_branded: false,
      name: 'Chicken Breast',
      brand: null,
      serving_size: 100,
      serving_unit: 'g',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
    })
  })

  it('uses the _serving suffix when energy-kcal_serving is present', () => {
    const food = mapOffFood(offProduct({
      serving_quantity: 50,
      serving_quantity_unit: 'g',
      nutriments: {
        'energy-kcal_serving': 80,
        'energy-kcal_100g': 160, // should be ignored in favour of _serving
        'proteins_serving': 12,
        'carbohydrates_serving': 5,
        'fat_serving': 2,
      },
    }))
    expect(food.calories).toBe(80)
    expect(food.protein).toBe(12)
    expect(food.serving_size).toBe(50)
  })

  it('uses the _serving suffix when proteins_serving is present even without energy-kcal_serving', () => {
    const food = mapOffFood(offProduct({
      serving_quantity: 30,
      nutriments: {
        'proteins_serving': 5,
        'energy-kcal_100g': 200, // suffix lookup is _serving, so this is ignored
      },
    }))
    expect(food.protein).toBe(5)
    expect(food.calories).toBe(20) // 5*4 + 0*4 + 0*9 = 20 (estimated, since energy-kcal_serving missing)
    expect(food.serving_size).toBe(30)
  })

  it('defaults serving size to 100g when no serving fields are present', () => {
    const food = mapOffFood(offProduct({
      serving_quantity: 999, // ignored because no _serving nutrients
      nutriments: { 'energy-kcal_100g': 100, 'proteins_100g': 10 },
    }))
    expect(food.serving_size).toBe(100)
    expect(food.serving_unit).toBe('g')
  })

  it('falls back from _serving to bare nutrient key when only the bare key is present', () => {
    // offNutrient: if _serving key absent, falls back to nutrients[key] ?? 0
    const food = mapOffFood(offProduct({
      nutriments: {
        'proteins_serving': 20, // triggers _serving suffix
        'energy-kcal': 100,     // bare key as fallback for kcal lookup
      },
    }))
    expect(food.protein).toBe(20)
    expect(food.calories).toBe(100)
  })

  it('returns 0 for missing nutrients', () => {
    const food = mapOffFood(offProduct({ nutriments: {} }))
    expect(food.protein).toBe(0)
    expect(food.carbs).toBe(0)
    expect(food.fat).toBe(0)
    expect(food.fiber).toBe(0)
    expect(food.sugar).toBe(0)
    expect(food.sodium).toBe(0)
  })

  it('estimates calories from macros when energy-kcal is 0', () => {
    const food = mapOffFood(offProduct({
      nutriments: {
        'energy-kcal_100g': 0,
        'proteins_100g': 10,        //  40 kcal
        'carbohydrates_100g': 20,   //  80 kcal
        'fat_100g': 5,              //  45 kcal
      },
    }))
    expect(food.calories).toBe(165)
  })

  it('uses real calories when energy-kcal > 0 even if macros would estimate differently', () => {
    const food = mapOffFood(offProduct({
      nutriments: {
        'energy-kcal_100g': 100,
        'proteins_100g': 50, // would be 200 kcal by estimate, but ignored
      },
    }))
    expect(food.calories).toBe(100)
  })

  it('multiplies mineral grams by 1000 to store mg', () => {
    const food = mapOffFood(offProduct({
      nutriments: {
        'energy-kcal_100g': 100,
        'sodium_100g': 1,        // 1 g → 1000 mg
        'potassium_100g': 0.5,   // 0.5 g → 500 mg
        'calcium_100g': 0.2,     // 0.2 g → 200 mg
      },
    }))
    expect(food.sodium).toBe(1000)
    expect(food.potassium).toBe(500)
    expect(food.calcium).toBe(200)
  })

  it('multiplies vitamin_b6 grams by 1000 (mg), b12 by 1e6 (mcg), folate by 1e6 (mcg)', () => {
    const food = mapOffFood(offProduct({
      nutriments: {
        'energy-kcal_100g': 100,
        'vitamin-b6_100g': 0.002,    // 0.002 g → 2 mg
        'vitamin-b12_100g': 0.000002, // 0.000002 g → 2 mcg
        'folates_100g': 0.0001,       // 0.0001 g → 100 mcg
      },
    }))
    expect(food.vitamin_b6).toBeCloseTo(2, 5)
    expect(food.vitamin_b12).toBeCloseTo(2, 5)
    expect(food.folate).toBe(100)
  })

  it('does not multiply vitamins A, C, D by 1000 (raw value pass-through)', () => {
    const food = mapOffFood(offProduct({
      nutriments: {
        'energy-kcal_100g': 100,
        'vitamin-a_100g': 50,
        'vitamin-c_100g': 60,
        'vitamin-d_100g': 5,
      },
    }))
    expect(food.vitamin_a).toBe(50)
    expect(food.vitamin_c).toBe(60)
    expect(food.vitamin_d).toBe(5)
  })

  it('parses brand as the first comma-split entry, trimmed', () => {
    const food = mapOffFood(offProduct({ brands: '  Quest  , Whey King ' }))
    expect(food.brand).toBe('Quest')
    expect(food.is_branded).toBe(true)
    expect(food.data_type).toBe('Branded')
  })

  it('treats an empty brands string as no brand', () => {
    const food = mapOffFood(offProduct({ brands: '' }))
    expect(food.brand).toBeNull()
    expect(food.is_branded).toBe(false)
    expect(food.data_type).toBe('')
  })

  it('treats a missing brands field as no brand', () => {
    const food = mapOffFood(offProduct({ brands: undefined }))
    expect(food.brand).toBeNull()
    expect(food.is_branded).toBe(false)
  })

  it('trims surrounding whitespace from the product_name', () => {
    const food = mapOffFood(offProduct({ product_name: '   Greek Yogurt   ' }))
    expect(food.name).toBe('Greek Yogurt')
  })

  it('clamps numeric nutrient overshoots without throwing (clamp gate active)', () => {
    const food = mapOffFood(offProduct({
      nutriments: {
        'energy-kcal_100g': 99999999, // far over the calories ceiling
        'proteins_100g': 99999,
      },
    }))
    expect(Number.isFinite(food.calories)).toBe(true)
    expect(Number.isFinite(food.protein)).toBe(true)
    expect(food.calories).toBeGreaterThan(0)
  })

  it('lowercases and trims a custom serving_quantity_unit when _serving suffix is in use', () => {
    const food = mapOffFood(offProduct({
      serving_quantity: 30,
      serving_quantity_unit: '  ML  ',
      nutriments: { 'proteins_serving': 0 },
    }))
    expect(food.serving_unit).toBe('ml')
  })
})

// ─── searchOffFoods (fetch-driven) ─────────────────────────────────────────

describe('searchOffFoods', () => {
  it('returns [] without calling fetch for an empty query', async () => {
    expect(await searchOffFoods('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns [] without calling fetch for a whitespace-only query', async () => {
    expect(await searchOffFoods('   ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns [] without calling fetch for null or undefined queries', async () => {
    expect(await searchOffFoods(null)).toEqual([])
    expect(await searchOffFoods(undefined)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps a successful product list to mapped foods', async () => {
    global.fetch = makeFetchOk({
      products: [
        offProduct({ _id: 'a', product_name: 'Yogurt' }),
        offProduct({ _id: 'b', product_name: 'Apple' }),
      ],
    })
    const results = await searchOffFoods('snack')
    expect(results).toHaveLength(2)
    expect(results[0].remoteKey).toBe('off:a')
    expect(results[1].remoteKey).toBe('off:b')
  })

  it('throws when the HTTP response is not ok', async () => {
    global.fetch = makeFetchFail(503)
    await expect(searchOffFoods('chicken')).rejects.toThrow('OpenFoodFacts search failed (503)')
  })

  it('returns [] when the products payload is empty', async () => {
    global.fetch = makeFetchOk({ products: [] })
    expect(await searchOffFoods('chicken')).toEqual([])
  })

  it('returns [] when the payload omits the products array entirely', async () => {
    global.fetch = makeFetchOk({})
    expect(await searchOffFoods('chicken')).toEqual([])
  })

  it('filters out products that fail to map (no name, no id, etc.)', async () => {
    global.fetch = makeFetchOk({
      products: [
        offProduct({ _id: 'good', product_name: 'Good Food' }),
        offProduct({ _id: undefined, id: undefined, code: undefined, product_name: 'No ID' }),
        offProduct({ _id: 'noname', product_name: '' }),
      ],
    })
    const results = await searchOffFoods('food')
    expect(results).toHaveLength(1)
    expect(results[0].remoteKey).toBe('off:good')
  })

  it('deduplicates products that map to the same remoteKey', async () => {
    global.fetch = makeFetchOk({
      products: [
        offProduct({ _id: 'dup', product_name: 'First' }),
        offProduct({ _id: 'dup', product_name: 'Duplicate' }),
      ],
    })
    const results = await searchOffFoods('food')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('First')
  })

  it('clamps pageSize to [1, 50] in the request URL', async () => {
    global.fetch = makeFetchOk({ products: [] })
    await searchOffFoods('chicken', { pageSize: 999 })
    const url1 = fetch.mock.calls[0][0]
    expect(url1).toContain('page_size=50')

    global.fetch = makeFetchOk({ products: [] })
    await searchOffFoods('chicken', { pageSize: 0 })
    const url2 = fetch.mock.calls[0][0]
    expect(url2).toContain('page_size=1')

    global.fetch = makeFetchOk({ products: [] })
    await searchOffFoods('chicken', { pageSize: 25 })
    const url3 = fetch.mock.calls[0][0]
    expect(url3).toContain('page_size=25')
  })

  it('defaults pageSize to 20 when omitted', async () => {
    global.fetch = makeFetchOk({ products: [] })
    await searchOffFoods('chicken')
    expect(fetch.mock.calls[0][0]).toContain('page_size=20')
  })

  it('uses the correct OpenFoodFacts URL and encodes the query', async () => {
    global.fetch = makeFetchOk({ products: [] })
    await searchOffFoods('peanut butter')
    const url = fetch.mock.calls[0][0]
    expect(url.startsWith(OFF_SEARCH_URL)).toBe(true)
    expect(url).toContain('search_terms=peanut+butter')
  })

  it('passes the AbortSignal through to fetch', async () => {
    global.fetch = makeFetchOk({ products: [] })
    const controller = new AbortController()
    await searchOffFoods('chicken', { signal: controller.signal })
    const opts = fetch.mock.calls[0][1]
    expect(opts.signal).toBe(controller.signal)
  })
})
