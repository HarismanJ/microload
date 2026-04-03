import { supabase } from '../lib/supabase'

function isMissingExerciseUserColumn(error) {
  const message = error?.message?.toLowerCase?.() || ''
  return message.includes('user_id') && message.includes('exercises')
}

export async function fetchExercises(userId) {
  let query = supabase
    .from('exercises')
    .select('*')
    .order('name')

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`)
  }

  const { data, error } = await query
  if (error) {
    if (!isMissingExerciseUserColumn(error)) throw error

    const fallback = await supabase
      .from('exercises')
      .select('*')
      .order('name')

    if (fallback.error) throw fallback.error
    return fallback.data
  }
  return data
}

export async function createCustomExercise(userId, payload) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: userId,
      ...payload,
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingExerciseUserColumn(error)) {
      const missingPatchError = new Error('Run sql/custom_exercises_patch.sql in Supabase before saving custom exercises.')
      missingPatchError.code = 'missing_custom_exercises_patch'
      throw missingPatchError
    }
    throw error
  }
  return data
}

export async function fetchStandardExercisesByNames(names) {
  const uniqueNames = [...new Set(names || [])]
  if (!uniqueNames.length) return []

  const primary = await supabase
    .from('exercises')
    .select('id, name, category, equipment, user_id')
    .in('name', uniqueNames)
    .order('name')

  if (primary.error) {
    if (!isMissingExerciseUserColumn(primary.error)) throw primary.error

    const fallback = await supabase
      .from('exercises')
      .select('id, name, category, equipment')
      .in('name', uniqueNames)
      .order('name')

    if (fallback.error) throw fallback.error
    return fallback.data ?? []
  }

  const byName = new Map()
  for (const row of primary.data ?? []) {
    if (!byName.has(row.name) || row.user_id === null) {
      byName.set(row.name, row)
    }
  }
  return [...byName.values()]
}

export async function fetchPreviousSets(exerciseId, userId) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*, workout_sessions(started_at)')
    .eq('exercise_id', exerciseId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

export async function fetchORMHistory(exerciseId, userId) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('estimated_1rm, created_at')
    .eq('exercise_id', exerciseId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
