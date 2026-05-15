vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import {
  BATTLE_SCORE_WEIGHTS,
  BATTLE_SCORING_VERSION,
  buildBattleMetrics,
  loadBattleRecap,
  scoreBattleMetrics,
} from '../../lib/battles.js'
import { supabase } from '../../lib/supabase.js'

function makeMetric(id, weight, yourValue, opponentValue) {
  return {
    id,
    label: id,
    weight,
    display: 'score',
    available: yourValue !== null && opponentValue !== null,
    yourValue,
    opponentValue,
  }
}

function makeStats(overrides = {}) {
  return {
    bodyweightKg: 100,
    strengthVolumeKg: 0,
    cardioDurationSeconds: 0,
    cardioMetMinutes: 0,
    durationSeconds: 3600,
    lastEventDurationSeconds: null,
    totalSets: 0,
    totalExercises: 0,
    exerciseStats: new Map(),
    ...overrides,
  }
}

function mockBattleSupabase({ room, events, profiles, exercises = [] }) {
  supabase.from.mockImplementation(table => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => Promise.resolve({ data: events, error: null })),
      single: vi.fn(() => Promise.resolve({ data: room, error: null })),
      in: vi.fn(() => Promise.resolve({
        data: table === 'profiles' ? profiles : exercises,
        error: null,
      })),
    }
    return builder
  })
}

function findMetric(recap, id) {
  return recap.metrics.find(metric => metric.id === id)
}

describe('scoreBattleMetrics', () => {
  it('splits close metric values and returns a 0-100 score', () => {
    const { points, metrics } = scoreBattleMetrics([
      makeMetric('close', 100, 102, 100),
    ])

    expect(points).toEqual({ you: 50, opponent: 50 })
    expect(metrics[0]).toMatchObject({ winner: 'tie', effectiveWeight: 100 })
  })

  it('scores magnitude instead of only metric wins', () => {
    const { points, metrics } = scoreBattleMetrics([
      makeMetric('dominant', 100, 300, 100),
    ])

    expect(points).toEqual({ you: 75, opponent: 25 })
    expect(metrics[0].yourScore).toBeCloseTo(75)
  })

  it('scores zero against positive values instead of treating them as unavailable', () => {
    const { points, metrics } = scoreBattleMetrics([
      makeMetric('zero-vs-work', 100, 0, 50),
    ])

    expect(points).toEqual({ you: 0, opponent: 100 })
    expect(metrics[0]).toMatchObject({ available: true, winner: 'opponent' })
  })

  it('redistributes unavailable metric weight across available metrics', () => {
    const { points, metrics } = scoreBattleMetrics([
      makeMetric('available', 40, 75, 25),
      makeMetric('missing', 60, null, null),
    ])

    expect(points).toEqual({ you: 75, opponent: 25 })
    expect(metrics[0].effectiveWeight).toBe(100)
    expect(metrics[1].effectiveWeight).toBe(0)
  })

  it('returns 50-50 when no metrics are available', () => {
    expect(scoreBattleMetrics([
      makeMetric('missing', 100, null, null),
    ]).points).toEqual({ you: 50, opponent: 50 })
  })
})

describe('buildBattleMetrics', () => {
  it('uses the exact configured strength mode weights', () => {
    const yourStats = makeStats({
      strengthVolumeKg: 10000,
      totalSets: 4,
      totalExercises: 1,
      exerciseStats: new Map([
        ['bench', { id: 'bench', name: 'Bench Press', category: 'Strength', isBodyweight: false, volumeKg: 10000, bestOrmKg: 140 }],
      ]),
    })
    const opponentStats = makeStats({
      strengthVolumeKg: 8000,
      totalSets: 4,
      totalExercises: 1,
      exerciseStats: new Map([
        ['bench', { id: 'bench', name: 'Bench Press', category: 'Strength', isBodyweight: false, volumeKg: 8000, bestOrmKg: 120 }],
      ]),
    })

    const { metrics } = buildBattleMetrics('strength', yourStats, opponentStats)
    expect(Object.fromEntries(metrics.map(metric => [metric.id, metric.weight]))).toEqual(BATTLE_SCORE_WEIGHTS.strength)
  })

  it('uses the exact configured cardio and hybrid mode weights', () => {
    const stats = makeStats({
      cardioDurationSeconds: 1800,
      cardioMetMinutes: 180,
      totalSets: 1,
      totalExercises: 1,
    })

    expect(Object.fromEntries(buildBattleMetrics('cardio', stats, stats).metrics.map(metric => [metric.id, metric.weight]))).toEqual(BATTLE_SCORE_WEIGHTS.cardio)
    expect(Object.fromEntries(buildBattleMetrics('hybrid', stats, stats).metrics.map(metric => [metric.id, metric.weight]))).toEqual(BATTLE_SCORE_WEIGHTS.hybrid)
  })
})

describe('loadBattleRecap', () => {
  beforeEach(() => {
    supabase.from.mockReset()
  })

  it('returns weighted battle scores and non-scoring highlights', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'finished',
        battle_mode: 'strength',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      exercises: [
        { id: 'bench', name: 'Bench Press', category: 'Strength', equipment: 'Barbell' },
      ],
      events: [
        {
          user_id: 'you',
          event_type: 'set_completed',
          payload: { exerciseId: 'bench', exerciseName: 'Bench Press', category: 'Strength', equipment: 'Barbell', setNumber: 1, weight: 100, reps: 10, unit: 'kg' },
        },
        {
          user_id: 'them',
          event_type: 'set_completed',
          payload: { exerciseId: 'bench', exerciseName: 'Bench Press', category: 'Strength', equipment: 'Barbell', setNumber: 1, weight: 70, reps: 10, unit: 'kg' },
        },
        {
          user_id: 'you',
          event_type: 'workout_finished',
          payload: {
            durationSeconds: 1800,
            totalSets: 1,
            totalExercises: 1,
            totalVolume: 1000,
            totalVolumeKg: 1000,
            unit: 'kg',
            highlights: [{ type: 'pr', title: 'Bench Press PR', body: '100 kg estimated 1RM' }],
          },
        },
        {
          user_id: 'them',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1800, totalSets: 1, totalExercises: 1, totalVolume: 700, totalVolumeKg: 700, unit: 'kg' },
        },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.scoringVersion).toBe(BATTLE_SCORING_VERSION)
    expect(recap.scoreTotal).toBe(100)
    expect(recap.points.you).toBeGreaterThan(recap.points.opponent)
    expect(recap.winner).toBe('you')
    expect(recap.metrics.find(metric => metric.id === 'top_set_strength_bw')).toMatchObject({
      available: true,
      weight: 25,
    })
    expect(recap.yourHighlights).toEqual([{ type: 'pr', title: 'Bench Press PR', body: '100 kg estimated 1RM' }])
    expect(recap.opponentHighlights).toEqual([])
  })

  it('keeps stale battles voided even with weighted scoring', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'cancelled',
        battle_mode: 'hybrid',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      events: [
        { user_id: 'you', event_type: 'workout_stale', payload: {} },
        { user_id: 'them', event_type: 'workout_finished', payload: {} },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.status).toBe('cancelled')
    expect(recap.winner).toBeNull()
    expect(recap.verdict).toBe('Battle voided due to inactivity')
    expect(recap.yourHighlights).toEqual([])
  })

  it('awards the battle to you when the opponent leaves', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'cancelled',
        battle_mode: 'strength',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      events: [
        {
          user_id: 'you',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1200, totalSets: 0, totalExercises: 0, unit: 'kg' },
        },
        { user_id: 'them', event_type: 'workout_cancelled', payload: {} },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.status).toBe('cancelled')
    expect(recap.winner).toBe('you')
    expect(recap.verdict).toBe('Your friend left the battle')
  })

  it('awards the battle to the opponent when you leave', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'cancelled',
        battle_mode: 'strength',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      events: [
        { user_id: 'you', event_type: 'workout_cancelled', payload: {} },
        {
          user_id: 'them',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1200, totalSets: 0, totalExercises: 0, unit: 'kg' },
        },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.status).toBe('cancelled')
    expect(recap.winner).toBe('opponent')
    expect(recap.verdict).toBe('You left the battle')
  })

  it('builds a cardio recap with MET-minutes, duration, and density metrics', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'finished',
        battle_mode: 'cardio',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      events: [
        {
          user_id: 'you',
          event_type: 'set_completed',
          payload: { exerciseId: 'run', exerciseName: 'Running', category: 'Cardio', setNumber: 1, durationSeconds: 1200, met: 9 },
        },
        {
          user_id: 'them',
          event_type: 'set_completed',
          payload: { exerciseId: 'walk', exerciseName: 'Walking', category: 'Cardio', setNumber: 1, durationSeconds: 1800, met: 4 },
        },
        {
          user_id: 'you',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1500, totalSets: 1, totalExercises: 1, unit: 'kg' },
        },
        {
          user_id: 'them',
          event_type: 'workout_finished',
          payload: { durationSeconds: 2400, totalSets: 1, totalExercises: 1, unit: 'kg' },
        },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.battleMode).toBe('cardio')
    expect(findMetric(recap, 'cardio_met_minutes')).toMatchObject({
      available: true,
      yourValue: 180,
      opponentValue: 120,
      winner: 'you',
    })
    expect(findMetric(recap, 'cardio_duration')).toMatchObject({
      available: true,
      yourValue: 20,
      opponentValue: 30,
      winner: 'opponent',
    })
    expect(findMetric(recap, 'cardio_density')).toMatchObject({
      available: true,
      yourValue: 9,
      opponentValue: 4,
      winner: 'you',
    })
    expect(findMetric(recap, 'overall_density')).toMatchObject({
      available: true,
      winner: 'you',
    })
    expect(findMetric(recap, 'overall_density').yourValue).toBeCloseTo(7.2)
    expect(findMetric(recap, 'overall_density').opponentValue).toBeCloseTo(3)
    expect(findMetric(recap, 'completion_breadth')).toMatchObject({
      available: true,
      yourValue: 2,
      opponentValue: 2,
      winner: 'tie',
    })
  })

  it('builds a hybrid recap from mixed strength and cardio events', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'finished',
        battle_mode: 'hybrid',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      exercises: [
        { id: 'bench', name: 'Bench Press', category: 'Strength', equipment: 'Barbell' },
      ],
      events: [
        {
          user_id: 'you',
          event_type: 'set_completed',
          payload: { exerciseId: 'bench', exerciseName: 'Bench Press', category: 'Strength', equipment: 'Barbell', setNumber: 1, weight: 100, reps: 5, unit: 'kg' },
        },
        {
          user_id: 'you',
          event_type: 'set_completed',
          payload: { exerciseId: 'bike', exerciseName: 'Cycling', category: 'Cardio', setNumber: 1, durationSeconds: 600, met: 6 },
        },
        {
          user_id: 'them',
          event_type: 'set_completed',
          payload: { exerciseId: 'bench', exerciseName: 'Bench Press', category: 'Strength', equipment: 'Barbell', setNumber: 1, weight: 80, reps: 5, unit: 'kg' },
        },
        {
          user_id: 'them',
          event_type: 'set_completed',
          payload: { exerciseId: 'run', exerciseName: 'Running', category: 'Cardio', setNumber: 1, durationSeconds: 1800, met: 10 },
        },
        {
          user_id: 'you',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1800, totalSets: 2, totalExercises: 2, unit: 'kg' },
        },
        {
          user_id: 'them',
          event_type: 'workout_finished',
          payload: { durationSeconds: 3600, totalSets: 2, totalExercises: 2, unit: 'kg' },
        },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.battleMode).toBe('hybrid')
    expect(recap.metrics.map(metric => metric.id)).toEqual([
      'strength_volume_bw',
      'top_set_strength_bw',
      'cardio_met_minutes',
      'cardio_density',
      'overall_density',
      'completion_breadth',
    ])
    expect(findMetric(recap, 'strength_volume_bw')).toMatchObject({
      category: 'strength',
      available: true,
      winner: 'you',
    })
    expect(findMetric(recap, 'top_set_strength_bw')).toMatchObject({
      category: 'strength',
      available: true,
      winner: 'you',
    })
    expect(findMetric(recap, 'cardio_met_minutes')).toMatchObject({
      category: 'cardio',
      available: true,
      winner: 'opponent',
    })
    expect(findMetric(recap, 'cardio_density')).toMatchObject({
      category: 'cardio',
      available: true,
      winner: 'opponent',
    })
    expect(findMetric(recap, 'overall_density')).toMatchObject({
      category: 'density',
      available: true,
      winner: 'opponent',
    })
  })

  it('returns empty highlight arrays for legacy finished events without highlights', async () => {
    mockBattleSupabase({
      room: {
        id: 'room-1',
        challenger_id: 'you',
        challenged_id: 'them',
        status: 'finished',
        battle_mode: 'strength',
        created_at: '2026-05-14T12:00:00.000Z',
      },
      profiles: [
        { id: 'you', username: 'you', bodyweight: 100, unit_preference: 'kg' },
        { id: 'them', username: 'them', bodyweight: 100, unit_preference: 'kg' },
      ],
      exercises: [
        { id: 'bench', name: 'Bench Press', category: 'Strength', equipment: 'Barbell' },
      ],
      events: [
        {
          user_id: 'you',
          event_type: 'set_completed',
          payload: { exerciseId: 'bench', exerciseName: 'Bench Press', category: 'Strength', equipment: 'Barbell', setNumber: 1, weight: 100, reps: 5, unit: 'kg' },
        },
        {
          user_id: 'them',
          event_type: 'set_completed',
          payload: { exerciseId: 'bench', exerciseName: 'Bench Press', category: 'Strength', equipment: 'Barbell', setNumber: 1, weight: 90, reps: 5, unit: 'kg' },
        },
        {
          user_id: 'you',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1200, totalSets: 1, totalExercises: 1, unit: 'kg' },
        },
        {
          user_id: 'them',
          event_type: 'workout_finished',
          payload: { durationSeconds: 1200, totalSets: 1, totalExercises: 1, unit: 'kg' },
        },
      ],
    })

    const recap = await loadBattleRecap('room-1', 'you')

    expect(recap.status).toBe('finished')
    expect(recap.yourHighlights).toEqual([])
    expect(recap.opponentHighlights).toEqual([])
  })
})
