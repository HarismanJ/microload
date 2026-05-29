const SET_FIELDS = [
  'exercise_id',
  'set_number',
  'reps',
  'weight',
  'unit',
  'estimated_1rm',
  'estimated_fresh_1rm',
  'duration_seconds',
  'completed_at',
  'rest_before_seconds',
  'progression_event',
  'is_warmup',
  'set_type',
  'set_group_index',
]

function pickDefined(source, fields) {
  const result = {}
  for (const field of fields) {
    if (source[field] !== undefined) result[field] = source[field]
  }
  return result
}

export function serializeWorkoutSets(sets = []) {
  return sets.map(set => ({
    ...pickDefined(set, SET_FIELDS),
    progression_event: set.progression_event ?? null,
    is_warmup: set.is_warmup ?? false,
    set_type: set.set_type ?? 'normal',
    set_group_index: set.set_group_index ?? null,
  }))
}

export function serializeWorkoutPrs(prs = []) {
  return prs.map(pr => ({
    exercise_id: pr.exercise_id,
    best_1rm_kg: pr.best_1rm_kg,
    updated_at: pr.updated_at,
  }))
}

export function serializeWorkoutRankStates(rankStates = []) {
  return rankStates
    .filter(update => update?.exerciseId !== null && update?.exerciseId !== undefined)
    .map(update => ({
      exercise_id: update.exerciseId,
      current_score: update.currentScore,
      peak_score: update.peakScore,
      last_ranked_at: update.lastRankedAt,
      updated_at: update.updatedAt,
    }))
}

export async function finishWorkoutSessionAtomic(supabase, {
  sessionId,
  finishedAt,
  exerciseNotes = {},
  caloriesBurned = null,
  sourcePlan = null,
  sessionTrainingVolumeKg = 0,
  sets = [],
  prs = [],
  rankStates = [],
  streakStartDate = null,
  streakLastWorkoutAt = null,
}) {
  const { error } = await supabase.rpc('finish_workout_session_atomic', {
    p_session_id: sessionId,
    p_finished_at: finishedAt,
    p_exercise_notes: exerciseNotes ?? {},
    p_calories_burned: caloriesBurned,
    p_source_plan_id: sourcePlan?.planId ?? null,
    p_source_plan_day_id: sourcePlan?.dayId ?? null,
    p_source_plan_week: sourcePlan?.week ?? null,
    p_session_training_volume_kg: sessionTrainingVolumeKg,
    p_sets: serializeWorkoutSets(sets),
    p_prs: serializeWorkoutPrs(prs),
    p_rank_states: serializeWorkoutRankStates(rankStates),
    p_streak_start_date: streakStartDate,
    p_streak_last_workout_at: streakLastWorkoutAt,
  })

  if (error) {
    throw new Error(error.message || 'Could not save workout.')
  }
}
