const store = {}
const STARTUP_SNAPSHOT_PREFIX = 'liftlog:startup-snapshot:'

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getStartupSnapshotStorageKey(key) {
  return `${STARTUP_SNAPSHOT_PREFIX}${key}`
}

function clearStoredEntry(key) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(getStartupSnapshotStorageKey(key))
  } catch {
    // Ignore storage failures and keep memory cache behavior intact.
  }
}

export function getCached(key) {
  const entry = store[key]
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) {
    delete store[key]
    return null
  }
  return entry.data
}

export function setCached(key, data, ttlMs = 30 * 60 * 1000) {
  store[key] = { data, ts: Date.now(), ttl: ttlMs }
}

export function getStartupSnapshot(key) {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(getStartupSnapshotStorageKey(key))
    if (!raw) return null

    const entry = JSON.parse(raw)
    if (!entry?.ts || !entry?.ttl) {
      clearStoredEntry(key)
      return null
    }

    if (Date.now() - entry.ts > entry.ttl) {
      clearStoredEntry(key)
      return null
    }

    return entry.data ?? null
  } catch {
    clearStoredEntry(key)
    return null
  }
}

export function setStartupSnapshot(key, data, ttlMs = 30 * 60 * 1000) {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(
      getStartupSnapshotStorageKey(key),
      JSON.stringify({ data, ts: Date.now(), ttl: ttlMs })
    )
  } catch {
    // Ignore storage failures and keep runtime cache behavior intact.
  }
}

export function invalidateCache(...keys) {
  keys.forEach(k => {
    delete store[k]
    clearStoredEntry(k)
  })
}

// Non-prefixed localStorage keys that are user-specific and must be cleared on logout.
const USER_LOCAL_KEYS = [
  'theme',
  'hiddenTemplates',
  'battleFeedHidden',
  'ranks:display-mode',
  'restTimerTargets',
]

export function clearCache() {
  Object.keys(store).forEach(key => delete store[key])
  const storage = getStorage()
  if (!storage) return

  try {
    const keysToRemove = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(STARTUP_SNAPSHOT_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => storage.removeItem(key))
    USER_LOCAL_KEYS.forEach(key => storage.removeItem(key))
  } catch {
    // Ignore storage cleanup failures.
  }
}
