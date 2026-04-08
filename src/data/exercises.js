import { supabase } from '../lib/supabase'
import { getCached, setCached, invalidateCache } from '../lib/cache'
import { STRENGTHLEVEL_EXERCISES } from './strengthLevelCatalog'

const EXERCISES_CACHE_KEY = 'exercises'

// Purge any stale localStorage snapshots from the old fetchExercises implementation
try {
  const prefix = 'liftlog:startup-snapshot:exercises'
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k))
} catch { /* ignore */ }

// Pre-build default exercise objects from catalog (metadata only, no id yet)
const CATALOG_DEFAULTS = STRENGTHLEVEL_EXERCISES.map(ex => ({
  id: undefined,
  name: ex.name,
  category: ex.category,
  equipment: ex.equipment,
  user_id: null,
  primary_muscles: ex.primaryMuscles,
  secondary_muscles: ex.secondaryMuscles,
}))

function isMissingExerciseUserColumn(error) {
  const message = error?.message?.toLowerCase?.() || ''
  return message.includes('user_id') && message.includes('exercises')
}

export function invalidateExercisesCache(userId) {
  invalidateCache(`${EXERCISES_CACHE_KEY}:${userId || 'anon'}`)
}

export async function fetchExercises(userId) {
  const cacheKey = `${EXERCISES_CACHE_KEY}:${userId || 'anon'}`

  const cached = getCached(cacheKey)
  if (cached) return cached

  // Fetch only IDs for default exercises — metadata comes from catalog
  const { data: idRows, error: idError } = await supabase
    .from('exercises')
    .select('id, name')
    .is('user_id', null)

  if (idError) throw idError

  const idByName = new Map((idRows ?? []).map(r => [r.name, r.id]))
  const defaultExercises = CATALOG_DEFAULTS.map(ex => ({ ...ex, id: idByName.get(ex.name) }))

  let result = defaultExercises

  if (userId) {
    const { data: custom, error: customError } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId)

    if (customError) {
      if (!isMissingExerciseUserColumn(customError)) throw customError
    } else if (custom?.length) {
      result = [...defaultExercises, ...custom]
    }
  }

  result.sort((a, b) => a.name.localeCompare(b.name))

  setCached(cacheKey, result)
  return result
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
  invalidateCache(`${EXERCISES_CACHE_KEY}:${userId}`)
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
