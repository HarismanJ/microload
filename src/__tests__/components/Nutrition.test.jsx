import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCache } from '../../lib/cache.js'
import { UserProvider } from '../../context/UserContext.jsx'
import Nutrition from '../../components/Nutrition.jsx'

const supabaseMock = vi.hoisted(() => {
  const state = {
    responses: new Map(),
    defaultResponse: Promise.resolve({ data: [], error: null }),
  }

  function tableResponse(table) {
    const response = state.responses.get(table)
    return typeof response === 'function'
      ? response()
      : response || state.defaultResponse
  }

  function createQuery(table) {
    let promise = null
    const getPromise = () => {
      if (!promise) promise = Promise.resolve(tableResponse(table))
      return promise
    }

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      order: vi.fn(() => query),
      single: vi.fn(() => getPromise()),
      then: (onFulfilled, onRejected) => getPromise().then(onFulfilled, onRejected),
      catch: onRejected => getPromise().catch(onRejected),
      finally: onFinally => getPromise().finally(onFinally),
    }

    return query
  }

  return {
    state,
    from: vi.fn(table => createQuery(table)),
  }
})

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}))

vi.mock('../../components/nutrition/NutritionFoodPicker.jsx', () => ({
  default: () => <div>Add food</div>,
}))

function renderNutrition() {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <Nutrition />
    </UserProvider>,
  )
}

beforeEach(() => {
  clearCache()
  supabaseMock.state.responses.clear()
  supabaseMock.state.defaultResponse = Promise.resolve({ data: [], error: null })
})

describe('Nutrition calories remaining', () => {
  it('does not add workout calories burned back into calories remaining', async () => {
    supabaseMock.state.responses.set('nutrition_logs', Promise.resolve({
      data: [
        {
          id: 'log-1',
          created_at: '2026-05-28T12:00:00.000Z',
          food_name: 'Chicken and rice',
          servings: 1,
          calories: 800,
          protein: 50,
          carbs: 90,
          fat: 18,
        },
      ],
      error: null,
    }))
    supabaseMock.state.responses.set('profiles', Promise.resolve({
      data: {
        calories_goal: 2200,
        protein_goal: 160,
        carbs_goal: 240,
        fat_goal: 70,
      },
      error: null,
    }))
    supabaseMock.state.responses.set('workout_sessions', Promise.resolve({
      data: [{ calories_burned: 400 }],
      error: null,
    }))

    renderNutrition()

    await waitFor(() => {
      expect(screen.getByText('1400 kcal remaining')).toBeTruthy()
    })
    expect(screen.getByText('~400 kcal burned today')).toBeTruthy()
    expect(screen.queryByText('1800 kcal remaining')).toBeNull()
  })
})
