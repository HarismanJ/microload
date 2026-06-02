import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMock = vi.hoisted(() => {
  const state = {
    listResponse: { data: [], error: null },
    singleResponse: { data: { id: 'recipe-1' }, error: null },
    deleteResponse: { error: null },
    ops: [],
  }

  function createQuery(table) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => Promise.resolve(state.listResponse)),
      insert: vi.fn(payload => { state.ops.push({ table, type: 'insert', payload }); return query }),
      update: vi.fn(payload => { state.ops.push({ table, type: 'update', payload }); return query }),
      delete: vi.fn(() => { state.ops.push({ table, type: 'delete' }); return query }),
      single: vi.fn(() => Promise.resolve(state.singleResponse)),
      then: (onF, onR) => Promise.resolve(state.deleteResponse).then(onF, onR),
      catch: onR => Promise.resolve(state.deleteResponse).catch(onR),
    }
    return query
  }

  return { state, from: vi.fn(table => createQuery(table)) }
})

const cacheMock = vi.hoisted(() => ({
  store: new Map(),
  getCached: vi.fn(key => cacheMock.store.get(key) ?? null),
  setCached: vi.fn((key, value) => cacheMock.store.set(key, value)),
  invalidateCache: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({ supabase: { from: supabaseMock.from } }))
vi.mock('../../lib/cache', () => cacheMock)

const {
  serializeIngredient,
  hydrateIngredient,
  hydrateRecipeIngredients,
  buildRecipePayload,
  recipeToLoggableFood,
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} = await import('../../lib/recipes')
const { buildScaledNutrients } = await import('../../lib/recipeMath')

const riceFood = {
  id: 'food-1',
  name: 'Rice',
  brand: null,
  serving_size: 100,
  serving_unit: 'g',
  calories: 200,
  protein: 4,
  carbs: 44,
  fat: 1,
}

function riceEntry() {
  return {
    id: 'food-1:0',
    food: riceFood,
    amountMode: 'direct',
    amount: 50,
    amountUnit: 'g',
    servings: 1,
    multiplier: 0.5,
    nutrients: buildScaledNutrients(riceFood, 0.5),
  }
}

beforeEach(() => {
  cacheMock.store.clear()
  cacheMock.getCached.mockClear()
  cacheMock.setCached.mockClear()
  cacheMock.invalidateCache.mockClear()
  supabaseMock.from.mockClear()
  supabaseMock.state.ops = []
  supabaseMock.state.listResponse = { data: [], error: null }
  supabaseMock.state.singleResponse = { data: { id: 'recipe-1' }, error: null }
  supabaseMock.state.deleteResponse = { error: null }
})

describe('recipes adapters', () => {
  it('round-trips an ingredient through serialize/hydrate and recomputes scaled nutrients', () => {
    const stored = serializeIngredient(riceEntry())
    expect(stored).toEqual(expect.objectContaining({
      food_id: 'food-1',
      name: 'Rice',
      serving_size: 100,
      serving_unit: 'g',
      amountMode: 'direct',
      amount: 50,
      calories: 200, // base per-serving snapshot
    }))

    const hydrated = hydrateIngredient(stored, 0)
    expect(hydrated.food.id).toBe('food-1')
    expect(hydrated.amount).toBe(50)
    expect(hydrated.multiplier).toBe(0.5)
    expect(hydrated.nutrients.calories).toBe(100) // scaled by 0.5
  })

  it('hydrateRecipeIngredients handles missing/invalid ingredient arrays', () => {
    expect(hydrateRecipeIngredients({})).toEqual([])
    expect(hydrateRecipeIngredients({ ingredients: null })).toEqual([])
    expect(hydrateRecipeIngredients({ ingredients: [serializeIngredient(riceEntry())] })).toHaveLength(1)
  })

  it('buildRecipePayload includes name, yield, serialized ingredients, and per-serving snapshot', () => {
    const payload = buildRecipePayload('user-1', { name: '  Rice Bowl  ', servings: '2' }, [riceEntry()])
    expect(payload).toEqual(expect.objectContaining({
      user_id: 'user-1',
      name: 'Rice Bowl',
      servings: 2,
    }))
    expect(payload.ingredients).toHaveLength(1)
    expect(payload.calories).toBe(50) // 100 scaled / 2 servings
  })

  it('recipeToLoggableFood yields a food-shaped object with null id and serving unit', () => {
    const food = recipeToLoggableFood({ id: 'recipe-9', name: 'Bowl', calories: 321, protein: 12 })
    expect(food).toEqual(expect.objectContaining({
      id: null,
      recipe_id: 'recipe-9',
      name: 'Bowl',
      serving_size: 1,
      serving_unit: 'serving',
      isRecipe: true,
      calories: 321,
      protein: 12,
    }))
  })
})

describe('recipes CRUD', () => {
  it('listRecipes returns cached rows without querying', async () => {
    cacheMock.store.set('recipes:user-1', [{ id: 'cached' }])
    const rows = await listRecipes('user-1')
    expect(rows).toEqual([{ id: 'cached' }])
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('listRecipes queries and caches on a miss', async () => {
    supabaseMock.state.listResponse = { data: [{ id: 'recipe-1' }], error: null }
    const rows = await listRecipes('user-1')
    expect(rows).toEqual([{ id: 'recipe-1' }])
    expect(supabaseMock.from).toHaveBeenCalledWith('recipes')
    expect(cacheMock.setCached).toHaveBeenCalledWith('recipes:user-1', [{ id: 'recipe-1' }], expect.any(Number))
  })

  it('listRecipes short-circuits with no userId', async () => {
    expect(await listRecipes(null)).toEqual([])
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('createRecipe inserts, invalidates cache, and returns the row', async () => {
    const data = await createRecipe({ user_id: 'user-1', name: 'Bowl' })
    expect(supabaseMock.state.ops[0]).toEqual(expect.objectContaining({ table: 'recipes', type: 'insert' }))
    expect(cacheMock.invalidateCache).toHaveBeenCalledWith('recipes:user-1')
    expect(data).toEqual({ id: 'recipe-1' })
  })

  it('updateRecipe updates and invalidates cache', async () => {
    await updateRecipe('recipe-1', 'user-1', { name: 'New' })
    expect(supabaseMock.state.ops[0]).toEqual(expect.objectContaining({ table: 'recipes', type: 'update' }))
    expect(cacheMock.invalidateCache).toHaveBeenCalledWith('recipes:user-1')
  })

  it('deleteRecipe deletes and invalidates cache', async () => {
    await deleteRecipe('recipe-1', 'user-1')
    expect(supabaseMock.state.ops[0]).toEqual(expect.objectContaining({ table: 'recipes', type: 'delete' }))
    expect(cacheMock.invalidateCache).toHaveBeenCalledWith('recipes:user-1')
  })
})
