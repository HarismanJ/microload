import {
  finishWorkoutSessionAtomic,
  serializeWorkoutPrs,
  serializeWorkoutRankStates,
  serializeWorkoutSets,
} from '../../lib/workoutCompletion.js'

describe('workoutCompletion serialization', () => {
  it('serializes workout sets with only database fields', () => {
    const result = serializeWorkoutSets([{
      user_id: 'user-1',
      session_id: 'session-1',
      exercise_id: 10,
      set_number: 1,
      reps: 5,
      weight: 100,
      unit: 'kg',
      equipment: 'Barbell',
      estimated_1rm: 116.7,
      estimated_fresh_1rm: 126.8,
      duration_seconds: undefined,
      completed_at: '2026-05-24T12:00:00.000Z',
      rest_before_seconds: 90,
      progression_event: undefined,
      is_warmup: undefined,
      set_type: undefined,
      set_group_index: undefined,
    }])

    expect(result).toEqual([{
      exercise_id: 10,
      set_number: 1,
      reps: 5,
      weight: 100,
      unit: 'kg',
      estimated_1rm: 116.7,
      estimated_fresh_1rm: 126.8,
      completed_at: '2026-05-24T12:00:00.000Z',
      rest_before_seconds: 90,
      progression_event: null,
      is_warmup: false,
      set_type: 'normal',
      set_group_index: null,
    }])
    expect(result[0]).not.toHaveProperty('equipment')
    expect(result[0]).not.toHaveProperty('user_id')
    expect(result[0]).not.toHaveProperty('session_id')
  })

  it('serializes PR and rank-state payloads', () => {
    expect(serializeWorkoutPrs([{
      user_id: 'user-1',
      exercise_id: 10,
      best_1rm_kg: 120,
      updated_at: '2026-05-24T12:00:00.000Z',
    }])).toEqual([{
      exercise_id: 10,
      best_1rm_kg: 120,
      updated_at: '2026-05-24T12:00:00.000Z',
    }])

    expect(serializeWorkoutRankStates([{
      exerciseId: 10,
      currentScore: 42,
      peakScore: 45,
      lastRankedAt: '2026-05-24T12:00:00.000Z',
      updatedAt: '2026-05-24T12:00:01.000Z',
    }])).toEqual([{
      exercise_id: 10,
      current_score: 42,
      peak_score: 45,
      last_ranked_at: '2026-05-24T12:00:00.000Z',
      updated_at: '2026-05-24T12:00:01.000Z',
    }])
  })
})

describe('finishWorkoutSessionAtomic', () => {
  it('calls the atomic finish RPC without p_user_id', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    }

    await finishWorkoutSessionAtomic(supabase, {
      sessionId: 'session-1',
      finishedAt: '2026-05-24T12:00:00.000Z',
      exerciseNotes: { 10: 'Felt good' },
      caloriesBurned: 180,
      sourcePlan: { planId: 'plan-1', dayId: 'day-a', week: 2 },
      sessionTrainingVolumeKg: 1234.5,
      sets: [{ exercise_id: 10, set_number: 1, reps: 5, weight: 100, equipment: 'Barbell' }],
      prs: [{ exercise_id: 10, best_1rm_kg: 120, updated_at: '2026-05-24T12:00:00.000Z' }],
      rankStates: [{ exerciseId: 10, currentScore: 42, peakScore: 45, lastRankedAt: 'now', updatedAt: 'later' }],
    })

    expect(supabase.rpc).toHaveBeenCalledWith('finish_workout_session_atomic', {
      p_session_id: 'session-1',
      p_finished_at: '2026-05-24T12:00:00.000Z',
      p_exercise_notes: { 10: 'Felt good' },
      p_calories_burned: 180,
      p_source_plan_id: 'plan-1',
      p_source_plan_day_id: 'day-a',
      p_source_plan_week: 2,
      p_session_training_volume_kg: 1234.5,
      p_sets: expect.any(Array),
      p_prs: expect.any(Array),
      p_rank_states: expect.any(Array),
      p_streak_start_date: null,
      p_streak_last_workout_at: null,
    })
    expect(supabase.rpc.mock.calls[0][1]).not.toHaveProperty('p_user_id')
    expect(supabase.rpc.mock.calls[0][1].p_sets[0]).not.toHaveProperty('equipment')
  })

  it('throws a normal Error when the RPC fails', async () => {
    const supabase = {
      rpc: vi.fn(() => Promise.resolve({ error: { message: 'insert failed' } })),
    }

    await expect(finishWorkoutSessionAtomic(supabase, {
      sessionId: 'session-1',
      finishedAt: '2026-05-24T12:00:00.000Z',
    })).rejects.toThrow('insert failed')
  })
})
