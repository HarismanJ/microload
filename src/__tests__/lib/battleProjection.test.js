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
