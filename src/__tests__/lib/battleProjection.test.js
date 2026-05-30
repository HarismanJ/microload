import { buildRemoteWorkouts } from '../../lib/battleProjection.js'

const exerciseLibrary = [
  { id: 'bench', name: 'Bench Press', category: 'Strength', equipment: 'Barbell' },
]

function event(event_type, payload, created_at = '2026-05-14T12:00:00.000Z') {
  return {
    user_id: 'friend',
    event_type,
    payload,
    created_at,
  }
}

describe('buildRemoteWorkouts', () => {
  it('preserves drop-set metadata from live battle set_completed events', () => {
    const workouts = buildRemoteWorkouts([
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 1,
        weight: 100,
        reps: 8,
        unit: 'kg',
        setType: 'normal',
        setGroupIndex: 4,
      }),
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 2,
        weight: 75,
        reps: 8,
        unit: 'kg',
        setType: 'dropset',
        setGroupIndex: 4,
      }, '2026-05-14T12:00:01.000Z'),
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 3,
        weight: 100,
        reps: 7,
        unit: 'kg',
      }, '2026-05-14T12:00:02.000Z'),
    ], exerciseLibrary)

    expect(workouts[0].exercises[0].sets).toEqual([
      expect.objectContaining({ weight: 100, reps: 8, setType: 'normal', setGroupIndex: 4 }),
      expect.objectContaining({ weight: 75, reps: 8, setType: 'dropset', setGroupIndex: 4 }),
      expect.objectContaining({ weight: 100, reps: 7, setType: 'normal', setGroupIndex: null }),
    ])
  })

  it('keeps old set_completed events compatible by defaulting to normal sets', () => {
    const workouts = buildRemoteWorkouts([
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 1,
        weight: 100,
        reps: 8,
        unit: 'kg',
      }),
    ], exerciseLibrary)

    expect(workouts[0].exercises[0].sets[0]).toMatchObject({
      setType: 'normal',
      setGroupIndex: null,
      weight: 100,
      reps: 8,
    })
  })

  // ─── exercise_added event arm ───────────────────────────────────────────────

  it('adds exercises from an exercise_added event with parallel id/name/category arrays', () => {
    const workouts = buildRemoteWorkouts([
      event('exercise_added', {
        exerciseIds: ['bench', 'squat'],
        exerciseNames: ['Bench Press', 'Squat'],
        exerciseCategories: ['Strength', 'Strength'],
      }),
    ], exerciseLibrary)

    expect(workouts).toHaveLength(1)
    const ex = workouts[0].exercises
    expect(ex).toHaveLength(2)
    expect(ex[0]).toMatchObject({ id: 'bench', name: 'Bench Press' })
    // 'squat' is not in exerciseLibrary, so name falls back to the event-provided name
    expect(ex[1]).toMatchObject({ id: 'squat', name: 'Squat', category: 'Strength' })
  })

  it('uses Math.max(ids.length, names.length) when arrays are sparse', () => {
    const workouts = buildRemoteWorkouts([
      event('exercise_added', {
        exerciseIds: ['bench', 'squat', 'deadlift'],
        exerciseNames: ['Bench Press'],
        exerciseCategories: [],
      }),
    ], exerciseLibrary)

    // count = max(3, 1) = 3 → three slots; the missing names default to null
    // ensureExercise uses (id ?? name) as the key, so slots with no name still get added by id
    expect(workouts[0].exercises).toHaveLength(3)
    // Slot 0: id='bench', name='Bench Press' (provided)
    expect(workouts[0].exercises[0].id).toBe('bench')
    // Slot 1: id='squat', name=null → meta lookup misses (not in library) → falls back to 'Exercise'
    expect(workouts[0].exercises[1].id).toBe('squat')
    // Slot 2: id='deadlift', name=null → same fallback
    expect(workouts[0].exercises[2].id).toBe('deadlift')
  })

  it('uses the fallback category "Live battle" when categories[i] is missing', () => {
    const workouts = buildRemoteWorkouts([
      event('exercise_added', {
        exerciseIds: ['unknown-exercise-id'],
        exerciseNames: ['Mystery Move'],
        // no exerciseCategories provided
      }),
    ], exerciseLibrary)

    expect(workouts[0].exercises[0].category).toBe('Live battle')
  })

  it('is a no-op when exercise_added arrays are both empty', () => {
    const workouts = buildRemoteWorkouts([
      event('exercise_added', { exerciseIds: [], exerciseNames: [], exerciseCategories: [] }),
    ], exerciseLibrary)

    expect(workouts[0].exercises).toHaveLength(0)
  })

  it('treats undefined exerciseIds / exerciseNames as empty arrays', () => {
    const workouts = buildRemoteWorkouts([
      event('exercise_added', {}),
    ], exerciseLibrary)

    expect(workouts[0].exercises).toHaveLength(0)
  })

  // ─── multi-workout output sort ──────────────────────────────────────────────

  it('places live workouts before finished workouts', () => {
    const events = [
      { user_id: 'user-a', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 100, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
      { user_id: 'user-a', event_type: 'workout_finished', payload: {}, created_at: '2026-05-14T12:01:00.000Z' },
      { user_id: 'user-b', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 80, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
      // user-b stays live (no workout_finished/cancelled)
    ]
    const participants = [
      { user_id: 'user-a', profile: { full_name: 'Alice' } },
      { user_id: 'user-b', profile: { full_name: 'Bob' } },
    ]

    const workouts = buildRemoteWorkouts(events, exerciseLibrary, participants)

    expect(workouts).toHaveLength(2)
    expect(workouts[0].status).toBe('live')
    expect(workouts[0].name).toBe('Bob')
    expect(workouts[1].status).toBe('finished')
    expect(workouts[1].name).toBe('Alice')
  })

  it('falls back to alphabetical sort when statuses are equal', () => {
    const events = [
      { user_id: 'user-z', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 100, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
      { user_id: 'user-m', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 80, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
    ]
    const participants = [
      { user_id: 'user-z', profile: { full_name: 'Zara' } },
      { user_id: 'user-m', profile: { full_name: 'Mia' } },
    ]

    const workouts = buildRemoteWorkouts(events, exerciseLibrary, participants)

    expect(workouts.map(w => w.name)).toEqual(['Mia', 'Zara'])
  })

  it('puts a live workout above finished ones regardless of name order', () => {
    const events = [
      { user_id: 'user-a', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 100, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
      { user_id: 'user-a', event_type: 'workout_finished', payload: {}, created_at: '2026-05-14T12:01:00.000Z' },
      { user_id: 'user-b', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 80, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
      { user_id: 'user-b', event_type: 'workout_finished', payload: {}, created_at: '2026-05-14T12:01:00.000Z' },
      { user_id: 'user-c', event_type: 'set_completed', payload: { exerciseId: 'bench', exerciseName: 'Bench Press', setNumber: 1, weight: 70, reps: 5, unit: 'kg' }, created_at: '2026-05-14T12:00:00.000Z' },
    ]
    const participants = [
      { user_id: 'user-a', profile: { full_name: 'Alice' } },
      { user_id: 'user-b', profile: { full_name: 'Bob' } },
      { user_id: 'user-c', profile: { full_name: 'Mia' } },
    ]

    const workouts = buildRemoteWorkouts(events, exerciseLibrary, participants)

    expect(workouts[0].name).toBe('Mia')          // live first
    expect(workouts[0].status).toBe('live')
    expect(workouts[1].name).toBe('Alice')        // finished alphabetically
    expect(workouts[2].name).toBe('Bob')
  })

  it('removes a remote parent set and its drop sets when removeGroup is published', () => {
    const workouts = buildRemoteWorkouts([
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 1,
        weight: 100,
        reps: 8,
        unit: 'kg',
        setType: 'normal',
        setGroupIndex: 2,
      }),
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 2,
        weight: 75,
        reps: 8,
        unit: 'kg',
        setType: 'dropset',
        setGroupIndex: 2,
      }, '2026-05-14T12:00:01.000Z'),
      event('set_completed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 3,
        weight: 95,
        reps: 8,
        unit: 'kg',
      }, '2026-05-14T12:00:02.000Z'),
      event('set_removed', {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        category: 'Strength',
        setNumber: 1,
        unit: 'kg',
        setType: 'normal',
        setGroupIndex: 2,
        removeGroup: true,
      }, '2026-05-14T12:00:03.000Z'),
    ], exerciseLibrary)

    expect(workouts[0].exercises[0].sets).toEqual([
      expect.objectContaining({ weight: 95, reps: 8, setType: 'normal', setGroupIndex: null }),
    ])
  })
})
