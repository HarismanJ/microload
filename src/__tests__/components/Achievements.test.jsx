vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('../../lib/cache.js', () => ({
  getCached: vi.fn(),
  setCached: vi.fn(),
}))

vi.mock('../../context/UserContext.jsx', () => ({
  useCurrentUserId: vi.fn(() => 'user-1'),
}))

vi.mock('../../lib/workoutCount.js', () => ({
  fetchProfileWithWorkoutCount: vi.fn(),
}))

vi.mock('../../data/achievements.js', () => ({
  CATEGORIES: ['Strength', 'Consistency', 'Nutrition'],
  ACHIEVEMENTS: [
    {
      id: 'bench-100',
      cat: 'Strength',
      tier: 'bronze',
      title: 'Bench Builder',
      desc: 'Bench target',
      match: 'bench',
      kgTarget: 100,
    },
    {
      id: 'session-1',
      cat: 'Consistency',
      tier: 'bronze',
      title: 'First Session',
      desc: 'Complete one workout',
      sessions: 1,
    },
    {
      id: 'nutrition-2',
      cat: 'Nutrition',
      tier: 'bronze',
      title: 'Two Nutrition Days',
      desc: 'Log two nutrition days',
      nutDays: 2,
    },
  ],
}))

vi.mock('../../components/LoadingSpinner.jsx', () => ({
  default: () => <div>Loading achievements</div>,
}))

import { render, screen, waitFor } from '@testing-library/react'

import Achievements from '../../components/Achievements.jsx'
import { getCached, setCached } from '../../lib/cache.js'
import { supabase } from '../../lib/supabase.js'
import { fetchProfileWithWorkoutCount } from '../../lib/workoutCount.js'

let prsRows

function mockExercisePrsQuery() {
  supabase.from.mockImplementation(table => {
    if (table !== 'exercise_prs') throw new Error(`Unexpected table: ${table}`)
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => Promise.resolve({ data: prsRows, error: null })),
    }
    return builder
  })
}

describe('Achievements nutrition day loading', () => {
  beforeEach(() => {
    prsRows = [
      {
        best_1rm_kg: 120,
        exercises: { name: 'Bench Press' },
      },
    ]
    getCached.mockReturnValue(null)
    fetchProfileWithWorkoutCount.mockResolvedValue({
      data: {
        workout_count: 1,
        lifetime_volume_kg: 0,
      },
      error: null,
    })
    supabase.rpc.mockResolvedValue({ data: 2, error: null })
    mockExercisePrsQuery()
  })

  it('uses the distinct nutrition-day RPC when calculating unlocked achievements', async () => {
    render(<Achievements onBack={vi.fn()} />)

    expect(await screen.findByText('3 / 3 unlocked')).toBeTruthy()
    expect(supabase.rpc).toHaveBeenCalledWith('count_distinct_nutrition_days', { p_user_id: 'user-1' })
    expect(setCached).toHaveBeenCalledWith(
      'achievements',
      expect.arrayContaining(['bench-100', 'session-1', 'nutrition-2']),
      10 * 60 * 1000
    )
  })

  it('treats a missing nutrition-day RPC as zero nutrition days instead of an error', async () => {
    prsRows = []
    fetchProfileWithWorkoutCount.mockResolvedValue({
      data: {
        workout_count: 0,
        lifetime_volume_kg: 0,
      },
      error: null,
    })
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Could not find the function count_distinct_nutrition_days' },
    })

    render(<Achievements onBack={vi.fn()} />)

    expect(await screen.findByText('0 / 3 unlocked')).toBeTruthy()
    expect(screen.queryByText(/Could not load achievements/i)).toBeNull()
    await waitFor(() => {
      expect(setCached).toHaveBeenCalledWith('achievements', [], 10 * 60 * 1000)
    })
  })
})
