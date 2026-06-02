import { createClient } from '@supabase/supabase-js'

const USER_DELETES = [
  ['workout_room_events', 'user_id'],
  ['battle_results', 'challenger_id'],
  ['battle_results', 'challenged_id'],
  ['battle_results', 'winner_id'],
  ['battle_invites', 'challenger_id'],
  ['battle_invites', 'challenged_id'],
  ['workout_rooms', 'challenger_id'],
  ['workout_rooms', 'challenged_id'],
  ['battle_head_to_head', 'user_id'],
  ['battle_head_to_head', 'opponent_id'],
  ['rate_limit_events', 'user_id'],
  ['nutrition_logs', 'user_id'],
  ['foods', 'user_id'],
  ['user_training_plan_adaptations', 'user_id'],
  ['user_training_plans', 'user_id'],
  ['user_exercise_preferences', 'user_id'],
  ['exercise_rank_states', 'user_id'],
  ['exercise_prs', 'user_id'],
  ['workout_sets', 'user_id'],
  ['workout_sessions', 'user_id'],
  ['body_weight_logs', 'user_id'],
]

export function createAdminClient(config) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function cleanupLoadData(admin, userIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (!ids.length) return

  for (const chunk of chunked(ids, 50)) {
    for (const [table, column] of USER_DELETES) {
      const { error } = await admin.from(table).delete().in(column, chunk)
      if (error && !isMissingRelation(error)) {
        throw new Error(`${table}.${column}: ${error.message}`)
      }
    }
  }
}

export async function listLoadUsers(admin, config) {
  const users = []
  const prefix = `${config.emailPrefix}+`
  const suffix = `@${config.emailDomain}`

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    for (const user of data.users || []) {
      const email = user.email || ''
      if (email.startsWith(prefix) && email.endsWith(suffix)) users.push(user)
    }
    if (!data.users || data.users.length < 1000) break
  }

  return users
}

export async function upsertLoadProfile(admin, user, index) {
  const { error } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      username: `load_${String(index).padStart(4, '0')}_${user.id.slice(0, 6)}`,
      full_name: `Load User ${index + 1}`,
      gender: index % 2 === 0 ? 'male' : 'female',
      bodyweight: 70 + (index % 20),
      unit_preference: 'kg',
      default_rest_seconds: 60,
      lifetime_volume_kg: 0,
    }, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteLoadUsers(admin, users) {
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
  }
}

function chunked(items, size) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
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
