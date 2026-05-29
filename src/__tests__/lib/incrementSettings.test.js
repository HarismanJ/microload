import {
  getCustomIncrementKg,
  getCustomIncrements,
  getCustomStartingWeights,
  setCustomIncrementKg,
  setCustomStartingWeightKg,
} from '../../lib/incrementSettings.js'

const INCREMENTS_KEY = 'liftlog_increments'
const STARTING_WEIGHTS_KEY = 'liftlog_starting_weights'

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

function writeThrowingStorage() {
  return {
    get length() {
      return 0
    },
    clear: vi.fn(),
    getItem: vi.fn(() => '{}'),
    key: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn(() => { throw new Error('quota exceeded') }),
  }
}

describe('incrementSettings', () => {
  it('returns empty increment settings for missing or malformed storage', () => {
    expect(getCustomIncrements()).toEqual({})

    localStorage.setItem(INCREMENTS_KEY, '{not json')

    expect(getCustomIncrements()).toEqual({})
  })

  it('returns only positive numeric custom increments by exercise id', () => {
    localStorage.setItem(INCREMENTS_KEY, JSON.stringify({
      'ex-bench-press': 1.25,
      'ex-dumbbell-curl': 0,
      'ex-leg-press': -5,
      'ex-cable-fly': '2.5',
    }))

    expect(getCustomIncrementKg('ex-bench-press')).toBe(1.25)
    expect(getCustomIncrementKg('ex-dumbbell-curl')).toBeNull()
    expect(getCustomIncrementKg('ex-leg-press')).toBeNull()
    expect(getCustomIncrementKg('ex-cable-fly')).toBeNull()
    expect(getCustomIncrementKg('ex-kettlebell-swing')).toBeNull()
  })

  it('stores and removes custom increments', () => {
    setCustomIncrementKg('ex-bench-press', 2.5)
    setCustomIncrementKg('ex-dumbbell-curl', 5)

    expect(JSON.parse(localStorage.getItem(INCREMENTS_KEY))).toEqual({
      'ex-bench-press': 2.5,
      'ex-dumbbell-curl': 5,
    })

    setCustomIncrementKg('ex-bench-press', null)

    expect(JSON.parse(localStorage.getItem(INCREMENTS_KEY))).toEqual({
      'ex-dumbbell-curl': 5,
    })
  })

  it('reads empty starting weights for missing or malformed storage', () => {
    expect(getCustomStartingWeights()).toEqual({})

    localStorage.setItem(STARTING_WEIGHTS_KEY, '{not json')

    expect(getCustomStartingWeights()).toEqual({})
  })

  it('stores and removes custom starting weights', () => {
    setCustomStartingWeightKg('ex-bench-press', 20)
    setCustomStartingWeightKg('ex-dumbbell-curl', 7.5)

    expect(getCustomStartingWeights()).toEqual({
      'ex-bench-press': 20,
      'ex-dumbbell-curl': 7.5,
    })

    setCustomStartingWeightKg('ex-dumbbell-curl', undefined)

    expect(getCustomStartingWeights()).toEqual({
      'ex-bench-press': 20,
    })
  })

  it('swallows localStorage write errors', () => {
    withStorage(writeThrowingStorage(), () => {
      expect(() => setCustomIncrementKg('ex-bench-press', 2.5)).not.toThrow()
      expect(() => setCustomStartingWeightKg('ex-bench-press', 20)).not.toThrow()
    })
  })
})
