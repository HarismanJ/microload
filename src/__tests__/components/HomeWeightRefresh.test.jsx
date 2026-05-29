import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'

import { clearCache, invalidateCache } from '../../lib/cache.js'
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
  supabase: { from: supabaseMock.from },
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
  default: ({ data }) => (
    <div data-testid="weight-chart" data-points={data?.length ?? 0}>
      {(data || []).map(d => (
        <span key={d.id} data-testid={`weight-log-${d.id}`}>{d.weight}</span>
      ))}
    </div>
  ),
}))

function makeProfile() {
  return {
    full_name: 'Test User',
    username: 'testuser',
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
  }
}

function renderHomeWithTick(initialTick = 0, props = {}) {
  return render(
    <UserProvider user={{ id: 'user-1' }}>
      <Home
        userId="user-1"
        splashDone
        introMotionReady
        weightRefreshTick={initialTick}
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

describe('Home weightRefreshTick → re-fetches body_weight_logs', () => {
  it('re-queries body_weight_logs and picks up new entries when weightRefreshTick changes', async () => {
    let bodyWeightCallCount = 0
    supabaseMock.state.responses.set('profiles', () => Promise.resolve({
      data: makeProfile(),
      error: null,
    }))
    supabaseMock.state.responses.set('body_weight_logs', () => {
      bodyWeightCallCount += 1
      if (bodyWeightCallCount === 1) {
        return Promise.resolve({
          data: [
            { id: 'log-1', weight: 80, unit: 'kg', logged_at: '2026-05-20T00:00:00.000Z' },
          ],
          error: null,
        })
      }
      return Promise.resolve({
        data: [
          { id: 'log-1', weight: 80, unit: 'kg', logged_at: '2026-05-20T00:00:00.000Z' },
          { id: 'log-2', weight: 82, unit: 'kg', logged_at: '2026-05-28T00:00:00.000Z' },
        ],
        error: null,
      })
    })

    const { rerender } = renderHomeWithTick(0)

    await waitFor(() => {
      expect(screen.getByTestId('weight-chart').dataset.points).toBe('1')
    })
    expect(bodyWeightCallCount).toBe(1)

    invalidateCache('home')

    rerender(
      <UserProvider user={{ id: 'user-1' }}>
        <Home
          userId="user-1"
          splashDone
          introMotionReady
          weightRefreshTick={1}
          onInitialReady={vi.fn()}
        />
      </UserProvider>
    )

    await waitFor(() => {
      expect(bodyWeightCallCount).toBe(2)
    })
    await waitFor(() => {
      expect(screen.getByTestId('weight-chart').dataset.points).toBe('2')
    })
    expect(screen.getByTestId('weight-log-log-2')).toBeTruthy()
  })

  it('does not re-fetch when weightRefreshTick stays at 0', async () => {
    let bodyWeightCallCount = 0
    supabaseMock.state.responses.set('profiles', () => Promise.resolve({
      data: makeProfile(),
      error: null,
    }))
    supabaseMock.state.responses.set('body_weight_logs', () => {
      bodyWeightCallCount += 1
      return Promise.resolve({ data: [], error: null })
    })

    renderHomeWithTick(0)

    await waitFor(() => {
      expect(bodyWeightCallCount).toBe(1)
    })

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(bodyWeightCallCount).toBe(1)
  })
})
