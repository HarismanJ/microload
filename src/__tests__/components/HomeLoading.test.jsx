import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'

import { clearCache, setCached } from '../../lib/cache.js'
import { UserProvider } from '../../context/UserContext.jsx'
import Home from '../../components/Home.jsx'

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
      lt: vi.fn(() => query),
      lte: vi.fn(() => query),
      order: vi.fn(() => query),
      insert: vi.fn(() => query),
      update: vi.fn(() => query),
      delete: vi.fn(() => query),
      single: vi.fn(() => getPromise()),
      maybeSingle: vi.fn(() => getPromise()),
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

vi.mock('../../lib/muscleWorkload.js', () => ({
  MUSCLE_WORKLOAD_GROUPS: [],
  applyMuscleWorkloadGoal: vi.fn(workload => workload),
  fetchWeeklyMuscleWorkload: vi.fn(() => Promise.resolve({
    groups: [],
    trainedGroupCount: 0,
    week: { label: 'This week' },
  })),
  getLocalTrainingWeekRange: vi.fn(() => ({
    startIso: '2026-05-11T00:00:00.000Z',
  })),
}))

vi.mock('../../lib/overtrain.js', () => ({
  detectOvertrain: vi.fn(() => null),
}))

vi.mock('../../components/profile/WorkoutCalendar.jsx', () => ({
  default: function MockWorkoutCalendar({ onInitialLoadComplete }) {
    useEffect(() => { onInitialLoadComplete?.() }, [onInitialLoadComplete])
    return <div aria-label="Calendar">Calendar</div>
  },
}))

vi.mock('../../components/profile/WeightChart.jsx', () => ({
  default: () => <div>Weight chart</div>,
}))

function never() {
  return new Promise(() => {})
}

function homeData(overrides = {}) {
  return {
    version: 10,
    userId: 'user-1',
    prof: {
      full_name: 'LiftLog E2E',
      username: 'liftlog',
      calories_goal: 2200,
      protein_goal: 160,
      carbs_goal: 240,
      fat_goal: 70,
      unit_preference: 'kg',
      bodyweight: 80,
      calories_burned_goal: 400,
      gender: 'male',
      weight_goal_kg: null,
      weight_trend_mode: null,
      weight_trend_rate_kg_per_week: null,
      weight_trend_anchor_date: null,
      weight_trend_anchor_weight_kg: null,
      streak_start_date: null,
      streak_last_workout_at: null,
      ...overrides.prof,
    },
    nutLogs: overrides.nutLogs || [],
    todaySessions: overrides.todaySessions || [],
    weeklyMuscleWorkload: overrides.weeklyMuscleWorkload || {
      groups: [],
      trainedGroupCount: 0,
      week: { label: 'This week' },
    },
    priorWeekMuscleWorkload: overrides.priorWeekMuscleWorkload || {
      groups: [],
      trainedGroupCount: 0,
      week: { label: 'Last week' },
    },
    weightLogs: overrides.weightLogs || [],
    today: '2026-05-16',
  }
}

function renderHome(props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <Home
        userId="user-1"
        splashDone
        introMotionReady
        onInitialReady={vi.fn()}
        {...props}
      />
    </UserProvider>
  )
}

beforeEach(() => {
  clearCache()
  supabaseMock.state.responses.clear()
  supabaseMock.state.defaultResponse = Promise.resolve({ data: [], error: null })
})

describe('Home loading states', () => {
  it('renders a layout skeleton instead of the full-page spinner while initial data is pending', async () => {
    const pending = never()
    supabaseMock.state.responses.set('profiles', pending)
    supabaseMock.state.responses.set('nutrition_logs', pending)
    supabaseMock.state.responses.set('workout_sessions', pending)
    supabaseMock.state.responses.set('body_weight_logs', pending)

    renderHome({ onInitialReady: vi.fn() })

    expect(await screen.findByRole('status', { name: 'Loading Home' })).toBeTruthy()
    expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull()
  })

  it('renders cached Home content immediately while a startup refresh is still pending', async () => {
    const pending = never()
    setCached('home', homeData({
      nutLogs: [{ calories: 500, protein: 30, carbs: 45, fat: 12 }],
    }), 60_000)
    supabaseMock.state.responses.set('profiles', pending)
    supabaseMock.state.responses.set('nutrition_logs', pending)
    supabaseMock.state.responses.set('workout_sessions', pending)
    supabaseMock.state.responses.set('body_weight_logs', pending)

    renderHome({ useStartupSnapshot: true })

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Loading Home' })).toBeNull()
    }, { timeout: 2000 })
    expect(screen.getByText('Nutrition')).toBeTruthy()
    expect(screen.getByText('of 2200 kcal')).toBeTruthy()
  })

  it('shows the existing retry state when the initial load fails without cached data', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    supabaseMock.state.responses.set('profiles', Promise.resolve({
      data: null,
      error: new Error('profile failed'),
    }))

    renderHome()

    expect(await screen.findByText('Failed to load. Check your connection and try again.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()

    consoleError.mockRestore()
  })
})
