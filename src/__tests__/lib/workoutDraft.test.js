import {
  SHARED_WORKOUT_DRAFT_MAX_AGE_MS,
  SOLO_WORKOUT_DRAFT_MAX_AGE_MS,
  WORKOUT_DRAFT_VERSION,
  clearStoredWorkoutDraft,
  getWorkoutDraftStorageKey,
  readStoredWorkoutDraft,
  writeStoredWorkoutDraft,
} from '../../lib/workoutDraft.js'

const NOW = new Date('2026-05-14T12:00:00.000Z')

function makeDraft(overrides = {}) {
  return {
    version: WORKOUT_DRAFT_VERSION,
    savedAt: Date.now(),
    startedAt: Date.now(),
    sessionId: 'session-1',
    workoutExercises: [],
    exerciseNotes: {},
    notesOpen: {},
    defaultUnit: 'kg',
    defaultRest: 90,
    ...overrides,
  }
}

describe('workoutDraft storage helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds solo and room-scoped storage keys', () => {
    expect(getWorkoutDraftStorageKey('user-1')).toBe('workoutDraft:user-1')
    expect(getWorkoutDraftStorageKey('user-1', 'room-1')).toBe('battleWorkoutDraft:room-1:user-1')
  })

  it('returns an empty result for missing user or missing draft', () => {
    expect(readStoredWorkoutDraft()).toEqual({ draft: null, expiredSessionId: null })
    expect(readStoredWorkoutDraft('user-1')).toEqual({ draft: null, expiredSessionId: null })
  })

  it('reads a valid sanitized draft from storage', () => {
    const draft = makeDraft({
      defaultRest: 5000,
      workoutExercises: [{
        id: 123,
        name: 'Bench Press',
        category: 'Strength',
        sets: [{ reps: '5', weight: '100', done: 1 }],
      }],
    })
    localStorage.setItem(getWorkoutDraftStorageKey('user-1'), JSON.stringify(draft))

    const result = readStoredWorkoutDraft('user-1')

    expect(result.expiredSessionId).toBeNull()
    expect(result.draft).toMatchObject({
      version: WORKOUT_DRAFT_VERSION,
      sessionId: 'session-1',
      defaultRest: 3600,
      workoutExercises: [{
        id: '123',
        name: 'Bench Press',
        sets: [{ reps: '5', weight: '100', done: true }],
      }],
    })
  })

  it('returns an empty result for malformed JSON without throwing', () => {
    localStorage.setItem(getWorkoutDraftStorageKey('user-1'), '{not json')

    expect(readStoredWorkoutDraft('user-1')).toEqual({ draft: null, expiredSessionId: null })
  })

  it('removes invalid sanitized drafts from storage', () => {
    localStorage.setItem(getWorkoutDraftStorageKey('user-1'), JSON.stringify({
      version: WORKOUT_DRAFT_VERSION - 1,
      workoutExercises: [],
    }))

    expect(readStoredWorkoutDraft('user-1')).toEqual({ draft: null, expiredSessionId: null })
    expect(localStorage.getItem(getWorkoutDraftStorageKey('user-1'))).toBeNull()
  })

  it('removes expired solo drafts and reports their session id', () => {
    localStorage.setItem(getWorkoutDraftStorageKey('user-1'), JSON.stringify(makeDraft({
      savedAt: Date.now() - SOLO_WORKOUT_DRAFT_MAX_AGE_MS - 1,
      sessionId: 'expired-session',
    })))

    expect(readStoredWorkoutDraft('user-1')).toEqual({
      draft: null,
      expiredSessionId: 'expired-session',
    })
    expect(localStorage.getItem(getWorkoutDraftStorageKey('user-1'))).toBeNull()
  })

  it('uses the shared draft expiration window for room-scoped drafts', () => {
    const key = getWorkoutDraftStorageKey('user-1', 'room-1')
    localStorage.setItem(key, JSON.stringify(makeDraft({
      savedAt: Date.now() - SOLO_WORKOUT_DRAFT_MAX_AGE_MS - 1,
      roomId: 'room-1',
    })))

    expect(readStoredWorkoutDraft('user-1', 'room-1').draft).toMatchObject({
      roomId: 'room-1',
    })

    localStorage.setItem(key, JSON.stringify(makeDraft({
      savedAt: Date.now() - SHARED_WORKOUT_DRAFT_MAX_AGE_MS - 1,
      sessionId: 'shared-expired',
      roomId: 'room-1',
    })))

    expect(readStoredWorkoutDraft('user-1', 'room-1')).toEqual({
      draft: null,
      expiredSessionId: 'shared-expired',
    })
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('writes sanitized drafts and skips missing or invalid inputs', () => {
    writeStoredWorkoutDraft(null, makeDraft())
    writeStoredWorkoutDraft('user-1', null)

    expect(localStorage.length).toBe(0)

    writeStoredWorkoutDraft('user-1', makeDraft({
      defaultUnit: 'lbs',
      defaultRest: -10,
    }))

    const stored = JSON.parse(localStorage.getItem(getWorkoutDraftStorageKey('user-1')))
    expect(stored).toMatchObject({
      version: WORKOUT_DRAFT_VERSION,
      defaultUnit: 'lbs',
      defaultRest: 0,
    })

    writeStoredWorkoutDraft('user-2', { version: WORKOUT_DRAFT_VERSION - 1, workoutExercises: [] })

    expect(localStorage.getItem(getWorkoutDraftStorageKey('user-2'))).toBeNull()
  })

  it('round-trips plan progression metadata needed by resumed workouts', () => {
    writeStoredWorkoutDraft('user-1', makeDraft({
      sourcePlanId: 'plan-1',
      sourcePlanDayId: 'day-1',
      sourcePlanWeek: 3,
      sourcePlanDeloadWeek: true,
      workoutExercises: [{
        id: 'bench',
        name: 'Bench Press',
        category: 'Strength',
        planSource: 'training_plan',
        planId: 'plan-1',
        planDayId: 'day-1',
        planWeek: 3,
        planTargetReps: 8,
        planRepRange: '6-10',
        planPeriodizationStyle: 'linear',
        planIntensityTag: 'heavy',
        planProgressionBias: 'load_first',
        planDeloadWeek: true,
        planDeloadReason: 'scheduled',
        sets: [{ reps: '5', weight: '100', done: true, progressionEvent: 'deload' }],
      }],
    }))

    const result = readStoredWorkoutDraft('user-1')

    expect(result.expiredSessionId).toBeNull()
    expect(result.draft).toMatchObject({
      sourcePlanId: 'plan-1',
      sourcePlanDayId: 'day-1',
      sourcePlanWeek: 3,
      sourcePlanDeloadWeek: true,
      workoutExercises: [{
        planPeriodizationStyle: 'linear',
        planIntensityTag: 'heavy',
        planProgressionBias: 'load_first',
        planDeloadWeek: true,
        planDeloadReason: 'scheduled',
        sets: [{ progressionEvent: 'deload' }],
      }],
    })
  })

  it('clears solo and room-scoped drafts', () => {
    const soloKey = getWorkoutDraftStorageKey('user-1')
    const roomKey = getWorkoutDraftStorageKey('user-1', 'room-1')
    localStorage.setItem(soloKey, JSON.stringify(makeDraft()))
    localStorage.setItem(roomKey, JSON.stringify(makeDraft({ roomId: 'room-1' })))

    clearStoredWorkoutDraft('user-1')
    clearStoredWorkoutDraft('user-1', 'room-1')
    clearStoredWorkoutDraft()

    expect(localStorage.getItem(soloKey)).toBeNull()
    expect(localStorage.getItem(roomKey)).toBeNull()
  })
})
