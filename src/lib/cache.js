const store = {}
const STARTUP_SNAPSHOT_PREFIX = 'liftlog:startup-snapshot:'
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000
const DEFAULT_CACHE_BUCKET = 'default'
const MAX_RUNTIME_CACHE_ENTRIES = 120
// Bucket limits are upper bounds, not reservations. Search results are
// intentionally treated as more disposable so they cannot crowd out the
// smaller core app caches under the global cap.
const CACHE_BUCKET_CONFIG = {
  [DEFAULT_CACHE_BUCKET]: {
    evictionPriority: 0,
  },
  search: {
    maxEntries: 30,
    evictionPriority: 1,
  },
}

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getStartupSnapshotStorageKey(key, userId = null) {
  if (userId) return `${STARTUP_SNAPSHOT_PREFIX}${key}:${userId}`
  return `${STARTUP_SNAPSHOT_PREFIX}${key}`
}

function removeStorageKeys(storage, keys = []) {
  keys.forEach(key => {
    if (key) storage.removeItem(key)
  })
}

function getStartupSnapshotStorageKeysForClear(storage, key, userId = null) {
  const keys = new Set([getStartupSnapshotStorageKey(key)])

  if (userId) {
    keys.add(getStartupSnapshotStorageKey(key, userId))
    return [...keys]
  }

  const scopedPrefix = `${getStartupSnapshotStorageKey(key)}:`
  for (let index = 0; index < storage.length; index += 1) {
    const storageKey = storage.key(index)
    if (storageKey?.startsWith(scopedPrefix)) {
      keys.add(storageKey)
    }
  }

  return [...keys]
}

function clearStoredEntry(key, userId = null) {
  const storage = getStorage()
  if (!storage) return
  try {
    removeStorageKeys(storage, getStartupSnapshotStorageKeysForClear(storage, key, userId))
  } catch {
    // Ignore storage failures and keep memory cache behavior intact.
  }
}

function getEntryAccessTime(entry) {
  return Number(entry?.lastAccessed || entry?.ts || 0)
}

function getBucketConfig(bucket = DEFAULT_CACHE_BUCKET) {
  return CACHE_BUCKET_CONFIG[bucket] ?? CACHE_BUCKET_CONFIG[DEFAULT_CACHE_BUCKET]
}

function isExpiredEntry(entry, now = Date.now()) {
  if (!entry) return true
  return now - entry.ts > entry.ttl
}

function sweepExpiredRuntimeEntries(now = Date.now()) {
  Object.entries(store).forEach(([key, entry]) => {
    if (isExpiredEntry(entry, now)) {
      delete store[key]
    }
  })
}

function getEntriesForEviction(bucket = null) {
  return Object.entries(store)
    .filter(([, entry]) => bucket === null || entry.bucket === bucket)
    .sort(([, a], [, b]) => {
      const priorityDiff = getBucketConfig(b.bucket).evictionPriority - getBucketConfig(a.bucket).evictionPriority
      if (bucket === null && priorityDiff !== 0) return priorityDiff
      const accessDiff = getEntryAccessTime(a) - getEntryAccessTime(b)
      if (accessDiff !== 0) return accessDiff
      return a.ts - b.ts
    })
}

function trimBucketEntries(bucket, maxEntries) {
  if (!bucket || !Number.isFinite(maxEntries) || maxEntries < 0) return

  const entries = getEntriesForEviction(bucket)
  const overflow = entries.length - maxEntries
  if (overflow <= 0) return

  entries.slice(0, overflow).forEach(([key]) => {
    delete store[key]
  })
}

function trimGlobalEntries(maxEntries) {
  if (!Number.isFinite(maxEntries) || maxEntries < 0) return

  const entries = getEntriesForEviction()
  const overflow = entries.length - maxEntries
  if (overflow <= 0) return

  entries.slice(0, overflow).forEach(([key]) => {
    delete store[key]
  })
}

function normalizeCacheOptions(options = {}) {
  if (!options || typeof options !== 'object') {
    return { bucket: DEFAULT_CACHE_BUCKET }
  }

  const requestedBucket = typeof options.bucket === 'string' && options.bucket.trim()
    ? options.bucket.trim()
    : DEFAULT_CACHE_BUCKET

  const bucket = Object.prototype.hasOwnProperty.call(CACHE_BUCKET_CONFIG, requestedBucket)
    ? requestedBucket
    : DEFAULT_CACHE_BUCKET

  return { bucket }
}

function pruneRuntimeCache(now = Date.now()) {
  sweepExpiredRuntimeEntries(now)

  Object.entries(CACHE_BUCKET_CONFIG).forEach(([bucket, config]) => {
    if (!Number.isFinite(config.maxEntries)) return
    trimBucketEntries(bucket, config.maxEntries)
  })

  trimGlobalEntries(MAX_RUNTIME_CACHE_ENTRIES)
}

export function getCached(key) {
  const entry = store[key]
  if (!entry) return null
  const now = Date.now()
  if (isExpiredEntry(entry, now)) {
    delete store[key]
    return null
  }
  entry.lastAccessed = now
  return entry.data
}

export function setCached(key, data, ttlMs = DEFAULT_CACHE_TTL_MS, options = {}) {
  const now = Date.now()
  const { bucket } = normalizeCacheOptions(options)

  store[key] = {
    data,
    ts: now,
    ttl: ttlMs,
    lastAccessed: now,
    bucket,
  }

  pruneRuntimeCache(now)
}

export function getStartupSnapshot(key, userId) {
  const storage = getStorage()
  if (!storage || !userId) return null

  try {
    const legacyKey = getStartupSnapshotStorageKey(key)
    if (storage.getItem(legacyKey) !== null) {
      storage.removeItem(legacyKey)
    }

    const raw = storage.getItem(getStartupSnapshotStorageKey(key, userId))
    if (!raw) return null

    const entry = JSON.parse(raw)
    if (!entry?.ts || !entry?.ttl || entry.userId !== userId) {
      clearStoredEntry(key, userId)
      return null
    }

    if (Date.now() - entry.ts > entry.ttl) {
      clearStoredEntry(key, userId)
      return null
    }

    return entry.data ?? null
  } catch {
    clearStoredEntry(key, userId)
    return null
  }
}

export function setStartupSnapshot(key, data, ttlMs = DEFAULT_CACHE_TTL_MS, userId) {
  const storage = getStorage()
  if (!storage || !userId) return

  try {
    storage.setItem(
      getStartupSnapshotStorageKey(key, userId),
      JSON.stringify({ data, ts: Date.now(), ttl: ttlMs, userId })
    )
  } catch {
    // Ignore storage failures and keep runtime cache behavior intact.
  }
}

export function getCalendarMonthCacheKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  return `cal_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function invalidateCache(...keys) {
  keys.forEach(k => {
    delete store[k]
    clearStoredEntry(k)
  })
}

// Non-prefixed localStorage keys that are user-specific and must be cleared on logout.
const USER_LOCAL_KEYS = [
  'hiddenTemplates',
  'battleFeedHidden',
  'ranks:display-mode',
  'restTimerTargets',
]

const ACCOUNT_DELETION_LOCAL_KEYS = [
  ...USER_LOCAL_KEYS,
  'bodyWeightChartUnitOverride',
  'bw_goal_line',
  'bw_trend_line',
  'usdaRequestBucket',
  'microload:pendingRecovery',
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

export function clearAccountDeletionLocalData(userId) {
  Object.keys(store).forEach(key => delete store[key])
  const storage = getStorage()
  if (!storage) return

  try {
    const keysToRemove = new Set(ACCOUNT_DELETION_LOCAL_KEYS)

    if (userId) {
      keysToRemove.add(`workoutDraft:${userId}`)
      keysToRemove.add(`battleDeclinedSeen:${userId}`)
    }

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key) continue
      if (key.startsWith(STARTUP_SNAPSHOT_PREFIX)) keysToRemove.add(key)
      if (userId && key.startsWith('battleWorkoutDraft:') && key.endsWith(`:${userId}`)) {
        keysToRemove.add(key)
      }
    }

    keysToRemove.forEach(key => storage.removeItem(key))
  } catch {
    // Account deletion should continue even if local cleanup is unavailable.
  }
}
