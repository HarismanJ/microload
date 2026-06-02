import { cleanupLoadData, createAdminClient, deleteLoadUsers, listLoadUsers } from './lib/admin.mjs'
import { readUsers, requireLoadConfig } from './lib/env.mjs'

const config = requireLoadConfig({ serviceRole: true })
const admin = createAdminClient(config)

let users
try {
  users = readUsers()
} catch {
  users = await listLoadUsers(admin, config)
}

const userIds = users.map(user => user.id)
console.log(`Cleaning load-test data for ${userIds.length} users`)
await cleanupLoadData(admin, userIds)

if (process.env.LOAD_TEST_DELETE_USERS === '1') {
  console.log('Deleting seeded load-test auth users')
  await deleteLoadUsers(admin, users)
} else {
  console.log('Kept auth users. Set LOAD_TEST_DELETE_USERS=1 to remove them too.')
}
