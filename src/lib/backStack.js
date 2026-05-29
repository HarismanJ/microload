let counter = 0
const stack = []
let suppressed = 0

export function push(fn) {
  const id = ++counter
  stack.push({ id, fn })
  window.history.pushState({ microloadBack: id }, '')
  return id
}

export function remove(id) {
  const idx = stack.findIndex(e => e.id === id)
  if (idx !== -1) stack.splice(idx, 1)
}

export function hasHandlers() {
  return stack.length > 0
}

export function suppressBackHandling() {
  suppressed += 1
  let released = false
  return () => {
    if (released) return
    released = true
    suppressed = Math.max(0, suppressed - 1)
  }
}

export function isBackHandlingSuppressed() {
  return suppressed > 0
}

// popstate gives you the state of the entry navigated TO, not the one left.
// The id-match approach doesn't work here — just trust the stack length.
export function onPopState() {
  if (isBackHandlingSuppressed()) {
    const entry = stack[stack.length - 1]
    if (entry) window.history.pushState({ microloadBack: entry.id }, '')
    return
  }
  if (stack.length === 0) return
  const entry = stack.pop()
  entry.fn()
}
