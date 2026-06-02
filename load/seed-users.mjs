import { createAdminClient, listLoadUsers, upsertLoadProfile } from './lib/admin.mjs'
import { requireLoadConfig, writeUsers } from './lib/env.mjs'

const config = requireLoadConfig({ serviceRole: true })
const admin = createAdminClient(config)

console.log(`Seeding ${config.userCount} load users in ${config.supabaseUrl}`)

const existing = await listLoadUsers(admin, config)
const existingByEmail = new Map(existing.map(user => [user.email, user]))
const users = []

for (let index = 0; index < config.userCount; index += 1) {
  const email = `${config.emailPrefix}+${String(index + 1).padStart(4, '0')}@${config.emailDomain}`
  let user = existingByEmail.get(email)

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: config.password,
      email_confirm: true,
      user_metadata: { full_name: `Load User ${index + 1}` },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password: config.password,
      user_metadata: { ...(user.user_metadata || {}), full_name: `Load User ${index + 1}` },
    })
    if (error) throw error
    user = data.user
  }

  await upsertLoadProfile(admin, user, index)
  users.push({ id: user.id, email, password: config.password })
}

writeUsers(users, config)
console.log(`Seeded ${users.length} users and wrote .load/users.json`)
