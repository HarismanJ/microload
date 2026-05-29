import {
  clearAccountDeletionLocalData,
  clearCache,
  getCached,
  getCalendarMonthCacheKey,
  getStartupSnapshot,
  invalidateCache,
  setCached,
  setStartupSnapshot,
} from '../../lib/cache.js'

const NOW = new Date('2026-05-14T12:00:00.000Z')
const SNAPSHOT_PREFIX = 'liftlog:startup-snapshot:'

function setTime(offsetMs = 0) {
  vi.setSystemTime(new Date(NOW.getTime() + offsetMs))
}

function withStorage(storage, fn) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
  const globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  })

  try {
    return fn()
  } finally {
    Object.defineProperty(window, 'localStorage', windowDescriptor)
    Object.defineProperty(globalThis, 'localStorage', globalDescriptor)
  }
}

function throwingStorage() {
  return {
    get length() {
      throw new Error('storage unavailable')
    },
    clear: vi.fn(),
    getItem: vi.fn(() => { throw new Error('storage unavailable') }),
    key: vi.fn(() => { throw new Error('storage unavailable') }),
    removeItem: vi.fn(() => { throw new Error('storage unavailable') }),
    setItem: vi.fn(() => { throw new Error('storage unavailable') }),
  }
}

describe('cache runtime entries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setTime()
    localStorage.clear()
    clearCache()
    localStorage.clear()
  })

  afterEach(() => {
    clearCache()
    localStorage.clear()
    vi.useRealTimers()
  })

  it('returns null for missing keys and returns stored data before expiry', () => {
    expect(getCached('missing')).toBeNull()

    setCached('profile', { name: 'Ada' }, 1000)

    expect(getCached('profile')).toEqual({ name: 'Ada' })
  })

  it('expires runtime entries after their ttl', () => {
    setCached('home', { ready: true }, 1000)

    setTime(1000)
    expect(getCached('home')).toEqual({ ready: true })

    setTime(1001)
    expect(getCached('home')).toBeNull()
    expect(getCached('home')).toBeNull()
  })

  it('falls back to the default bucket for invalid cache options', () => {
    for (let i = 0; i < 35; i += 1) {
      setTime(i)
      setCached(`invalid-${i}`, i, 60_000, { bucket: 'unknown' })
    }

    expect(getCached('invalid-0')).toBe(0)
    expect(getCached('invalid-34')).toBe(34)
  })

  it('caps the search bucket at 30 entries', () => {
    for (let i = 0; i < 35; i += 1) {
      setTime(i)
      setCached(`search-${i}`, i, 60_000, { bucket: 'search' })
    }

    expect(getCached('search-0')).toBeNull()
    expect(getCached('search-4')).toBeNull()
    expect(getCached('search-5')).toBe(5)
    expect(getCached('search-34')).toBe(34)
  })

  it('caps the global runtime cache at 120 entries', () => {
    for (let i = 0; i < 125; i += 1) {
      setTime(i)
      setCached(`entry-${i}`, i, 60_000)
    }

    expect(getCached('entry-0')).toBeNull()
    expect(getCached('entry-4')).toBeNull()
    expect(getCached('entry-5')).toBe(5)
    expect(getCached('entry-124')).toBe(124)
  })

  it('evicts disposable search entries before default entries during global overflow', () => {
    for (let i = 0; i < 100; i += 1) {
      setTime(i)
      setCached(`default-${i}`, i, 60_000)
    }
    for (let i = 0; i < 30; i += 1) {
      setTime(100 + i)
      setCached(`search-${i}`, i, 60_000, { bucket: 'search' })
    }

    expect(getCached('default-0')).toBe(0)
    expect(getCached('default-99')).toBe(99)
    expect(getCached('search-0')).toBeNull()
    expect(getCached('search-9')).toBeNull()
    expect(getCached('search-10')).toBe(10)
    expect(getCached('search-29')).toBe(29)
  })
})

describe('cache startup snapshots', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setTime()
    localStorage.clear()
    clearCache()
    localStorage.clear()
  })

  afterEach(() => {
    clearCache()
    localStorage.clear()
    vi.useRealTimers()
  })

  it('round-trips user-scoped startup snapshots', () => {
    setStartupSnapshot('ranks', { total: 3 }, 10_000, 'user-1')

    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}ranks`)).toBeNull()
    expect(getStartupSnapshot('ranks', 'user-1')).toEqual({ total: 3 })
    expect(getStartupSnapshot('ranks', 'user-2')).toBeNull()
  })

  it('does not write or read startup snapshots without a user id', () => {
    setStartupSnapshot('home', { value: 1 }, 10_000)

    expect(localStorage.length).toBe(0)
    expect(getStartupSnapshot('home')).toBeNull()
  })

  it('clears expired, malformed, and mismatched-user startup snapshots', () => {
    localStorage.setItem(`${SNAPSHOT_PREFIX}expired:user-1`, JSON.stringify({
      data: { old: true },
      ts: Date.now() - 10_001,
      ttl: 10_000,
      userId: 'user-1',
    }))
    localStorage.setItem(`${SNAPSHOT_PREFIX}bad-json:user-1`, '{not json')
    localStorage.setItem(`${SNAPSHOT_PREFIX}wrong-user:user-1`, JSON.stringify({
      data: { wrong: true },
      ts: Date.now(),
      ttl: 10_000,
      userId: 'user-2',
    }))

    expect(getStartupSnapshot('expired', 'user-1')).toBeNull()
    expect(getStartupSnapshot('bad-json', 'user-1')).toBeNull()
    expect(getStartupSnapshot('wrong-user', 'user-1')).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}expired:user-1`)).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}bad-json:user-1`)).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}wrong-user:user-1`)).toBeNull()
  })

  it('removes legacy non-user snapshot keys during scoped lookup', () => {
    localStorage.setItem(`${SNAPSHOT_PREFIX}home`, JSON.stringify({ data: 'legacy' }))
    setStartupSnapshot('home', { scoped: true }, 10_000, 'user-1')

    expect(getStartupSnapshot('home', 'user-1')).toEqual({ scoped: true })
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}home`)).toBeNull()
  })

  it('handles storage failures without throwing', () => {
    withStorage(throwingStorage(), () => {
      expect(() => setStartupSnapshot('home', { ok: true }, 10_000, 'user-1')).not.toThrow()
      expect(getStartupSnapshot('home', 'user-1')).toBeNull()
      expect(() => invalidateCache('home')).not.toThrow()
      expect(() => clearCache()).not.toThrow()
      expect(() => clearAccountDeletionLocalData('user-1')).not.toThrow()
    })
  })
})

describe('cache invalidation and cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setTime()
    localStorage.clear()
    clearCache()
    localStorage.clear()
  })

  afterEach(() => {
    clearCache()
    localStorage.clear()
    vi.useRealTimers()
  })

  it('invalidates runtime entries and all startup snapshots for matching keys', () => {
    setCached('home', { cached: true }, 10_000)
    setStartupSnapshot('home', { user1: true }, 10_000, 'user-1')
    setStartupSnapshot('home', { user2: true }, 10_000, 'user-2')
    setStartupSnapshot('profile', { keep: true }, 10_000, 'user-1')

    invalidateCache('home')

    expect(getCached('home')).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}home:user-1`)).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}home:user-2`)).toBeNull()
    expect(getStartupSnapshot('profile', 'user-1')).toEqual({ keep: true })
  })

  it('clears runtime cache, startup snapshots, and logout-local keys', () => {
    setCached('profile', { cached: true }, 10_000)
    setStartupSnapshot('ranks', { snapshot: true }, 10_000, 'user-1')
    localStorage.setItem('hiddenTemplates', '["template-1"]')
    localStorage.setItem('battleFeedHidden', '["battle-1"]')
    localStorage.setItem('ranks:display-mode', 'compact')
    localStorage.setItem('restTimerTargets', '{}')
    localStorage.setItem('theme', 'navy')

    clearCache()

    expect(getCached('profile')).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}ranks:user-1`)).toBeNull()
    expect(localStorage.getItem('hiddenTemplates')).toBeNull()
    expect(localStorage.getItem('battleFeedHidden')).toBeNull()
    expect(localStorage.getItem('ranks:display-mode')).toBeNull()
    expect(localStorage.getItem('restTimerTargets')).toBeNull()
    expect(localStorage.getItem('theme')).toBe('navy')
  })

  it('clears account-deletion local data for the target user', () => {
    setCached('home', { cached: true }, 10_000)
    setStartupSnapshot('home', { snapshot: true }, 10_000, 'user-1')
    localStorage.setItem('hiddenTemplates', '["template-1"]')
    localStorage.setItem('bodyWeightChartUnitOverride', 'lbs')
    localStorage.setItem('bw_goal_line', '1')
    localStorage.setItem('bw_trend_line', '1')
    localStorage.setItem('usdaRequestBucket', '{}')
    localStorage.setItem('microload:pendingRecovery', '{}')
    localStorage.setItem('workoutDraft:user-1', '{}')
    localStorage.setItem('workoutDraft:user-2', '{}')
    localStorage.setItem('battleDeclinedSeen:user-1', '1')
    localStorage.setItem('battleWorkoutDraft:room-1:user-1', '{}')
    localStorage.setItem('battleWorkoutDraft:room-1:user-2', '{}')
    localStorage.setItem('theme', 'navy')

    clearAccountDeletionLocalData('user-1')

    expect(getCached('home')).toBeNull()
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}home:user-1`)).toBeNull()
    expect(localStorage.getItem('hiddenTemplates')).toBeNull()
    expect(localStorage.getItem('bodyWeightChartUnitOverride')).toBeNull()
    expect(localStorage.getItem('bw_goal_line')).toBeNull()
    expect(localStorage.getItem('bw_trend_line')).toBeNull()
    expect(localStorage.getItem('usdaRequestBucket')).toBeNull()
    expect(localStorage.getItem('microload:pendingRecovery')).toBeNull()
    expect(localStorage.getItem('workoutDraft:user-1')).toBeNull()
    expect(localStorage.getItem('battleDeclinedSeen:user-1')).toBeNull()
    expect(localStorage.getItem('battleWorkoutDraft:room-1:user-1')).toBeNull()
    expect(localStorage.getItem('workoutDraft:user-2')).toBe('{}')
    expect(localStorage.getItem('battleWorkoutDraft:room-1:user-2')).toBe('{}')
    expect(localStorage.getItem('theme')).toBe('navy')
  })
})

describe('cache utility helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setTime()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds calendar month cache keys from dates, strings, and the current date', () => {
    expect(getCalendarMonthCacheKey(new Date('2026-01-15T00:00:00.000Z'))).toBe('cal_2026-01')
    expect(getCalendarMonthCacheKey('2026-12-31T00:00:00.000Z')).toBe('cal_2026-12')
    expect(getCalendarMonthCacheKey()).toBe('cal_2026-05')
  })
})
