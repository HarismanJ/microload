import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENV = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
]

const CLEANUP_TABLES = [
  ['nutrition_logs', 'user_id'],
  ['foods', 'user_id'],
  ['user_training_plan_adaptations', 'user_id'],
  ['exercise_rank_states', 'user_id'],
  ['exercise_prs', 'user_id'],
  ['workout_sets', 'user_id'],
  ['workout_sessions', 'user_id'],
  ['body_weight_logs', 'user_id'],
]

export function getMissingE2EEnv() {
  const missing = REQUIRED_ENV.filter(key => !process.env[key])
  if (!getServiceRoleKey()) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

export async function ensureE2EUser() {
  const env = getE2EEnv()
  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let user = await findAuthUserByEmail(admin, env.email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: env.email,
      password: env.password,
      email_confirm: true,
      user_metadata: { full_name: 'LiftLog E2E' },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password: env.password,
      user_metadata: { ...(user.user_metadata || {}), full_name: 'LiftLog E2E' },
    })
    if (error) throw error
    user = data.user
  }

  await upsertFixtureProfile(admin, user.id)
  return { admin, user, credentials: env }
}

export async function resetE2EData(admin, userId) {
  for (const [table, column] of CLEANUP_TABLES) {
    await ignoreMissingRelation(
      admin.from(table).delete().eq(column, userId),
      table
    )
  }

  await upsertFixtureProfile(admin, userId)
}

export async function loadLatestSavedWorkout(admin, userId) {
  const { data: session, error: sessionError } = await admin
    .from('workout_sessions')
    .select('id, finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) return { session: null, sets: [] }

  const { data: sets, error: setsError } = await admin
    .from('workout_sets')
    .select('id, session_id, set_number, reps, weight, unit, set_type, set_group_index')
    .eq('session_id', session.id)
    .order('set_number')

  if (setsError) throw setsError
  return { session, sets: sets || [] }
}

export async function loadProfile(admin, userId) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, username, full_name, gender, bodyweight, unit_preference, default_rest_seconds, lifetime_volume_kg')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function loadWorkoutSessionCounts(admin, userId) {
  const { data, error } = await admin
    .from('workout_sessions')
    .select('id, finished_at')
    .eq('user_id', userId)

  if (error) throw error
  const rows = data || []
  return {
    total: rows.length,
    finished: rows.filter(row => row.finished_at).length,
    open: rows.filter(row => !row.finished_at).length,
  }
}

export async function loadNutritionLogs(admin, userId) {
  const { data, error } = await admin
    .from('nutrition_logs')
    .select('id, food_name, calories, protein, carbs, fat')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

function getE2EEnv() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: getServiceRoleKey(),
    email: process.env.E2E_USER_EMAIL,
    password: process.env.E2E_USER_PASSWORD,
  }
}

function getServiceRoleKey() {
  return process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
}

async function findAuthUserByEmail(admin, email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find(candidate => candidate.email?.toLowerCase() === target)
    if (user) return user
    if (data.users.length < 1000) return null
  }
  return null
}

async function upsertFixtureProfile(admin, userId) {
  const { error } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      username: `e2e_${userId.slice(0, 8)}`,
      full_name: 'LiftLog E2E',
      gender: 'male',
      bodyweight: 80,
      unit_preference: 'kg',
      default_rest_seconds: 5,
      lifetime_volume_kg: 0,
    }, { onConflict: 'id' })

  if (error) throw error
}

async function ignoreMissingRelation(query, label) {
  const { error } = await query
  if (error && !isMissingRelation(error)) {
    throw new Error(`${label}: ${error.message}`)
  }
}

function isMissingRelation(error) {
  const message = error?.message?.toLowerCase?.() || ''
  const details = error?.details?.toLowerCase?.() || ''
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || message.includes('does not exist')
    || details.includes('does not exist')
    || message.includes('schema cache')
}
