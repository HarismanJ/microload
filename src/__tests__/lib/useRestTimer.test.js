import { renderHook, act } from '@testing-library/react'
import { useRestTimer, createRestTimer, getRemainingRestSeconds } from '../../lib/useRestTimer'

describe('createRestTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
  afterEach(() => { vi.useRealTimers() })

  it('builds a timer object with the correct shape', () => {
    const timer = createRestTimer(30, 'Bench Press')
    expect(timer).toEqual({
      endTime: 30000,
      total: 30,
      exerciseName: 'Bench Press',
      completed: false,
    })
  })
})

describe('getRemainingRestSeconds', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
  afterEach(() => { vi.useRealTimers() })

  it('returns total seconds at start', () => {
    const timer = { endTime: 30000, total: 30, exerciseName: '', completed: false }
    expect(getRemainingRestSeconds(timer)).toBe(30)
  })

  it('returns a ceiled remaining value mid-countdown', () => {
    const timer = { endTime: 30000, total: 30, exerciseName: '', completed: false }
    vi.setSystemTime(15500) // 14.5s left → ceil = 15
    expect(getRemainingRestSeconds(timer)).toBe(15)
  })

  it('returns 0 when time has expired', () => {
    const timer = { endTime: 30000, total: 30, exerciseName: '', completed: false }
    vi.setSystemTime(35000)
    expect(getRemainingRestSeconds(timer)).toBe(0)
  })
})

describe('useRestTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
  afterEach(() => { vi.useRealTimers() })

  it('starts with null restTimer', () => {
    const { result } = renderHook(() => useRestTimer())
    expect(result.current.restTimer).toBeNull()
  })

  it('schedules no timers when restTimer is null', () => {
    renderHook(() => useRestTimer())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('an active timer triggers a re-render after 500ms', () => {
    const { result } = renderHook(() => useRestTimer())

    act(() => {
      result.current.setRestTimer({
        endTime: Date.now() + 10000,
        total: 10,
        exerciseName: 'Squat',
        completed: false,
      })
    })

    const firstRef = result.current.restTimer
    act(() => { vi.advanceTimersByTime(500) })

    // Shallow clone was triggered — a new object with same values
    expect(result.current.restTimer).not.toBeNull()
    expect(result.current.restTimer).not.toBe(firstRef)
    expect(result.current.restTimer.completed).toBe(false)
  })

  it('marks restTimer as completed when endTime is reached', () => {
    const { result } = renderHook(() => useRestTimer())

    act(() => {
      result.current.setRestTimer({
        endTime: Date.now() + 300,
        total: 1,
        exerciseName: 'Squat',
        completed: false,
      })
    })

    // Advance past endTime — Date.now() moves forward with fake timers
    act(() => { vi.advanceTimersByTime(500) })

    expect(result.current.restTimer?.completed).toBe(true)
  })

  it('clears restTimer to null 1200ms after completion', () => {
    const { result } = renderHook(() => useRestTimer())

    act(() => {
      result.current.setRestTimer({
        endTime: Date.now() + 300,
        total: 1,
        exerciseName: 'Squat',
        completed: false,
      })
    })

    act(() => { vi.advanceTimersByTime(500) }) // expires → completed: true
    expect(result.current.restTimer?.completed).toBe(true)

    act(() => { vi.advanceTimersByTime(1200) }) // cleanup fires
    expect(result.current.restTimer).toBeNull()
  })

  it('does not clear a completed timer before 1200ms elapses', () => {
    const { result } = renderHook(() => useRestTimer())

    act(() => {
      result.current.setRestTimer({
        endTime: Date.now() + 300,
        total: 1,
        exerciseName: 'Squat',
        completed: false,
      })
    })

    act(() => { vi.advanceTimersByTime(500) })  // completed
    act(() => { vi.advanceTimersByTime(800) })  // less than 1200ms

    expect(result.current.restTimer?.completed).toBe(true) // still showing
  })
})
