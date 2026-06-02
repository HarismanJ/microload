import { describe, expect, it, vi } from 'vitest'

import { getBestEstimatedOrmKgByExercise, recalculateExercisePrs, recalculateExerciseRankStatesFromHistory } from '../../lib/workoutHistory'
import { updateRollingScore } from '../../lib/rollingRanks'
import { expandAnchors, getAnchors, getProgress, getTierIdx } from '../../lib/strengthStandards'

function nextResponse(responses, table) {
  const queue = responses.get(table)
  if (queue?.length) return Promise.resolve(queue.shift())
  return Promise.resolve({ data: null, error: null })
}

function createSupabaseMock(seedResponses = {}) {
  const responses = new Map(Object.entries(seedResponses).map(([table, response]) => [
    table,
    Array.isArray(response) ? [...response] : [response],
  ]))
  const operations = []

  function createQuery(table) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      not: vi.fn(() => query),
      single: vi.fn(() => nextResponse(responses, table)),
      upsert: vi.fn((payload, options) => {
        operations.push({ table, type: 'upsert', payload, options })
        return Promise.resolve({ data: null, error: null })
      }),
      delete: vi.fn(() => {
        operations.push({ table, type: 'delete' })
        return query
      }),
      then: (onFulfilled, onRejected) => nextResponse(responses, table).then(onFulfilled, onRejected),
      catch: onRejected => nextResponse(responses, table).catch(onRejected),
    }
    return query
  }

  return {
    operations,
    from: vi.fn(table => createQuery(table)),
  }
}

function getScore(exercise, ormKg, bodyweightKg, thresholds) {
  const ratio = exercise.equipment === 'Bodyweight'
    ? (ormKg + bodyweightKg) / bodyweightKg
    : ormKg / bodyweightKg
  const tierIdx = getTierIdx(ratio, thresholds)
  const progress = getProgress(ratio, thresholds, tierIdx)
  return tierIdx + Math.min(0.999, progress / 100)
}

describe('workoutHistory PR recalculation', () => {
  it('finds best e1RM per exercise, converts lbs, and ignores dropsets', () => {
    const bests = getBestEstimatedOrmKgByExercise([
      { exercise_id: 'bench', estimated_1rm: 120, unit: 'kg', set_type: 'normal' },
      { exercise_id: 'bench', estimated_1rm: 400, unit: 'kg', set_type: 'dropset' },
      { exercise_id: 'deadlift', estimated_1rm: 315, unit: 'lbs', set_type: 'normal' },
      { exercise_id: 'deadlift', estimated_1rm: null, unit: 'kg', set_type: 'normal' },
    ])

    expect(bests.get('bench')).toBe(120)
    expect(bests.get('deadlift')).toBeCloseTo(315 * 0.453592)
  })

  it('upserts best PRs and deletes stale PRs for exercises without valid sets', async () => {
    const supabase = createSupabaseMock({
      workout_sets: {
        data: [
          { exercise_id: 'bench', estimated_1rm: 120, unit: 'kg', set_type: 'normal' },
          { exercise_id: 'bench', estimated_1rm: 130, unit: 'kg', set_type: 'normal' },
        ],
        error: null,
      },
    })

    const result = await recalculateExercisePrs(supabase, 'user-1', ['bench', 'squat'])

    expect(result.updated).toEqual(['bench'])
    expect(result.deleted).toEqual(['squat'])
    expect(supabase.operations).toContainEqual({
      table: 'exercise_prs',
      type: 'upsert',
      payload: expect.objectContaining({
        user_id: 'user-1',
        exercise_id: 'bench',
        best_1rm_kg: 130,
      }),
      options: { onConflict: 'user_id,exercise_id' },
    })
    expect(supabase.operations).toContainEqual({ table: 'exercise_prs', type: 'delete' })
  })
})

describe('workoutHistory active rank replay', () => {
  it('replays active rank state chronologically from remaining valid workout history', async () => {
    const exercise = { id: 1, name: 'Bench Press', equipment: 'Barbell' }
    const firstAt = '2026-01-01T12:00:00.000Z'
    const secondAt = '2026-01-15T12:00:00.000Z'
    const secondBestKg = 275 * 0.453592
    const supabase = createSupabaseMock({
      profiles: { data: { bodyweight: 100, unit_preference: 'kg', gender: 'male' }, error: null },
      exercises: { data: [exercise], error: null },
      workout_sets: {
        data: [
          { exercise_id: 1, session_id: 's1', estimated_1rm: 100, unit: 'kg', is_warmup: false, set_type: 'normal', workout_sessions: { id: 's1', finished_at: firstAt } },
          { exercise_id: 1, session_id: 's1', estimated_1rm: 400, unit: 'kg', is_warmup: true, set_type: 'warmup', workout_sessions: { id: 's1', finished_at: firstAt } },
          { exercise_id: 1, session_id: 's2', estimated_1rm: 120, unit: 'kg', is_warmup: false, set_type: 'normal', workout_sessions: { id: 's2', finished_at: secondAt } },
          { exercise_id: 1, session_id: 's2', estimated_1rm: 500, unit: 'kg', is_warmup: false, set_type: 'dropset', workout_sessions: { id: 's2', finished_at: secondAt } },
          { exercise_id: 1, session_id: 's2', estimated_1rm: 275, unit: 'lbs', is_warmup: false, set_type: 'normal', workout_sessions: { id: 's2', finished_at: secondAt } },
        ],
        error: null,
      },
    })

    const anchors = await getAnchors()
    const thresholds = expandAnchors(anchors.male['Bench Press'])
    const firstScore = getScore(exercise, 100, 100, thresholds)
    const secondScore = getScore(exercise, secondBestKg, 100, thresholds)
    const expectedCurrent = updateRollingScore({
      priorScore: firstScore,
      priorLastRankedAt: firstAt,
      sessionScore: secondScore,
      now: secondAt,
    })

    const result = await recalculateExerciseRankStatesFromHistory(supabase, 'user-1', [1])

    const upsert = supabase.operations.find(operation => operation.table === 'exercise_rank_states' && operation.type === 'upsert')
    expect(result).toEqual({ updated: [1], deleted: [], missingTable: false })
    expect(upsert.payload).toHaveLength(1)
    expect(upsert.payload[0]).toEqual(expect.objectContaining({
      user_id: 'user-1',
      exercise_id: 1,
      last_ranked_at: secondAt,
    }))
    expect(upsert.payload[0].current_score).toBeCloseTo(expectedCurrent)
    expect(upsert.payload[0].peak_score).toBeCloseTo(Math.max(firstScore, expectedCurrent, secondScore))
  })

  it('deletes active rank state when no valid replay history remains', async () => {
    const supabase = createSupabaseMock({
      profiles: { data: { bodyweight: 100, unit_preference: 'kg', gender: 'male' }, error: null },
      exercises: { data: [{ id: 1, name: 'Bench Press', equipment: 'Barbell' }], error: null },
      workout_sets: { data: [], error: null },
    })

    const result = await recalculateExerciseRankStatesFromHistory(supabase, 'user-1', [1])

    expect(result).toEqual({ updated: [], deleted: [1], missingTable: false })
    expect(supabase.operations).toContainEqual({ table: 'exercise_rank_states', type: 'delete' })
  })

  it('deletes active rank state when bodyweight or strength standards are unavailable', async () => {
    const missingBodyweightSupabase = createSupabaseMock({
      profiles: { data: { bodyweight: null, unit_preference: 'kg', gender: 'male' }, error: null },
      exercises: { data: [{ id: 1, name: 'Bench Press', equipment: 'Barbell' }], error: null },
      workout_sets: { data: [], error: null },
    })
    const unsupportedExerciseSupabase = createSupabaseMock({
      profiles: { data: { bodyweight: 100, unit_preference: 'kg', gender: 'male' }, error: null },
      exercises: { data: [{ id: 2, name: 'Unsupported Curl', equipment: 'Dumbbell' }], error: null },
      workout_sets: {
        data: [
          { exercise_id: 2, session_id: 's1', estimated_1rm: 30, unit: 'kg', is_warmup: false, set_type: 'normal', workout_sessions: { id: 's1', finished_at: '2026-01-01T12:00:00.000Z' } },
        ],
        error: null,
      },
    })

    await expect(recalculateExerciseRankStatesFromHistory(missingBodyweightSupabase, 'user-1', [1]))
      .resolves.toEqual({ updated: [], deleted: [1], missingTable: false })
    await expect(recalculateExerciseRankStatesFromHistory(unsupportedExerciseSupabase, 'user-1', [2]))
      .resolves.toEqual({ updated: [], deleted: [2], missingTable: false })
  })
})
