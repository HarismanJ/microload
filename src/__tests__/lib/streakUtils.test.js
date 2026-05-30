import {
  computeStreak,
  computeNewStreakStartDate,
  recalculateStreakAfterDeletion,
} from '../../lib/streakUtils'

// ─── Mock builders for supabase ────────────────────────────────────────────
// recalculateStreakAfterDeletion takes a supabase client as an argument, so we
// construct fresh mocks per test rather than vi.mock'ing the singleton.

function makeSessionsQuery(result) {
  const b = {}
  b.select = vi.fn(() => b)
  b.eq = vi.fn(() => b)
  b.not = vi.fn(() => b)
  b.order = vi.fn(() => b)
  b.range = vi.fn(() => Promise.resolve(result))
  return b
}

function makeUpdateQuery(result) {
  const b = {}
  b.update = vi.fn(() => b)
  b.eq = vi.fn(() => Promise.resolve(result))
  return b
}

function makeSupabase({ sessionsPages = [], updateResult = { error: null } } = {}) {
  let pageIdx = 0
  const updateBuilders = []
  return {
    from: vi.fn(table => {
      if (table === 'workout_sessions') {
        const page = sessionsPages[pageIdx] ?? { data: [], error: null }
        pageIdx++
        return makeSessionsQuery(page)
      }
      if (table === 'profiles') {
        const b = makeUpdateQuery(updateResult)
        updateBuilders.push(b)
        return b
      }
      throw new Error(`Unexpected table: ${table}`)
    }),
    _updateBuilders: updateBuilders,
  }
}

// ─── computeStreak ─────────────────────────────────────────────────────────

describe('computeStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-30T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 when streakStartDate is null', () => {
    expect(computeStreak(null, '2026-05-30T12:00:00')).toBe(0)
  })

  it('returns 0 when streakLastWorkoutAt is null', () => {
    expect(computeStreak('2026-05-01', null)).toBe(0)
  })

  it('returns 0 when both anchors are null', () => {
    expect(computeStreak(null, null)).toBe(0)
  })

  it('returns 0 when streakStartDate is an empty string', () => {
    expect(computeStreak('', '2026-05-30T12:00:00')).toBe(0)
  })

  it('returns 1 for a same-day start and last workout (today)', () => {
    expect(computeStreak('2026-05-30', '2026-05-30T08:00:00')).toBe(1)
  })

  it('returns positive when the last workout was exactly 3 days ago (boundary alive)', () => {
    // last = 2026-05-27, today = 2026-05-30 → gap = 3 (not > 3) → streak alive
    expect(computeStreak('2026-05-25', '2026-05-27T12:00:00')).toBe(6)
  })

  it('returns 0 when the last workout was 4 days ago (decayed)', () => {
    // last = 2026-05-26, today = 2026-05-30 → gap = 4 (> 3) → 0
    expect(computeStreak('2026-05-25', '2026-05-26T12:00:00')).toBe(0)
  })

  it('returns 0 when the last workout was 30 days ago', () => {
    expect(computeStreak('2026-05-01', '2026-04-30T12:00:00')).toBe(0)
  })

  it('returns 31 for a 30-day-old start with today as the last workout', () => {
    expect(computeStreak('2026-04-30', '2026-05-30T08:00:00')).toBe(31)
  })

  it('returns 1 when start and today are the same day', () => {
    expect(computeStreak('2026-05-30', '2026-05-30T23:59:59')).toBe(1)
  })
})

// ─── computeNewStreakStartDate ─────────────────────────────────────────────

describe('computeNewStreakStartDate', () => {
  it('returns today when there is no prior workout', () => {
    const today = computeNewStreakStartDate(null, null, '2026-05-30T18:00:00')
    expect(today).toBe('2026-05-30')
  })

  it('returns today even if currentStartDate is set when there is no prior workout', () => {
    const today = computeNewStreakStartDate('2026-05-01', null, '2026-05-30T18:00:00')
    expect(today).toBe('2026-05-30')
  })

  it('resets to today when the gap since last workout is greater than 3 days', () => {
    // last = 2026-05-25, finished = 2026-05-30 → gap = 5 → reset
    expect(
      computeNewStreakStartDate('2026-05-01', '2026-05-25T12:00:00', '2026-05-30T12:00:00')
    ).toBe('2026-05-30')
  })

  it('preserves the existing start when the gap is exactly 3 days (alive boundary)', () => {
    // last = 2026-05-27, finished = 2026-05-30 → gap = 3 (not > 3) → preserve
    expect(
      computeNewStreakStartDate('2026-05-01', '2026-05-27T12:00:00', '2026-05-30T12:00:00')
    ).toBe('2026-05-01')
  })

  it('preserves the existing start when the gap is 1 day', () => {
    expect(
      computeNewStreakStartDate('2026-05-01', '2026-05-29T12:00:00', '2026-05-30T12:00:00')
    ).toBe('2026-05-01')
  })

  it('returns today when streak is alive but currentStartDate is null (??-fallback)', () => {
    expect(
      computeNewStreakStartDate(null, '2026-05-29T12:00:00', '2026-05-30T12:00:00')
    ).toBe('2026-05-30')
  })

  it('returns today when streak is alive but currentStartDate is undefined', () => {
    expect(
      computeNewStreakStartDate(undefined, '2026-05-29T12:00:00', '2026-05-30T12:00:00')
    ).toBe('2026-05-30')
  })

  it('keeps the gap calculation integer across calendar-day rollovers (noon-anchored)', () => {
    // The source uses T12:00:00 anchors so any sub-day clock difference still
    // gives an integer gap. Pick two same-tz-day timestamps spanning >24h.
    expect(
      computeNewStreakStartDate('2026-05-01', '2026-05-29T23:59:59', '2026-05-30T00:00:01')
    ).toBe('2026-05-01')
  })
})

// ─── recalculateStreakAfterDeletion ────────────────────────────────────────

describe('recalculateStreakAfterDeletion', () => {
  it('throws when the first sessions fetch errors', async () => {
    const supa = makeSupabase({
      sessionsPages: [{ data: null, error: new Error('db boom') }],
    })
    await expect(recalculateStreakAfterDeletion(supa, 'user-1')).rejects.toThrow('db boom')
    expect(supa.from).toHaveBeenCalledWith('workout_sessions')
  })

  it('clears both streak anchors when no remaining workouts are found', async () => {
    const supa = makeSupabase({
      sessionsPages: [{ data: [], error: null }],
    })

    await recalculateStreakAfterDeletion(supa, 'user-1')

    expect(supa._updateBuilders).toHaveLength(1)
    expect(supa._updateBuilders[0].update).toHaveBeenCalledWith({
      streak_start_date: null,
      streak_last_workout_at: null,
    })
    expect(supa._updateBuilders[0].eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('throws if clearing anchors errors out', async () => {
    const supa = makeSupabase({
      sessionsPages: [{ data: [], error: null }],
      updateResult: { error: new Error('clear failed') },
    })
    await expect(recalculateStreakAfterDeletion(supa, 'user-1')).rejects.toThrow('clear failed')
  })

  it('computes start = oldest unique date and last = newest finished_at for a contiguous window', async () => {
    // 3 contiguous calendar dates, descending order from Supabase
    const supa = makeSupabase({
      sessionsPages: [
        {
          data: [
            { finished_at: '2026-05-30T18:00:00' },
            { finished_at: '2026-05-29T18:00:00' },
            { finished_at: '2026-05-28T18:00:00' },
          ],
          error: null,
        },
      ],
    })

    await recalculateStreakAfterDeletion(supa, 'user-1')

    expect(supa._updateBuilders).toHaveLength(1)
    expect(supa._updateBuilders[0].update).toHaveBeenCalledWith({
      streak_start_date: '2026-05-28',
      streak_last_workout_at: '2026-05-30T18:00:00',
    })
  })

  it('stops at a gap > 3 days inside the data and uses only the newest streak window', async () => {
    const supa = makeSupabase({
      sessionsPages: [
        {
          data: [
            { finished_at: '2026-05-30T18:00:00' },
            { finished_at: '2026-05-29T18:00:00' },
            // gap of 5 days here → stop
            { finished_at: '2026-05-24T18:00:00' },
            { finished_at: '2026-05-23T18:00:00' },
          ],
          error: null,
        },
      ],
    })

    await recalculateStreakAfterDeletion(supa, 'user-1')

    expect(supa._updateBuilders[0].update).toHaveBeenCalledWith({
      streak_start_date: '2026-05-29',
      streak_last_workout_at: '2026-05-30T18:00:00',
    })
  })

  it('deduplicates same-calendar-day sessions in the streakDates Set', async () => {
    const supa = makeSupabase({
      sessionsPages: [
        {
          data: [
            { finished_at: '2026-05-30T22:00:00' }, // newest stamp
            { finished_at: '2026-05-30T09:00:00' }, // same day, ignored for date set
            { finished_at: '2026-05-29T18:00:00' },
          ],
          error: null,
        },
      ],
    })

    await recalculateStreakAfterDeletion(supa, 'user-1')

    expect(supa._updateBuilders[0].update).toHaveBeenCalledWith({
      streak_start_date: '2026-05-29',
      streak_last_workout_at: '2026-05-30T22:00:00',
    })
  })

  it('paginates a full first page and continues into the second page', async () => {
    const PAGE_SIZE = 1000
    const fullPage = Array.from({ length: PAGE_SIZE }, (_, i) => {
      const day = String(30 - (i % 30)).padStart(2, '0')
      return { finished_at: `2026-05-${day}T18:00:00` }
    })
    const supa = makeSupabase({
      sessionsPages: [
        { data: fullPage, error: null },
        // gap > 3 days here would have stopped earlier; provide a clean continuation
        { data: [{ finished_at: '2026-04-29T18:00:00' }], error: null },
      ],
    })

    await recalculateStreakAfterDeletion(supa, 'user-1')

    // The second fetch should have been requested
    expect(supa.from).toHaveBeenCalledWith('workout_sessions')
    // workout_sessions fetched twice + one profiles update
    const sessionsCalls = supa.from.mock.calls.filter(c => c[0] === 'workout_sessions').length
    expect(sessionsCalls).toBeGreaterThanOrEqual(2)
    expect(supa._updateBuilders).toHaveLength(1)
  })

  it('breaks out of pagination when a page has fewer than PAGE_SIZE rows', async () => {
    const supa = makeSupabase({
      sessionsPages: [
        {
          data: [
            { finished_at: '2026-05-30T12:00:00' },
            { finished_at: '2026-05-29T12:00:00' },
          ],
          error: null,
        },
      ],
    })

    await recalculateStreakAfterDeletion(supa, 'user-1')

    // Only one workout_sessions fetch was made because the page was partial
    const sessionsCalls = supa.from.mock.calls.filter(c => c[0] === 'workout_sessions').length
    expect(sessionsCalls).toBe(1)
  })

  it('rethrows when the final profiles update fails', async () => {
    const supa = makeSupabase({
      sessionsPages: [
        {
          data: [{ finished_at: '2026-05-30T12:00:00' }],
          error: null,
        },
      ],
      updateResult: { error: new Error('update failed') },
    })
    await expect(recalculateStreakAfterDeletion(supa, 'user-1')).rejects.toThrow('update failed')
  })
})
