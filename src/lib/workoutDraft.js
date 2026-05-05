import { sanitizeWorkoutDraft } from './localDraftSanitizers'

export const WORKOUT_DRAFT_VERSION = 1
export const SOLO_WORKOUT_DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000
export const SHARED_WORKOUT_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

export function getWorkoutDraftStorageKey(userId, roomId = null) {
  return roomId
    ? `battleWorkoutDraft:${roomId}:${userId}`
    : `workoutDraft:${userId}`
}

export function readStoredWorkoutDraft(userId, roomId = null) {
  if (!userId || typeof window === 'undefined') return { draft: null, expiredSessionId: null }

  try {
    const raw = window.localStorage.getItem(getWorkoutDraftStorageKey(userId, roomId))
    if (!raw) return { draft: null, expiredSessionId: null }

    const parsed = sanitizeWorkoutDraft(JSON.parse(raw), WORKOUT_DRAFT_VERSION)
    if (!parsed) {
      window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId))
      return { draft: null, expiredSessionId: null }
    }

    const maxAgeMs = roomId ? SHARED_WORKOUT_DRAFT_MAX_AGE_MS : SOLO_WORKOUT_DRAFT_MAX_AGE_MS
    if (parsed.savedAt && Date.now() - parsed.savedAt > maxAgeMs) {
      window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId))
      return { draft: null, expiredSessionId: parsed.sessionId || null }
    }

    return { draft: parsed, expiredSessionId: null }
  } catch {
    return { draft: null, expiredSessionId: null }
  }
}

export function writeStoredWorkoutDraft(userId, draft, roomId = null) {
  if (!userId || !draft || typeof window === 'undefined') return

  try {
    const sanitized = sanitizeWorkoutDraft(draft, WORKOUT_DRAFT_VERSION)
    if (!sanitized) return
    window.localStorage.setItem(getWorkoutDraftStorageKey(userId, roomId), JSON.stringify(sanitized))
  } catch {
    // Ignore storage issues so the workout itself stays usable.
  }
}

export function clearStoredWorkoutDraft(userId, roomId = null) {
  if (!userId || typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getWorkoutDraftStorageKey(userId, roomId))
  } catch {
    // Ignore storage issues so the workout itself stays usable.
  }
}
