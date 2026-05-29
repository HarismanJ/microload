import {
  isBackHandlingSuppressed,
  onPopState,
  push,
  remove,
  suppressBackHandling,
} from '../../lib/backStack.js'

describe('backStack suppression', () => {
  it('ignores popstate handlers while native flows temporarily suppress back handling', () => {
    const handler = vi.fn()
    const id = push(handler)
    const release = suppressBackHandling()

    expect(isBackHandlingSuppressed()).toBe(true)
    onPopState()
    expect(handler).not.toHaveBeenCalled()

    release()
    expect(isBackHandlingSuppressed()).toBe(false)
    onPopState()
    expect(handler).toHaveBeenCalledTimes(1)

    remove(id)
  })
})
