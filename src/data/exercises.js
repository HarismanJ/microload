import { supabase } from '../lib/supabase'
import { getCached, setCached, invalidateCache } from '../lib/cache'

const EXERCISES_CACHE_KEY = 'exercises'
const CUSTOM_EXERCISE_SELECT = [
  'id',
  'name',
  'category',
  'equipment',
  'user_id',
  'primary_muscles',
  'secondary_muscles',
  'default_rest_seconds',
].join(', ')

// Cardio exercises — time-based, no strength standards, no muscles
const CARDIO_EXERCISES = [
  { name: 'Running',           equipment: 'Bodyweight' },
  { name: 'Jogging',           equipment: 'Bodyweight' },
  { name: 'Walking',           equipment: 'Bodyweight' },
  { name: 'Hiking',            equipment: 'Bodyweight' },
  { name: 'Trail Running',     equipment: 'Bodyweight' },
  { name: 'Sprinting',         equipment: 'Bodyweight' },
  { name: 'Cycling',           equipment: 'Bodyweight' },
  { name: 'Jump Rope',         equipment: 'Bodyweight' },
  { name: 'Jumping Jacks',     equipment: 'Bodyweight' },
  { name: 'Burpees',           equipment: 'Bodyweight' },
  { name: 'Mountain Climbers', equipment: 'Bodyweight' },
  { name: 'High Knees',        equipment: 'Bodyweight' },
  { name: 'Swimming',          equipment: 'Bodyweight' },
  { name: 'HIIT',              equipment: 'Bodyweight' },
  { name: 'Tabata',            equipment: 'Bodyweight' },
  { name: 'Circuit Training',  equipment: 'Bodyweight' },
  { name: 'Shadow Boxing',     equipment: 'Bodyweight' },
  { name: 'Boxing',            equipment: 'Bodyweight' },
  { name: 'Kickboxing',        equipment: 'Bodyweight' },
  { name: 'Dance Cardio',      equipment: 'Bodyweight' },
  { name: 'Aerobics',          equipment: 'Bodyweight' },
  { name: 'Zumba',             equipment: 'Bodyweight' },
  { name: 'Step Aerobics',     equipment: 'Bodyweight' },
  { name: 'Treadmill',         equipment: 'Machine' },
  { name: 'Stationary Bike',   equipment: 'Machine' },
  { name: 'Spin Bike',         equipment: 'Machine' },
  { name: 'Rowing Machine',    equipment: 'Machine' },
  { name: 'Elliptical',        equipment: 'Machine' },
  { name: 'Stair Climber',     equipment: 'Machine' },
  { name: 'Assault Bike',      equipment: 'Machine' },
  { name: 'Ski Erg',           equipment: 'Machine' },
  { name: 'Versa Climber',     equipment: 'Machine' },
  { name: 'Battle Ropes',      equipment: 'Other' },
]
const CARDIO_NAME_SET = new Set(CARDIO_EXERCISES.map(c => c.name))
const CARDIO_EQUIPMENT_BY_NAME = new Map(CARDIO_EXERCISES.map(c => [c.name, c.equipment]))

// Purge any stale localStorage snapshots from the old fetchExercises implementation
try {
  const prefix = 'liftlog:startup-snapshot:exercises'
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k))
} catch { /* ignore */ }

// Lazily load the catalog the first time fetchExercises runs.
// Promise singleton ensures the import fires once and is shared across concurrent callers.
let catalogDefaultsPromise = null

function loadCatalogDefaults() {
  if (!catalogDefaultsPromise) {
    catalogDefaultsPromise = import('./strengthLevelCatalog').then(({ STRENGTHLEVEL_EXERCISES }) =>
      STRENGTHLEVEL_EXERCISES.map(ex => ({
        id: undefined,
        name: ex.name,
        category: ex.category,
        equipment: ex.equipment,
        user_id: null,
        primary_muscles: ex.primaryMuscles,
        secondary_muscles: ex.secondaryMuscles,
      }))
    )
  }
  return catalogDefaultsPromise
}

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

  // Fetch IDs and catalog defaults in parallel — catalog metadata never changes
  const [catalogDefaults, { data: idRows, error: idError }] = await Promise.all([
    loadCatalogDefaults(),
    supabase.from('exercises').select('id, name').is('user_id', null),
  ])

  if (idError) throw idError

  const idByName = new Map((idRows ?? []).map(r => [r.name, r.id]))
  const defaultExercises = catalogDefaults.map(ex => ({ ...ex, id: idByName.get(ex.name) }))

  // Extract cardio exercises from the same system rows — metadata comes from CARDIO_EXERCISES
  const cardioExercises = (idRows ?? [])
    .filter(r => CARDIO_NAME_SET.has(r.name))
    .map(r => ({
      id: r.id,
      name: r.name,
      category: 'Cardio',
      equipment: CARDIO_EQUIPMENT_BY_NAME.get(r.name) ?? 'Bodyweight',
      user_id: null,
      primary_muscles: [],
      secondary_muscles: [],
    }))

  let result = [...defaultExercises, ...cardioExercises]

  if (userId) {
    const { data: custom, error: customError } = await supabase
      .from('exercises')
      .select(CUSTOM_EXERCISE_SELECT)
      .eq('user_id', userId)

    if (customError) {
      if (!isMissingExerciseUserColumn(customError)) throw customError
    } else if (custom?.length) {
      result = [...defaultExercises, ...cardioExercises, ...custom]
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
    .select(CUSTOM_EXERCISE_SELECT)
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
