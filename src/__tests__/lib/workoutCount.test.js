vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../../lib/supabase.js'
import { fetchProfileWithWorkoutCount } from '../../lib/workoutCount.js'

function makeProfileQuery(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

function makeCountQuery(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

function mockSupabase({ profileResults = [], countResult = { count: 0, error: null } } = {}) {
  const profileQueries = []
  const countQueries = []
  let profileIndex = 0

  supabase.from.mockImplementation(table => {
    if (table === 'profiles') {
      const query = makeProfileQuery(profileResults[profileIndex] || { data: null, error: null })
      profileIndex += 1
      profileQueries.push(query)
      return query
    }

    if (table === 'workout_sessions') {
      const query = makeCountQuery(countResult)
      countQueries.push(query)
      return query
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { profileQueries, countQueries }
}

describe('fetchProfileWithWorkoutCount', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('returns profile data directly when workout_count is already available', async () => {
    const { profileQueries } = mockSupabase({
      profileResults: [{
        data: { username: 'ada', workout_count: 5 },
        error: null,
      }],
    })

    const result = await fetchProfileWithWorkoutCount('user-1', ['username'])

    expect(result).toEqual({
      data: { username: 'ada', workout_count: 5 },
      error: null,
      usedFallback: false,
    })
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(profileQueries[0].select).toHaveBeenCalledWith('username, workout_count')
    expect(profileQueries[0].eq).toHaveBeenCalledWith('id', 'user-1')
    expect(profileQueries[0].single).toHaveBeenCalledTimes(1)
  })

  it('normalizes fields and converts string workout counts', async () => {
    const { profileQueries } = mockSupabase({
      profileResults: [{
        data: { username: 'ada', workout_count: '3' },
        error: null,
      }],
    })

    const result = await fetchProfileWithWorkoutCount('user-1', [
      ' username ',
      '',
      null,
      'workout_count',
      'username',
      42,
    ])

    expect(result).toEqual({
      data: { username: 'ada', workout_count: 3 },
      error: null,
      usedFallback: false,
    })
    expect(profileQueries[0].select).toHaveBeenCalledWith('username, workout_count, 42')
  })

  it('falls back to counting finished sessions when the profile count is invalid', async () => {
    const { countQueries } = mockSupabase({
      profileResults: [{
        data: { username: 'ada', workout_count: 'not-a-number' },
        error: null,
      }],
      countResult: { count: 7, error: null },
    })

    const result = await fetchProfileWithWorkoutCount('user-1', 'username')

    expect(result).toEqual({
      data: { username: 'ada', workout_count: 7 },
      error: null,
      usedFallback: true,
    })
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'profiles')
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'workout_sessions')
    expect(countQueries[0].select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(countQueries[0].eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(countQueries[0].not).toHaveBeenCalledWith('finished_at', 'is', null)
  })

  it('normalizes negative session counts to zero during fallback', async () => {
    mockSupabase({
      profileResults: [{
        data: { workout_count: -1 },
        error: null,
      }],
      countResult: { count: -4, error: null },
    })

    const result = await fetchProfileWithWorkoutCount('user-1')

    expect(result).toEqual({
      data: { workout_count: 0 },
      error: null,
      usedFallback: true,
    })
  })

  it('falls back when the workout_count column is missing by error code', async () => {
    const { profileQueries, countQueries } = mockSupabase({
      profileResults: [
        {
          data: null,
          error: { code: 'PGRST204', message: 'column missing' },
        },
        {
          data: { username: 'ada' },
          error: null,
        },
      ],
      countResult: { count: 12, error: null },
    })

    const result = await fetchProfileWithWorkoutCount('user-1', ['username'])

    expect(result).toEqual({
      data: { username: 'ada', workout_count: 12 },
      error: null,
      usedFallback: true,
    })
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'profiles')
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'profiles')
    expect(supabase.from).toHaveBeenNthCalledWith(3, 'workout_sessions')
    expect(profileQueries[0].select).toHaveBeenCalledWith('username, workout_count')
    expect(profileQueries[1].select).toHaveBeenCalledWith('username')
    expect(profileQueries[1].eq).toHaveBeenCalledWith('id', 'user-1')
    expect(countQueries[0].not).toHaveBeenCalledWith('finished_at', 'is', null)
  })

  it('falls back when the missing-column error text references profiles and workout_count', async () => {
    mockSupabase({
      profileResults: [
        {
          data: null,
          error: {
            message: 'Could not find workout_count',
            details: 'profiles table does not expose the column',
          },
        },
        {
          data: { full_name: 'Ada Lovelace' },
          error: null,
        },
      ],
      countResult: { count: 4, error: null },
    })

    const result = await fetchProfileWithWorkoutCount('user-1', ['full_name'])

    expect(result).toEqual({
      data: { full_name: 'Ada Lovelace', workout_count: 4 },
      error: null,
      usedFallback: true,
    })
  })

  it('skips the fallback profile query when no profile fields are requested', async () => {
    const { countQueries } = mockSupabase({
      profileResults: [{
        data: null,
        error: { code: 'PGRST204', message: 'column missing' },
      }],
      countResult: { count: 6, error: null },
    })

    const result = await fetchProfileWithWorkoutCount('user-1')

    expect(result).toEqual({
      data: { workout_count: 6 },
      error: null,
      usedFallback: true,
    })
    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'profiles')
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'workout_sessions')
    expect(countQueries[0].select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
  })

  it('returns non-missing-column profile errors without fallback', async () => {
    const error = { code: '42501', message: 'permission denied' }
    mockSupabase({
      profileResults: [{
        data: { username: 'ada' },
        error,
      }],
    })

    const result = await fetchProfileWithWorkoutCount('user-1', ['username'])

    expect(result).toEqual({
      data: { username: 'ada' },
      error,
      usedFallback: false,
    })
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('returns fallback profile query errors', async () => {
    const fallbackError = { code: '500', message: 'fallback profile failed' }
    mockSupabase({
      profileResults: [
        {
          data: null,
          error: { code: 'PGRST204', message: 'column missing' },
        },
        {
          data: { username: 'partial' },
          error: fallbackError,
        },
      ],
      countResult: { count: 9, error: null },
    })

    const result = await fetchProfileWithWorkoutCount('user-1', ['username'])

    expect(result).toEqual({
      data: { username: 'partial' },
      error: fallbackError,
      usedFallback: true,
    })
  })

  it('returns count query errors with profile data and null workout count', async () => {
    const countError = { message: 'count failed' }
    mockSupabase({
      profileResults: [{
        data: { username: 'ada', workout_count: undefined },
        error: null,
      }],
      countResult: { count: 10, error: countError },
    })

    const result = await fetchProfileWithWorkoutCount('user-1', ['username'])

    expect(result).toEqual({
      data: { username: 'ada', workout_count: null },
      error: countError,
      usedFallback: true,
    })
  })
})
