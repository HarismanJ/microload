import { supabase } from '../lib/supabase'

const EXERCISE_RANK_STATES_TABLE = 'exercise_rank_states'

function isMissingExerciseRankStatesTable(error) {
  const code = error?.code || ''
  const message = error?.message?.toLowerCase?.() || ''
  return (
    code === '42P01'
    || (message.includes('exercise_rank_states') && message.includes('does not exist'))
  )
}

export async function fetchExerciseRankStates(userId, exerciseIds = null) {
  if (!userId) return { rows: [], missingTable: false }
  if (Array.isArray(exerciseIds) && exerciseIds.length === 0) {
    return { rows: [], missingTable: false }
  }

  let query = supabase
    .from(EXERCISE_RANK_STATES_TABLE)
    .select('exercise_id, current_score, peak_score, last_ranked_at, updated_at')
    .eq('user_id', userId)

  if (Array.isArray(exerciseIds) && exerciseIds.length > 0) {
    query = query.in('exercise_id', exerciseIds)
  }

  const { data, error } = await query
  if (error) {
    if (isMissingExerciseRankStatesTable(error)) {
      return { rows: [], missingTable: true }
    }
    throw error
  }

  return {
    rows: data ?? [],
    missingTable: false,
  }
}

export function mapExerciseRankStates(rows = []) {
  const byExerciseId = new Map()
  for (const row of rows) {
    if (row?.exercise_id === null || row?.exercise_id === undefined) continue
    byExerciseId.set(row.exercise_id, row)
  }
  return byExerciseId
}

export async function upsertExerciseRankStates(userId, updates = []) {
  if (!userId || updates.length === 0) return { missingTable: false }

  const payload = updates
    .filter(update => update?.exerciseId !== null && update?.exerciseId !== undefined)
    .map(update => ({
      user_id: userId,
      exercise_id: update.exerciseId,
      current_score: update.currentScore,
      peak_score: update.peakScore,
      last_ranked_at: update.lastRankedAt,
      updated_at: update.updatedAt || new Date().toISOString(),
    }))

  if (payload.length === 0) return { missingTable: false }

  const { error } = await supabase
    .from(EXERCISE_RANK_STATES_TABLE)
    .upsert(payload, { onConflict: 'user_id,exercise_id' })

  if (error) {
    if (isMissingExerciseRankStatesTable(error)) {
      return { missingTable: true }
    }
    throw error
  }

  return { missingTable: false }
}
