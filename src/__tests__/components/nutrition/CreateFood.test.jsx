import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { UserProvider } from '../../../context/UserContext.jsx'
import CreateFood from '../../../components/nutrition/CreateFood.jsx'
import { invalidateCache } from '../../../lib/cache'
import { searchOffFoods } from '../../../lib/offFoods'
import { searchUsdaFoods } from '../../../lib/usdaFoods'
import { buildFoodPayload } from '../../../lib/foodEditor'

const supabaseMock = vi.hoisted(() => {
  const state = {
    insertResponse: { data: { id: 'food-new', name: 'Saved Food' }, error: null },
    tableResponses: new Map(),
    inserts: [],
    updates: [],
  }

  function responseFor(table) {
    const response = state.tableResponses.get(table)
    return Promise.resolve(response || { data: [], error: null })
  }

  function createQuery(table) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      insert: vi.fn(payload => {
        state.inserts.push({ table, payload })
        return query
      }),
      update: vi.fn(payload => {
        state.updates.push({ table, payload })
        return query
      }),
      delete: vi.fn(() => query),
      single: vi.fn(() => Promise.resolve(state.insertResponse)),
      then: (onFulfilled, onRejected) => responseFor(table).then(onFulfilled, onRejected),
      catch: onRejected => responseFor(table).catch(onRejected),
    }
    return query
  }

  return {
    state,
    from: vi.fn(table => createQuery(table)),
  }
})

const cacheMock = vi.hoisted(() => ({
  store: new Map(),
  getCached: vi.fn(key => cacheMock.store.get(key) ?? null),
  setCached: vi.fn((key, value) => cacheMock.store.set(key, value)),
  invalidateCache: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}))

vi.mock('../../../lib/cache', () => cacheMock)

vi.mock('../../../lib/usdaFoods', () => ({
  searchUsdaFoods: vi.fn(),
}))

vi.mock('../../../lib/offFoods', () => ({
  searchOffFoods: vi.fn(),
}))

vi.mock('../../../lib/foodSearch', () => ({
  buildFoodSearchKey: food => food.id || food.remoteKey || food.name,
  mergeFoodSearchResults: (localFoods, remoteFoods) => [...localFoods, ...remoteFoods],
  normalizeSearchValue: value => value.trim().toLowerCase(),
}))

vi.mock('../../../lib/foodEditor', async () => {
  const actual = await vi.importActual('../../../lib/foodEditor')
  return {
    ...actual,
    buildFoodPayload: vi.fn((form, userId) => ({
      user_id: userId,
      name: form.name.trim(),
      calories: Number(form.calories),
      serving_size: Number(form.serving_size),
      serving_unit: form.serving_unit,
    })),
  }
})

function renderCreateFood({ user = { id: 'user-1' }, ...props } = {}) {
  return render(
    <UserProvider user={user}>
      <CreateFood onSave={vi.fn()} onBack={vi.fn()} {...props} />
    </UserProvider>,
  )
}

function fillSingleFoodForm(container, values = {}) {
  const inputs = container.querySelectorAll('.cf-input')
  fireEvent.change(inputs[0], { target: { value: values.name ?? 'Chicken Breast' } })
  fireEvent.change(inputs[2], { target: { value: values.servingSize ?? '100' } })
  fireEvent.change(inputs[3], { target: { value: values.calories ?? '165' } })
  if (values.protein) fireEvent.change(inputs[4], { target: { value: values.protein } })
}

beforeEach(() => {
  cacheMock.store.clear()
  supabaseMock.state.tableResponses.clear()
  supabaseMock.state.inserts = []
  supabaseMock.state.updates = []
  supabaseMock.state.insertResponse = { data: { id: 'food-new', name: 'Saved Food' }, error: null }
  searchUsdaFoods.mockResolvedValue([])
  searchOffFoods.mockResolvedValue([])
})

describe('CreateFood', () => {
  it('validates single-food nutrition fields before saving', async () => {
    const { container } = renderCreateFood()
    fillSingleFoodForm(container, { calories: '-1' })

    fireEvent.click(screen.getByText('Save Food'))

    await waitFor(() => {
      expect(container.querySelector('.cf-error')?.textContent).toContain('Calories')
    })
    expect(supabaseMock.from).not.toHaveBeenCalledWith('foods')
  })

  it('saves a valid single food, invalidates food caches, and calls onSave', async () => {
    const onSave = vi.fn()
    const { container } = renderCreateFood({ onSave })
    fillSingleFoodForm(container, { protein: '31' })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Food'))
    })

    expect(buildFoodPayload).toHaveBeenCalledWith(expect.objectContaining({ name: 'Chicken Breast' }), 'user-1')
    expect(supabaseMock.state.inserts[0]).toEqual({
      table: 'foods',
      payload: expect.objectContaining({ user_id: 'user-1', name: 'Chicken Breast' }),
    })
    expect(invalidateCache).toHaveBeenCalledWith('recent_foods:user-1', 'user_foods:user-1')
    expect(onSave).toHaveBeenCalledWith({ id: 'food-new', name: 'Saved Food' })
  })

  it('toggles micronutrients in food mode', () => {
    const { container } = renderCreateFood()

    expect(container.textContent).not.toContain('Vitamin B12')
    fireEvent.click(screen.getByText(/Micronutrients/))

    expect(container.textContent).toContain('Vitamin B12')
  })

  it('keeps recipe save disabled until an ingredient is added', async () => {
    renderCreateFood({ initialMode: 'recipe' })

    await act(async () => { await Promise.resolve() })

    expect(screen.getByText('Save Recipe').disabled).toBe(true)
    expect(screen.getByText('Add ingredients to build your recipe')).toBeTruthy()
    // The Food/Recipe mode toggle has been removed — entry mode is fixed by the prop.
    expect(screen.queryByText('Single Food')).toBeNull()
  })

  it('uses cached ingredient search results, adds/removes an ingredient, and shows recipe totals', async () => {
    cacheMock.store.set('user_foods:user-1', [])
    cacheMock.store.set('recent_foods:user-1', [])
    cacheMock.store.set('usda_food_search:oats', Array.from({ length: 10 }, (_, index) => ({
      id: `oats-${index}`,
      name: index === 0 ? 'Oats' : `Oats ${index}`,
      brand: 'USDA',
      serving_size: 100,
      serving_unit: 'g',
      calories: 300,
      protein: 10,
      carbs: 50,
      fat: 5,
      fiber: 8,
    })))

    const { container } = renderCreateFood({ initialMode: 'recipe' })

    const inputs = container.querySelectorAll('.cf-input')
    fireEvent.change(inputs[0], { target: { value: 'Overnight Oats' } })
    fireEvent.change(screen.getByPlaceholderText('Search foods to add...'), { target: { value: 'oats' } })

    await waitFor(() => {
      expect(screen.getByText('Oats')).toBeTruthy()
    })
    expect(searchUsdaFoods).not.toHaveBeenCalled()
    expect(searchOffFoods).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Oats'))
    fireEvent.click(screen.getByText('Add Ingredient'))

    expect(container.textContent).toContain('Per Serving')
    expect(container.textContent).toContain('Whole Recipe')
    expect(container.textContent).toContain('300')
    expect(screen.getByText('Save Recipe').disabled).toBe(false)

    fireEvent.click(screen.getByText('Remove'))
    expect(screen.getByText('Add ingredients to build your recipe')).toBeTruthy()
  })

  it('saves a recipe payload with per-serving totals', async () => {
    cacheMock.store.set('user_foods:user-1', [{
      id: 'food-1',
      name: 'Rice',
      serving_size: 100,
      serving_unit: 'g',
      calories: 200,
      protein: 4,
      carbs: 44,
      fat: 1,
    }])
    cacheMock.store.set('recent_foods:user-1', [])
    const onSave = vi.fn()
    const { container } = renderCreateFood({ onSave, initialMode: 'recipe' })

    const inputs = container.querySelectorAll('.cf-input')
    fireEvent.change(inputs[0], { target: { value: 'Rice Bowl' } })
    fireEvent.change(screen.getByPlaceholderText('Search foods to add...'), { target: { value: 'rice' } })

    await waitFor(() => {
      expect(screen.getByText('Rice')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Rice'))
    fireEvent.click(screen.getByText('Add Ingredient'))

    await act(async () => {
      fireEvent.click(screen.getByText('Save Recipe'))
    })

    expect(supabaseMock.state.inserts[0].table).toBe('recipes')
    expect(supabaseMock.state.inserts[0].payload).toEqual(expect.objectContaining({
      user_id: 'user-1',
      name: 'Rice Bowl',
      servings: 1,
      calories: 200,
    }))
    expect(supabaseMock.state.inserts[0].payload.ingredients).toHaveLength(1)
    expect(supabaseMock.state.inserts[0].payload.ingredients[0]).toEqual(expect.objectContaining({
      food_id: 'food-1',
      name: 'Rice',
    }))
    expect(onSave).toHaveBeenCalledWith({ id: 'food-new', name: 'Saved Food' })
  })

  it('updates an existing recipe instead of inserting when given a recipe prop', async () => {
    const onSave = vi.fn()
    const recipe = {
      id: 'recipe-1',
      name: 'Existing Bowl',
      servings: 2,
      calories: 150,
      protein: 5,
      ingredients: [{
        food_id: 'food-1',
        name: 'Rice',
        brand: null,
        serving_size: 100,
        serving_unit: 'g',
        amountMode: 'direct',
        amount: 100,
        amountUnit: 'g',
        servings: 1,
        calories: 200,
        protein: 4,
        carbs: 44,
        fat: 1,
      }],
    }
    renderCreateFood({ onSave, recipe })

    // Edit mode opens straight into the recipe editor with the existing data hydrated.
    expect(screen.getByText('Edit Recipe')).toBeTruthy()
    expect(screen.getByText('Save Changes')).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'))
    })

    expect(supabaseMock.state.inserts).toHaveLength(0)
    expect(supabaseMock.state.updates[0].table).toBe('recipes')
    expect(supabaseMock.state.updates[0].payload).toEqual(expect.objectContaining({
      user_id: 'user-1',
      name: 'Existing Bowl',
      servings: 2,
    }))
    expect(onSave).toHaveBeenCalled()
  })
})
