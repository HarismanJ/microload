import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { UserProvider } from '../../../context/UserContext.jsx'
import NutritionFoodPicker from '../../../components/nutrition/NutritionFoodPicker.jsx'
import { setCached, clearCache } from '../../../lib/cache'

const supabaseMock = vi.hoisted(() => {
  const state = { deletes: [] }
  return {
    state,
    from: vi.fn(table => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        not: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        delete: vi.fn(() => { state.deletes.push({ table }); return query }),
        then: onFulfilled => Promise.resolve({ data: [], error: null }).then(onFulfilled),
      }
      return query
    }),
  }
})

const recipesMock = vi.hoisted(() => ({ rows: [], deleteRecipe: vi.fn(() => Promise.resolve()) }))

vi.mock('../../../lib/supabase.js', () => ({ supabase: supabaseMock }))
vi.mock('../../../lib/admob.js', () => ({ showRewardedAd: vi.fn(() => Promise.resolve(true)) }))

vi.mock('../../../lib/recipes', async () => {
  const actual = await vi.importActual('../../../lib/recipes')
  return {
    ...actual,
    listRecipes: vi.fn(() => Promise.resolve(recipesMock.rows)),
    deleteRecipe: (...args) => recipesMock.deleteRecipe(...args),
  }
})

const sampleRecipe = {
  id: 'recipe-1',
  name: 'Power Bowl',
  servings: 2,
  calories: 321,
  protein: 20,
  carbs: 30,
  fat: 10,
  fiber: 6,
  sodium: 250,
  ingredients: [],
}

function renderPicker(props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <NutritionFoodPicker onAdd={vi.fn()} onClose={vi.fn()} {...props} />
    </UserProvider>,
  )
}

beforeEach(() => {
  clearCache()
  recipesMock.rows = []
  recipesMock.deleteRecipe.mockClear()
  supabaseMock.state.deletes = []
})

describe('NutritionFoodPicker recipes', () => {
  it('lists recipes in the My Recipes dropdown and logs one as N servings via onAdd', async () => {
    recipesMock.rows = [sampleRecipe]
    const onAdd = vi.fn()
    renderPicker({ onAdd })

    // Expand the recipes dropdown and pick the recipe.
    const toggle = await screen.findByRole('button', { name: /My Recipes/i })
    fireEvent.click(toggle)
    fireEvent.click(await screen.findByText(/Power Bowl/))

    // Recipe log view: per-serving snapshot (macros + micros) + servings input.
    expect(screen.getByText('Per serving')).toBeTruthy()
    expect(screen.getByText('Protein')).toBeTruthy()
    expect(screen.getByText('More Nutrition')).toBeTruthy()
    expect(screen.getByText('Fiber')).toBeTruthy()
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to Log' }))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Power Bowl', isRecipe: true, serving_unit: 'serving', id: null }),
        2,
      )
    })
  })

  it('shows an empty state when there are no recipes', async () => {
    recipesMock.rows = []
    renderPicker()

    fireEvent.click(await screen.findByRole('button', { name: /My Recipes/i }))
    expect(await screen.findByText(/No recipes yet/)).toBeTruthy()
  })

  it('deletes a recipe after confirming and returns to browse', async () => {
    recipesMock.rows = [sampleRecipe]
    renderPicker()

    fireEvent.click(await screen.findByRole('button', { name: /My Recipes/i }))
    fireEvent.click(await screen.findByText(/Power Bowl/))

    fireEvent.click(screen.getByText('Delete recipe'))
    fireEvent.click(screen.getByText('Delete')) // confirm

    await waitFor(() => {
      expect(recipesMock.deleteRecipe).toHaveBeenCalledWith('recipe-1', 'user-1')
    })
    // Back on the browse view (search input is present again)
    expect(screen.getByPlaceholderText('Search foods...')).toBeTruthy()
  })

  it('shows Delete on an owned food and issues a foods delete on confirm', async () => {
    setCached('user_foods:user-1', [
      { id: 'food-1', user_id: 'user-1', name: 'My Food', serving_size: 100, serving_unit: 'g', calories: 100 },
    ], 60_000)
    renderPicker()

    fireEvent.click(await screen.findByRole('button', { name: /Saved Foods/i }))
    fireEvent.click(await screen.findByText('My Food'))

    fireEvent.click(screen.getByText('Delete food'))
    fireEvent.click(screen.getByText('Delete')) // confirm

    await waitFor(() => {
      expect(supabaseMock.state.deletes.some(op => op.table === 'foods')).toBe(true)
    })
  })

  it('does not show Delete for a food the user does not own', async () => {
    setCached('user_foods:user-1', [
      { id: 'food-2', user_id: 'someone-else', name: 'Borrowed Food', serving_size: 100, serving_unit: 'g', calories: 100 },
    ], 60_000)
    renderPicker()

    fireEvent.click(await screen.findByRole('button', { name: /Saved Foods/i }))
    fireEvent.click(await screen.findByText('Borrowed Food'))

    expect(screen.queryByText('Delete food')).toBeNull()
  })
})
