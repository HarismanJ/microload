import { renderHook, act } from '@testing-library/react'
import { useSetSwipe, useTemplateSwipe } from '../../lib/useSwipe'

beforeEach(() => {
  global.requestAnimationFrame = vi.fn(cb => { cb(); return 0 })
  global.cancelAnimationFrame = vi.fn()
  Object.defineProperty(window, 'innerWidth', { value: 400, writable: true, configurable: true })
})

function touch(clientX) {
  return { touches: [{ clientX }] }
}

describe('useSetSwipe', () => {
  it('starts with null swipeState', () => {
    const { result } = renderHook(() => useSetSwipe({ onDelete: vi.fn() }))
    expect(result.current.swipeState).toBeNull()
  })

  it('sets swipeState with dx=0 on touchstart', () => {
    const { result } = renderHook(() => useSetSwipe({ onDelete: vi.fn() }))
    act(() => { result.current.handleTouchStart('ex1', 0, touch(350)) })
    expect(result.current.swipeState).toEqual({ exId: 'ex1', idx: 0, dx: 0 })
  })

  it('calls onDelete when swipe exceeds 70% of screen width', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useSetSwipe({ onDelete }))
    act(() => {
      result.current.handleTouchStart('ex1', 0, touch(350))
      result.current.handleTouchMove('ex1', 0, touch(50)) // dx = -300, 75% of 400
      result.current.handleTouchEnd('ex1', 0)
    })
    expect(onDelete).toHaveBeenCalledWith('ex1', 0)
    expect(result.current.swipeState).toBeNull()
  })

  it('does not call onDelete when swipe is below the 70% threshold', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useSetSwipe({ onDelete }))
    act(() => {
      result.current.handleTouchStart('ex1', 0, touch(350))
      result.current.handleTouchMove('ex1', 0, touch(250)) // dx = -100, 25% of 400
      result.current.handleTouchEnd('ex1', 0)
    })
    expect(onDelete).not.toHaveBeenCalled()
    expect(result.current.swipeState).toBeNull()
  })

  it('resets state on touchcancel without calling onDelete', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useSetSwipe({ onDelete }))
    act(() => {
      result.current.handleTouchStart('ex1', 0, touch(350))
      result.current.handleTouchCancel()
    })
    expect(result.current.swipeState).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('ignores touchmove for a different (exId, idx) pair', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useSetSwipe({ onDelete }))
    act(() => {
      result.current.handleTouchStart('ex1', 0, touch(350))
      result.current.handleTouchMove('ex2', 1, touch(0)) // different pair — ignored
      result.current.handleTouchEnd('ex1', 0)            // dx is still 0
    })
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('does not allow dx to go positive (clamped at 0)', () => {
    const { result } = renderHook(() => useSetSwipe({ onDelete: vi.fn() }))
    act(() => {
      result.current.handleTouchStart('ex1', 0, touch(100))
      result.current.handleTouchMove('ex1', 0, touch(300)) // moving right → clamped to 0
    })
    expect(result.current.swipeState?.dx).toBe(0)
  })
})

describe('useTemplateSwipe', () => {
  it('starts with null templateSwipeState', () => {
    const { result } = renderHook(() => useTemplateSwipe())
    expect(result.current.templateSwipeState).toBeNull()
  })

  it('calls onDelete when swipe exceeds 80% of screen width', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useTemplateSwipe())
    act(() => {
      result.current.handleTouchStart('tpl1', touch(380))
      result.current.handleTouchMove('tpl1', touch(40)) // dx = -340, 85% of 400
      result.current.handleTouchEnd('tpl1', onDelete)
    })
    expect(onDelete).toHaveBeenCalled()
    expect(result.current.templateSwipeState).toBeNull()
  })

  it('does not call onDelete when swipe is below the 80% threshold', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useTemplateSwipe())
    act(() => {
      result.current.handleTouchStart('tpl1', touch(380))
      result.current.handleTouchMove('tpl1', touch(200)) // dx = -180, 45% of 400
      result.current.handleTouchEnd('tpl1', onDelete)
    })
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('resets state on touchcancel', () => {
    const { result } = renderHook(() => useTemplateSwipe())
    act(() => {
      result.current.handleTouchStart('tpl1', touch(380))
      result.current.handleTouchCancel()
    })
    expect(result.current.templateSwipeState).toBeNull()
  })

  it('ignores touchmove for a different id', () => {
    const onDelete = vi.fn()
    const { result } = renderHook(() => useTemplateSwipe())
    act(() => {
      result.current.handleTouchStart('tpl1', touch(380))
      result.current.handleTouchMove('tpl2', touch(0)) // different id — ignored
      result.current.handleTouchEnd('tpl1', onDelete)  // dx still 0
    })
    expect(onDelete).not.toHaveBeenCalled()
  })
})
